package com.lunero.flowsheet;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.projection.ProjectionService;
import com.lunero.recurring.RecurringEntryEntity;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.recurring.RecurringEntryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class FlowSheetService {

    private final FlowSheetRepository flowSheetRepository;
    private final EntryRepository entryRepository;
    private final RecurringEntryRepository recurringEntryRepository;
    private final RecurringEntryService recurringEntryService;
    private final AuditLogService auditLogService;
    private final ProjectionService projectionService;

    public FlowSheetService(FlowSheetRepository flowSheetRepository,
                            EntryRepository entryRepository,
                            RecurringEntryRepository recurringEntryRepository,
                            @Lazy RecurringEntryService recurringEntryService,
                            AuditLogService auditLogService,
                            @Lazy ProjectionService projectionService) {
        this.flowSheetRepository = flowSheetRepository;
        this.entryRepository = entryRepository;
        this.recurringEntryRepository = recurringEntryRepository;
        this.recurringEntryService = recurringEntryService;
        this.auditLogService = auditLogService;
        this.projectionService = projectionService;
    }

    /**
     * Creates a new active FlowSheet for the user.
     * Validates no overlapping active sheets (Property 2).
     * For custom period type, both startDate and endDate are required (Req 1.7).
     */
    @Transactional
    public FlowSheetEntity createFlowSheet(UUID userId, CreateFlowSheetRequest dto) {
        LocalDate start = resolveStartDate(dto);
        LocalDate end   = resolveEndDate(dto, start);

        if (end.isBefore(start) || end.isEqual(start)) {
            throw new ValidationException("endDate must be after startDate");
        }

        boolean overlaps = flowSheetRepository.existsOverlappingActiveSheet(
                userId, start, end, UUID.fromString("00000000-0000-0000-0000-000000000000"));
        if (overlaps) {
            throw new ValidationException(
                    "An active FlowSheet already exists for this date range. " +
                    "Overlapping active FlowSheets are not allowed.");
        }

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .userId(userId)
                .periodType(dto.periodType())
                .startDate(start)
                .endDate(end)
                .status("active")
                .editLocked(false)
                .build();

        FlowSheetEntity saved = flowSheetRepository.save(sheet);
        auditLogService.log(userId.toString(), "flowsheet", saved.getId().toString(), AuditAction.CREATE);

        // Pre-populate with active recurring entries (Req 4.2)
        List<RecurringEntryEntity> recurring = recurringEntryService.getForPeriod(userId, start, end);
        List<EntryEntity> toInsert = buildRecurringEntries(recurring, saved, start);
        if (!toInsert.isEmpty()) {
            entryRepository.saveAll(toInsert);
        }

        log.info("Created FlowSheet id={} for userId={} period=[{}, {}] with {} recurring entries",
                saved.getId(), userId, start, end, toInsert.size());
        return saved;
    }

    /**
     * Returns the single active FlowSheet for the user with computed balances.
     */
    @Transactional(readOnly = true)
    public FlowSheetResponse getActiveFlowSheet(UUID userId) {
        FlowSheetEntity sheet = flowSheetRepository.findByUserIdAndStatus(userId, "active")
                .orElseThrow(() -> new EntityNotFoundException("No active FlowSheet found for user"));
        List<EntryEntity> entries = entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheet.getId());
        return FlowSheetResponse.from(sheet, entries);
    }

    /**
     * Returns all FlowSheets for the user, most recent first (Req 1.6).
     */
    @Transactional(readOnly = true)
    public Page<FlowSheetResponse> getAllFlowSheets(UUID userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "endDate"));
        return flowSheetRepository.findAllByUserIdOrderByEndDateDesc(userId, pageable)
                .map(FlowSheetResponse::from);
    }

    /**
     * Returns a specific FlowSheet by ID with computed balances.
     */
    @Transactional(readOnly = true)
    public FlowSheetResponse getFlowSheetById(UUID userId, UUID sheetId) {
        FlowSheetEntity sheet = getOwnedSheet(userId, sheetId);
        List<EntryEntity> entries = entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId);
        return FlowSheetResponse.from(sheet, entries);
    }

    /**
     * Unlocks a past (archived) FlowSheet for editing (Req 1.5).
     * Only archived sheets can be unlocked; active sheets are always editable.
     */
    @Transactional
    public FlowSheetEntity unlockPastSheet(UUID userId, UUID sheetId) {
        FlowSheetEntity sheet = getOwnedSheet(userId, sheetId);

        if ("active".equals(sheet.getStatus())) {
            throw new BusinessRuleException("Active FlowSheets are already editable and cannot be unlocked.");
        }

        sheet.setEditLocked(false);
        FlowSheetEntity saved = flowSheetRepository.save(sheet);
        auditLogService.log(userId.toString(), "flowsheet", sheetId.toString(), AuditAction.UPDATE);
        log.info("Unlocked past FlowSheet id={} for userId={}", sheetId, userId);
        return saved;
    }

    /**
     * Computes the available balance for a FlowSheet from its entries (task 7.3).
     * Uses convertedAmount when present, falls back to amount.
     */
    public BigDecimal computeAvailableBalance(List<EntryEntity> entries) {
        BigDecimal income   = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal savings  = BigDecimal.ZERO;

        for (EntryEntity e : entries) {
            if (e.isDeleted()) continue;
            BigDecimal amount = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
            switch (e.getEntryType()) {
                case "income"  -> income   = income.add(amount);
                case "expense" -> expenses = expenses.add(amount);
                case "savings" -> savings  = savings.add(amount);
            }
        }

        return income.subtract(expenses.add(savings));
    }

    /**
     * Archives all expired active FlowSheets and creates the next period for each,
     * pre-populating it with the user's active recurring entries (Req 1.3, 4.2).
     * Called by {@link FlowSheetArchiveJob} daily at midnight UTC.
     *
     * @return number of sheets archived
     */
    @Transactional
    public int archiveExpiredSheets() {
        List<FlowSheetEntity> expired = flowSheetRepository.findExpiredActiveSheets(LocalDate.now());
        if (expired.isEmpty()) return 0;

        for (FlowSheetEntity sheet : expired) {
            // 1. Archive the expired sheet
            sheet.setStatus("archived");
            sheet.setEditLocked(true);
            flowSheetRepository.save(sheet);
            auditLogService.log(sheet.getUserId().toString(), "flowsheet",
                    sheet.getId().toString(), AuditAction.UPDATE);

            // 2. Compute next period dates
            LocalDate nextStart = sheet.getEndDate().plusDays(1);
            LocalDate nextEnd   = computeNextEndDate(sheet.getPeriodType(), nextStart, sheet);

            // 3. Check no overlap before creating (defensive — DB constraint is the final guard)
            boolean overlaps = flowSheetRepository.existsOverlappingActiveSheet(
                    sheet.getUserId(), nextStart, nextEnd,
                    UUID.fromString("00000000-0000-0000-0000-000000000000"));
            if (overlaps) {
                log.warn("Skipping next-period creation for userId={}: overlap detected [{}, {}]",
                        sheet.getUserId(), nextStart, nextEnd);
                continue;
            }

            // 4. Create next period
            FlowSheetEntity next = FlowSheetEntity.builder()
                    .userId(sheet.getUserId())
                    .periodType(sheet.getPeriodType())
                    .startDate(nextStart)
                    .endDate(nextEnd)
                    .status("active")
                    .editLocked(false)
                    .build();
            FlowSheetEntity savedNext = flowSheetRepository.save(next);
            auditLogService.log(sheet.getUserId().toString(), "flowsheet",
                    savedNext.getId().toString(), AuditAction.CREATE);

            // 5. Pre-populate with active recurring entries
            List<RecurringEntryEntity> recurring =
                    recurringEntryService.getForPeriod(sheet.getUserId(), nextStart, nextEnd);
            List<EntryEntity> toInsert = buildRecurringEntries(recurring, savedNext, nextStart);
            if (!toInsert.isEmpty()) {
                entryRepository.saveAll(toInsert);
            }

            // 6. Carry over projections from archived sheet to new sheet (Req 22.2)
            projectionService.carryOverProjections(sheet.getUserId(), sheet.getId(), savedNext.getId());

            log.info("Archived FlowSheet id={}, created next id={} [{}, {}] with {} recurring entries",
                    sheet.getId(), savedNext.getId(), nextStart, nextEnd, toInsert.size());
        }

        return expired.size();
    }

    // --- helpers ---

    FlowSheetEntity getOwnedSheet(UUID userId, UUID sheetId) {
        return flowSheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new EntityNotFoundException("FlowSheet", sheetId));
    }

    private LocalDate resolveStartDate(CreateFlowSheetRequest dto) {
        if (dto.startDate() != null) return dto.startDate();
        return LocalDate.now();
    }

    private LocalDate resolveEndDate(CreateFlowSheetRequest dto, LocalDate start) {
        if ("custom".equals(dto.periodType())) {
            if (dto.endDate() == null) {
                throw new BusinessRuleException("endDate is required for custom period type");
            }
            return dto.endDate();
        }
        if (dto.endDate() != null) return dto.endDate();
        return switch (dto.periodType()) {
            case "weekly"  -> start.plusWeeks(1).minusDays(1);
            case "monthly" -> start.plusMonths(1).minusDays(1);
            default        -> throw new BusinessRuleException("Unknown periodType: " + dto.periodType());
        };
    }

    private LocalDate computeNextEndDate(String periodType, LocalDate nextStart, FlowSheetEntity previous) {
        return switch (periodType) {
            case "weekly"  -> nextStart.plusWeeks(1).minusDays(1);
            case "monthly" -> nextStart.plusMonths(1).minusDays(1);
            // For custom, mirror the same duration as the previous sheet
            default -> {
                long days = previous.getEndDate().toEpochDay() - previous.getStartDate().toEpochDay();
                yield nextStart.plusDays(days);
            }
        };
    }

    /**
     * Converts pre-filtered recurring entries into EntryEntity instances for the new FlowSheet period.
     * Cadence filtering is handled upstream by RecurringEntryService.getForPeriod.
     */
    private List<EntryEntity> buildRecurringEntries(
            List<RecurringEntryEntity> recurring,
            FlowSheetEntity sheet,
            LocalDate periodStart) {

        List<EntryEntity> entries = new ArrayList<>();
        for (RecurringEntryEntity r : recurring) {
            entries.add(EntryEntity.builder()
                    .flowSheetId(sheet.getId())
                    .userId(sheet.getUserId())
                    .entryType(r.getEntryType())
                    .category(r.getCategoryId().toString())
                    .amount(r.getAmount())
                    .currency(r.getCurrency())
                    .entryDate(periodStart)
                    .note(r.getNote())
                    .isDeleted(false)
                    .build());
        }
        return entries;
    }
}

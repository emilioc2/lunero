package com.lunero.recurring;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringEntryService {

    private static final Set<String> VALID_CADENCES =
            Set.of("daily", "weekly", "bi-weekly", "monthly");
    private static final Set<String> VALID_ENTRY_TYPES =
            Set.of("income", "expense", "savings");
    private static final long SUGGESTION_THRESHOLD = 3;

    private final RecurringEntryRepository recurringEntryRepository;
    private final EntryRepository entryRepository;
    private final AuditLogService auditLogService;

    /**
     * Lists all non-deleted recurring entries for the user (Req 4.3).
     */
    @Transactional(readOnly = true)
    public List<RecurringEntryEntity> list(UUID userId) {
        return recurringEntryRepository.findByUserIdAndIsDeletedFalse(userId);
    }

    /**
     * Creates a new recurring entry (Req 4.1).
     * Validates amount > 0, cadence, and entryType.
     */
    @Transactional
    public RecurringEntryEntity create(UUID userId, CreateRecurringEntryRequest dto) {
        validateAmount(dto.amount() == null ? null : dto.amount().doubleValue());
        validateCadence(dto.cadence());
        validateEntryType(dto.entryType());

        RecurringEntryEntity entity = RecurringEntryEntity.builder()
                .userId(userId)
                .entryType(dto.entryType())
                .categoryId(dto.categoryId())
                .amount(dto.amount())
                .currency(dto.currency())
                .cadence(dto.cadence())
                .note(dto.note())
                .isPaused(false)
                .isDeleted(false)
                .build();

        RecurringEntryEntity saved = recurringEntryRepository.save(entity);
        auditLogService.log(userId.toString(), "recurring_entry", saved.getId().toString(), AuditAction.CREATE);
        log.info("Created recurring entry id={} cadence={} for userId={}", saved.getId(), saved.getCadence(), userId);
        return saved;
    }

    /**
     * Updates amount, categoryId, cadence, or note of a recurring entry.
     * Changes apply to future FlowSheets only (Req 4.4).
     */
    @Transactional
    public RecurringEntryEntity update(UUID userId, UUID id, UpdateRecurringEntryRequest dto) {
        RecurringEntryEntity entity = getOwned(userId, id);

        if (dto.amount() != null) {
            validateAmount(dto.amount().doubleValue());
            entity.setAmount(dto.amount());
        }
        if (dto.categoryId() != null) entity.setCategoryId(dto.categoryId());
        if (dto.cadence() != null) {
            validateCadence(dto.cadence());
            entity.setCadence(dto.cadence());
        }
        if (dto.note() != null) entity.setNote(dto.note());

        RecurringEntryEntity saved = recurringEntryRepository.save(entity);
        auditLogService.log(userId.toString(), "recurring_entry", id.toString(), AuditAction.UPDATE);
        log.info("Updated recurring entry id={} for userId={}", id, userId);
        return saved;
    }

    /**
     * Soft-deletes a recurring entry. Removes it from future FlowSheets
     * but retains it in past FlowSheets (Req 4.6).
     */
    @Transactional
    public void delete(UUID userId, UUID id) {
        RecurringEntryEntity entity = getOwned(userId, id);
        entity.setDeleted(true);
        recurringEntryRepository.save(entity);
        auditLogService.log(userId.toString(), "recurring_entry", id.toString(), AuditAction.DELETE);
        log.info("Soft-deleted recurring entry id={} for userId={}", id, userId);
    }

    /**
     * Pauses a recurring entry so it is excluded from new FlowSheets (Req 4.5).
     */
    @Transactional
    public RecurringEntryEntity pause(UUID userId, UUID id) {
        RecurringEntryEntity entity = getOwned(userId, id);
        entity.setPaused(true);
        RecurringEntryEntity saved = recurringEntryRepository.save(entity);
        auditLogService.log(userId.toString(), "recurring_entry", id.toString(), AuditAction.UPDATE);
        log.info("Paused recurring entry id={} for userId={}", id, userId);
        return saved;
    }

    /**
     * Resumes a paused recurring entry so it is included in new FlowSheets again (Req 4.5).
     */
    @Transactional
    public RecurringEntryEntity resume(UUID userId, UUID id) {
        RecurringEntryEntity entity = getOwned(userId, id);
        entity.setPaused(false);
        RecurringEntryEntity saved = recurringEntryRepository.save(entity);
        auditLogService.log(userId.toString(), "recurring_entry", id.toString(), AuditAction.UPDATE);
        log.info("Resumed recurring entry id={} for userId={}", id, userId);
        return saved;
    }

    /**
     * Returns all non-paused, non-deleted recurring entries whose cadence falls
     * within the given period range (Req 4.2, Property 11).
     */
    @Transactional(readOnly = true)
    public List<RecurringEntryEntity> getForPeriod(UUID userId, LocalDate periodStart, LocalDate periodEnd) {
        long periodDays = periodEnd.toEpochDay() - periodStart.toEpochDay() + 1;
        return recurringEntryRepository
                .findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId)
                .stream()
                .filter(r -> cadenceFitsInPeriod(r.getCadence(), periodDays))
                .toList();
    }

    /**
     * Returns suggestions to convert manually-repeated entries into recurring entries.
     * A suggestion is raised when the same amount+category appears in 3+ distinct FlowSheets (Req 4.7, Property 14).
     */
    @Transactional(readOnly = true)
    public List<RecurringSuggestion> getSuggestions(UUID userId) {
        return entryRepository.findRepeatedAmountCategoryPairs(userId, SUGGESTION_THRESHOLD)
                .stream()
                .map(row -> new RecurringSuggestion(
                        (UUID) row[0],
                        (java.math.BigDecimal) row[1],
                        (long) row[2]))
                .toList();
    }

    // --- helpers ---

    RecurringEntryEntity getOwned(UUID userId, UUID id) {
        return recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId)
                .orElseThrow(() -> new EntityNotFoundException("RecurringEntry", id));
    }

    private void validateAmount(Double amount) {
        if (amount == null || amount <= 0) {
            throw new ValidationException("amount must be greater than 0");
        }
    }

    private void validateCadence(String cadence) {
        if (cadence == null || !VALID_CADENCES.contains(cadence)) {
            throw new ValidationException("cadence must be one of: daily, weekly, bi-weekly, monthly");
        }
    }

    private void validateEntryType(String entryType) {
        if (entryType == null || !VALID_ENTRY_TYPES.contains(entryType)) {
            throw new ValidationException("entryType must be one of: income, expense, savings");
        }
    }

    private boolean cadenceFitsInPeriod(String cadence, long periodDays) {
        return switch (cadence) {
            case "daily"     -> true;
            case "weekly"    -> periodDays >= 7;
            case "bi-weekly" -> periodDays >= 14;
            case "monthly"   -> periodDays >= 28;
            default          -> false;
        };
    }
}

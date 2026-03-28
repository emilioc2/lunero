package com.lunero.entry;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.currency.CurrencyService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.flowsheet.FlowSheetService;
import com.lunero.notification.NotificationService;
import com.lunero.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntryService {

    private final EntryRepository entryRepository;
    private final FlowSheetRepository flowSheetRepository;
    private final FlowSheetService flowSheetService;
    private final AuditLogService auditLogService;
    private final CurrencyService currencyService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Lists all non-deleted entries for a FlowSheet owned by the user.
     */
    @Transactional(readOnly = true)
    public List<EntryEntity> listEntries(UUID userId, UUID flowSheetId) {
        getOwnedSheet(userId, flowSheetId); // ownership check
        return entryRepository.findByFlowSheetIdAndIsDeletedFalse(flowSheetId);
    }

    /**
     * Creates a new entry. Validates amount > 0 and that the FlowSheet is not locked.
     * Applies currency conversion when entry currency differs from user's defaultCurrency.
     * Recalculates availableBalance after save.
     */
    @Transactional
    public EntryResponse createEntry(UUID userId, CreateEntryRequest dto) {
        validateAmount(dto.amount());

        FlowSheetEntity sheet = getOwnedSheet(userId, dto.flowSheetId());
        checkNotLocked(sheet);

        String defaultCurrency = resolveDefaultCurrency(userId);

        EntryEntity entry = EntryEntity.builder()
                .flowSheetId(dto.flowSheetId())
                .userId(userId)
                .entryType(dto.entryType())
                .category(dto.category())
                .amount(dto.amount())
                .currency(dto.currency())
                .entryDate(dto.entryDate())
                .note(dto.note())
                .clientUpdatedAt(dto.clientUpdatedAt())
                .isDeleted(false)
                .build();

        applyConversion(entry, dto.amount(), dto.currency(), defaultCurrency);

        EntryEntity saved = entryRepository.save(entry);
        auditLogService.log(userId.toString(), "entry", saved.getId().toString(), AuditAction.CREATE);
        log.info("Created entry id={} type={} amount={} currency={} for userId={}",
                saved.getId(), saved.getEntryType(), saved.getAmount(), saved.getCurrency(), userId);

        BigDecimal balance = computeBalance(dto.flowSheetId());
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            notificationService.sendOverspendAlert(userId);
        }
        return EntryResponse.from(saved, balance);
    }

    /**
     * Updates an existing entry. Validates amount > 0 if provided, and that the FlowSheet is not locked.
     * Re-applies currency conversion when amount or currency changes.
     * Recalculates availableBalance after save.
     */
    @Transactional
    public EntryResponse updateEntry(UUID userId, UUID entryId, UpdateEntryRequest dto) {
        EntryEntity entry = getOwnedEntry(userId, entryId);
        FlowSheetEntity sheet = getOwnedSheet(userId, entry.getFlowSheetId());
        checkNotLocked(sheet);

        if (dto.amount() != null) {
            validateAmount(dto.amount());
            entry.setAmount(dto.amount());
        }
        if (dto.entryType() != null)    entry.setEntryType(dto.entryType());
        if (dto.category() != null)    entry.setCategory(dto.category());
        if (dto.currency() != null)     entry.setCurrency(dto.currency());
        if (dto.entryDate() != null)    entry.setEntryDate(dto.entryDate());
        if (dto.note() != null)         entry.setNote(dto.note());
        if (dto.clientUpdatedAt() != null) entry.setClientUpdatedAt(dto.clientUpdatedAt());

        // Re-apply conversion whenever amount or currency may have changed
        if (dto.amount() != null || dto.currency() != null) {
            String defaultCurrency = resolveDefaultCurrency(userId);
            applyConversion(entry, entry.getAmount(), entry.getCurrency(), defaultCurrency);
        }

        EntryEntity saved = entryRepository.save(entry);
        auditLogService.log(userId.toString(), "entry", entryId.toString(), AuditAction.UPDATE);
        log.info("Updated entry id={} for userId={}", entryId, userId);

        BigDecimal balance = computeBalance(entry.getFlowSheetId());
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            notificationService.sendOverspendAlert(userId);
        }
        return EntryResponse.from(saved, balance);
    }

    /**
     * Soft-deletes an entry. Validates that the FlowSheet is not locked.
     * Recalculates availableBalance after deletion.
     *
     * @return updated availableBalance for the parent FlowSheet
     */
    @Transactional
    public BigDecimal deleteEntry(UUID userId, UUID entryId) {
        EntryEntity entry = getOwnedEntry(userId, entryId);
        FlowSheetEntity sheet = getOwnedSheet(userId, entry.getFlowSheetId());
        checkNotLocked(sheet);

        entry.setDeleted(true);
        entryRepository.save(entry);
        auditLogService.log(userId.toString(), "entry", entryId.toString(), AuditAction.DELETE);
        log.info("Soft-deleted entry id={} for userId={}", entryId, userId);

        return computeBalance(entry.getFlowSheetId());
    }

    // --- helpers ---

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("amount must be greater than 0");
        }
    }

    private void checkNotLocked(FlowSheetEntity sheet) {
        if (sheet.isEditLocked()) {
            throw new BusinessRuleException(
                    "FlowSheet is locked for editing. Unlock it first via POST /api/v1/flowsheets/" + sheet.getId() + "/unlock");
        }
    }

    private FlowSheetEntity getOwnedSheet(UUID userId, UUID sheetId) {
        return flowSheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new EntityNotFoundException("FlowSheet", sheetId));
    }

    private EntryEntity getOwnedEntry(UUID userId, UUID entryId) {
        return entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Entry", entryId));
    }

    private BigDecimal computeBalance(UUID flowSheetId) {
        List<EntryEntity> entries = entryRepository.findByFlowSheetIdAndIsDeletedFalse(flowSheetId);
        return flowSheetService.computeAvailableBalance(entries);
    }

    /**
     * Looks up the user's defaultCurrency. Falls back to "USD" if user not found.
     */
    private String resolveDefaultCurrency(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> u.getDefaultCurrency())
                .orElse("USD");
    }

    /**
     * Applies currency conversion to the entry when entryCurrency differs from defaultCurrency.
     * Sets convertedAmount and conversionRate. If rates are unavailable, sets both to null
     * so the entry is excluded from balance until rates are restored.
     */
    private void applyConversion(EntryEntity entry, BigDecimal amount, String entryCurrency, String defaultCurrency) {
        if (entryCurrency == null || entryCurrency.equalsIgnoreCase(defaultCurrency)) {
            entry.setConvertedAmount(null);
            entry.setConversionRate(null);
            return;
        }
        CurrencyService.ConversionResult result = currencyService.convert(amount, entryCurrency, defaultCurrency);
        if (result != null) {
            entry.setConvertedAmount(result.convertedAmount());
            entry.setConversionRate(result.conversionRate());
        } else {
            // Rates unavailable — exclude from balance
            entry.setConvertedAmount(null);
            entry.setConversionRate(null);
            log.warn("FX rates unavailable for entry currency={} defaultCurrency={} — convertedAmount set to null",
                    entryCurrency, defaultCurrency);
        }
    }
}

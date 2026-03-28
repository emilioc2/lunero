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
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntryServiceTest {

    @Mock private EntryRepository entryRepository;
    @Mock private FlowSheetRepository flowSheetRepository;
    @Mock private FlowSheetService flowSheetService;
    @Mock private AuditLogService auditLogService;
    @Mock private CurrencyService currencyService;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    private EntryService entryService;

    private final UUID userId      = UUID.randomUUID();
    private final UUID sheetId     = UUID.randomUUID();
    private final UUID entryId     = UUID.randomUUID();
    private final UUID categoryId  = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        entryService = new EntryService(entryRepository, flowSheetRepository, flowSheetService,
                auditLogService, currencyService, userRepository, notificationService);
        // Default: user has USD as default currency
        UserEntity user = UserEntity.builder().id(userId).clerkUserId("clerk_test")
                .displayName("Test").defaultCurrency("USD").build();
        lenient().when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    // ── listEntries ──────────────────────────────────────────────────────────

    @Test
    void listEntries_returnsNonDeletedEntries() {
        FlowSheetEntity sheet = buildSheet(false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        EntryEntity entry = buildEntry(entryId, "income", new BigDecimal("500"));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(entry));

        List<EntryEntity> result = entryService.listEntries(userId, sheetId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(entryId);
    }

    @Test
    void listEntries_throws404_whenSheetNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> entryService.listEntries(userId, sheetId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── createEntry ──────────────────────────────────────────────────────────

    @Test
    void createEntry_persistsAndReturnsBalance() {
        FlowSheetEntity sheet = buildSheet(false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        EntryEntity saved = buildEntry(entryId, "income", new BigDecimal("1000"));
        when(entryRepository.save(any())).thenReturn(saved);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(saved));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("1000"));

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "income", categoryId.toString(), new BigDecimal("1000"),
                "USD", LocalDate.now(), null, null);

        EntryResponse response = entryService.createEntry(userId, req);

        assertThat(response.id()).isEqualTo(entryId);
        assertThat(response.availableBalance()).isEqualByComparingTo("1000");
        verify(auditLogService).log(any(), eq("entry"), any(), eq(AuditAction.CREATE));
    }

    @Test
    void createEntry_throws400_whenAmountIsZero() {
        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId.toString(), BigDecimal.ZERO,
                "USD", LocalDate.now(), null, null);

        assertThatThrownBy(() -> entryService.createEntry(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    @Test
    void createEntry_throws400_whenAmountIsNegative() {
        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId.toString(), new BigDecimal("-50"),
                "USD", LocalDate.now(), null, null);

        assertThatThrownBy(() -> entryService.createEntry(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    @Test
    void createEntry_throws422_whenSheetIsLocked() {
        FlowSheetEntity lockedSheet = buildSheet(true);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(lockedSheet));

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId.toString(), new BigDecimal("100"),
                "USD", LocalDate.now(), null, null);

        assertThatThrownBy(() -> entryService.createEntry(userId, req))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("locked");
    }

    @Test
    void createEntry_throws404_whenSheetNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "income", categoryId.toString(), new BigDecimal("100"),
                "USD", LocalDate.now(), null, null);

        assertThatThrownBy(() -> entryService.createEntry(userId, req))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── updateEntry ──────────────────────────────────────────────────────────

    @Test
    void updateEntry_updatesFieldsAndReturnsBalance() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("200"));
        FlowSheetEntity sheet = buildSheet(false);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(existing));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("300"));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, new BigDecimal("300"), null, null, "updated note", null);

        EntryResponse response = entryService.updateEntry(userId, entryId, req);

        assertThat(response.amount()).isEqualByComparingTo("300");
        assertThat(response.note()).isEqualTo("updated note");
        assertThat(response.availableBalance()).isEqualByComparingTo("300");
        verify(auditLogService).log(any(), eq("entry"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void updateEntry_ignoresNullFields() {
        EntryEntity existing = buildEntry(entryId, "income", new BigDecimal("500"));
        FlowSheetEntity sheet = buildSheet(false);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(existing));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("500"));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, null, null, null, null, null);

        EntryResponse response = entryService.updateEntry(userId, entryId, req);

        assertThat(response.amount()).isEqualByComparingTo("500");
        assertThat(response.entryType()).isEqualTo("income");
    }

    @Test
    void updateEntry_throws400_whenAmountIsZero() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("100"));
        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        FlowSheetEntity sheet = buildSheet(false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, BigDecimal.ZERO, null, null, null, null);

        assertThatThrownBy(() -> entryService.updateEntry(userId, entryId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    @Test
    void updateEntry_throws422_whenSheetIsLocked() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("100"));
        FlowSheetEntity lockedSheet = buildSheet(true);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(lockedSheet));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, new BigDecimal("200"), null, null, null, null);

        assertThatThrownBy(() -> entryService.updateEntry(userId, entryId, req))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("locked");
    }

    @Test
    void updateEntry_throws404_whenEntryNotOwned() {
        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.empty());

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, new BigDecimal("100"), null, null, null, null);

        assertThatThrownBy(() -> entryService.updateEntry(userId, entryId, req))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── deleteEntry ──────────────────────────────────────────────────────────

    @Test
    void deleteEntry_softDeletesAndReturnsBalance() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("200"));
        FlowSheetEntity sheet = buildSheet(false);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of());
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(BigDecimal.ZERO);

        BigDecimal balance = entryService.deleteEntry(userId, entryId);

        assertThat(existing.isDeleted()).isTrue();
        assertThat(balance).isEqualByComparingTo("0");
        verify(auditLogService).log(any(), eq("entry"), any(), eq(AuditAction.DELETE));
    }

    @Test
    void deleteEntry_throws422_whenSheetIsLocked() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("100"));
        FlowSheetEntity lockedSheet = buildSheet(true);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(lockedSheet));

        assertThatThrownBy(() -> entryService.deleteEntry(userId, entryId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("locked");
    }

    @Test
    void deleteEntry_throws404_whenEntryNotOwned() {
        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> entryService.deleteEntry(userId, entryId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── overspend notification trigger ───────────────────────────────────────

    @Test
    void createEntry_firesOverspendAlert_whenBalanceGoesNegative() {
        FlowSheetEntity sheet = buildSheet(false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        EntryEntity saved = buildEntry(entryId, "expense", new BigDecimal("500"));
        when(entryRepository.save(any())).thenReturn(saved);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(saved));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("-50"));

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId.toString(), new BigDecimal("500"),
                "USD", LocalDate.now(), null, null);

        entryService.createEntry(userId, req);

        verify(notificationService).sendOverspendAlert(userId);
    }

    @Test
    void createEntry_doesNotFireOverspendAlert_whenBalanceIsZeroOrPositive() {
        FlowSheetEntity sheet = buildSheet(false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        EntryEntity saved = buildEntry(entryId, "expense", new BigDecimal("100"));
        when(entryRepository.save(any())).thenReturn(saved);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(saved));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(BigDecimal.ZERO);

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId.toString(), new BigDecimal("100"),
                "USD", LocalDate.now(), null, null);

        entryService.createEntry(userId, req);

        verify(notificationService, never()).sendOverspendAlert(any());
    }

    @Test
    void updateEntry_firesOverspendAlert_whenBalanceGoesNegative() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("100"));
        FlowSheetEntity sheet = buildSheet(false);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(existing));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("-200"));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, new BigDecimal("500"), null, null, null, null);

        entryService.updateEntry(userId, entryId, req);

        verify(notificationService).sendOverspendAlert(userId);
    }

    @Test
    void updateEntry_doesNotFireOverspendAlert_whenBalanceIsPositive() {
        EntryEntity existing = buildEntry(entryId, "expense", new BigDecimal("100"));
        FlowSheetEntity sheet = buildSheet(false);

        when(entryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId)).thenReturn(Optional.of(existing));
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(existing));
        when(flowSheetService.computeAvailableBalance(any())).thenReturn(new BigDecimal("500"));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, new BigDecimal("100"), null, null, null, null);

        entryService.updateEntry(userId, entryId, req);

        verify(notificationService, never()).sendOverspendAlert(any());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private FlowSheetEntity buildSheet(boolean editLocked) {
        return FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status(editLocked ? "archived" : "active")
                .editLocked(editLocked)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private EntryEntity buildEntry(UUID id, String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(id).flowSheetId(sheetId).userId(userId)
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}

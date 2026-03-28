package com.lunero.flowsheet;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.recurring.RecurringEntryEntity;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.recurring.RecurringEntryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlowSheetServiceTest {

    @Mock private FlowSheetRepository flowSheetRepository;
    @Mock private EntryRepository entryRepository;
    @Mock private RecurringEntryRepository recurringEntryRepository;
    @Mock private RecurringEntryService recurringEntryService;
    @Mock private AuditLogService auditLogService;

    private FlowSheetService service;

    private final UUID userId  = UUID.randomUUID();
    private final UUID sheetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new FlowSheetService(
                flowSheetRepository, entryRepository, recurringEntryRepository,
                recurringEntryService, auditLogService,
                mock(com.lunero.projection.ProjectionService.class));
        // Default: no recurring entries — avoids UnnecessaryStubbingException in tests that don't care
        lenient().when(recurringEntryService.getForPeriod(any(), any(), any()))
                .thenReturn(List.of());
    }

    // ── createFlowSheet ──────────────────────────────────────────────────────

    @Test
    void createFlowSheet_monthly_defaultsEndDate() {
        LocalDate today = LocalDate.now();
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any())).thenReturn(false);
        when(flowSheetRepository.save(any())).thenAnswer(inv -> {
            FlowSheetEntity e = inv.getArgument(0);
            e = FlowSheetEntity.builder()
                    .id(sheetId).userId(e.getUserId()).periodType(e.getPeriodType())
                    .startDate(e.getStartDate()).endDate(e.getEndDate())
                    .status(e.getStatus()).editLocked(e.isEditLocked()).build();
            return e;
        });

        FlowSheetEntity result = service.createFlowSheet(userId,
                new CreateFlowSheetRequest("monthly", null, null));

        assertThat(result.getPeriodType()).isEqualTo("monthly");
        assertThat(result.getStartDate()).isEqualTo(today);
        assertThat(result.getEndDate()).isEqualTo(today.plusMonths(1).minusDays(1));
        assertThat(result.getStatus()).isEqualTo("active");
        assertThat(result.isEditLocked()).isFalse();
        verify(auditLogService).log(any(), eq("flowsheet"), any(), eq(AuditAction.CREATE));
    }

    @Test
    void createFlowSheet_weekly_defaultsEndDate() {
        LocalDate today = LocalDate.now();
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any())).thenReturn(false);
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FlowSheetEntity result = service.createFlowSheet(userId,
                new CreateFlowSheetRequest("weekly", null, null));

        assertThat(result.getEndDate()).isEqualTo(today.plusWeeks(1).minusDays(1));
    }

    @Test
    void createFlowSheet_custom_requiresEndDate() {
        assertThatThrownBy(() -> service.createFlowSheet(userId,
                new CreateFlowSheetRequest("custom", LocalDate.now(), null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("endDate is required");
    }

    @Test
    void createFlowSheet_rejectsEndDateBeforeStartDate() {
        LocalDate start = LocalDate.now();
        LocalDate end   = start.minusDays(1);

        assertThatThrownBy(() -> service.createFlowSheet(userId,
                new CreateFlowSheetRequest("custom", start, end)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("endDate must be after startDate");
    }

    @Test
    void createFlowSheet_rejectsOverlap() {
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.createFlowSheet(userId,
                new CreateFlowSheetRequest("monthly", null, null)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Overlapping");

        verify(flowSheetRepository, never()).save(any());
    }

    // ── getActiveFlowSheet ───────────────────────────────────────────────────

    @Test
    void getActiveFlowSheet_returnsWithComputedBalance() {
        FlowSheetEntity sheet = buildSheet(sheetId, "active", false);
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));

        EntryEntity income  = buildEntry("income",  new BigDecimal("1000"), null);
        EntryEntity expense = buildEntry("expense", new BigDecimal("300"),  null);
        EntryEntity savings = buildEntry("savings", new BigDecimal("200"),  null);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId))
                .thenReturn(List.of(income, expense, savings));

        FlowSheetResponse response = service.getActiveFlowSheet(userId);

        assertThat(response.totalIncome()).isEqualByComparingTo("1000");
        assertThat(response.totalExpenses()).isEqualByComparingTo("300");
        assertThat(response.totalSavings()).isEqualByComparingTo("200");
        assertThat(response.availableBalance()).isEqualByComparingTo("500");
    }

    @Test
    void getActiveFlowSheet_usesConvertedAmountWhenPresent() {
        FlowSheetEntity sheet = buildSheet(sheetId, "active", false);
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));

        // original 100 EUR, converted to 110 USD
        EntryEntity income = buildEntry("income", new BigDecimal("100"), new BigDecimal("110"));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(income));

        FlowSheetResponse response = service.getActiveFlowSheet(userId);

        assertThat(response.totalIncome()).isEqualByComparingTo("110");
    }

    @Test
    void getActiveFlowSheet_throws404_whenNoneExists() {
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getActiveFlowSheet(userId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getActiveFlowSheet_ignoresDeletedEntries() {
        FlowSheetEntity sheet = buildSheet(sheetId, "active", false);
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of());

        FlowSheetResponse response = service.getActiveFlowSheet(userId);

        assertThat(response.availableBalance()).isEqualByComparingTo("0");
    }

    // ── getAllFlowSheets ──────────────────────────────────────────────────────

    @Test
    void getAllFlowSheets_returnsPaginatedResults() {
        FlowSheetEntity sheet = buildSheet(sheetId, "archived", true);
        when(flowSheetRepository.findAllByUserIdOrderByEndDateDesc(eq(userId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sheet)));

        var page = service.getAllFlowSheets(userId, 0, 20);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(sheetId);
    }

    // ── getFlowSheetById ─────────────────────────────────────────────────────

    @Test
    void getFlowSheetById_returnsWithBalance() {
        FlowSheetEntity sheet = buildSheet(sheetId, "archived", true);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of());

        FlowSheetResponse response = service.getFlowSheetById(userId, sheetId);

        assertThat(response.id()).isEqualTo(sheetId);
    }

    @Test
    void getFlowSheetById_throws404_whenNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getFlowSheetById(userId, sheetId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── unlockPastSheet ──────────────────────────────────────────────────────

    @Test
    void unlockPastSheet_setsEditLockedFalse() {
        FlowSheetEntity sheet = buildSheet(sheetId, "archived", true);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FlowSheetEntity result = service.unlockPastSheet(userId, sheetId);

        assertThat(result.isEditLocked()).isFalse();
        verify(auditLogService).log(any(), eq("flowsheet"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void unlockPastSheet_throws_whenActiveSheet() {
        FlowSheetEntity sheet = buildSheet(sheetId, "active", false);
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        assertThatThrownBy(() -> service.unlockPastSheet(userId, sheetId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("already editable");
    }

    @Test
    void unlockPastSheet_throws404_whenNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unlockPastSheet(userId, sheetId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── computeAvailableBalance ──────────────────────────────────────────────

    @Test
    void computeAvailableBalance_correctFormula() {
        List<EntryEntity> entries = List.of(
                buildEntry("income",  new BigDecimal("2000"), null),
                buildEntry("expense", new BigDecimal("800"),  null),
                buildEntry("savings", new BigDecimal("400"),  null)
        );

        BigDecimal balance = service.computeAvailableBalance(entries);

        // 2000 - (800 + 400) = 800
        assertThat(balance).isEqualByComparingTo("800");
    }

    @Test
    void computeAvailableBalance_prefersConvertedAmount() {
        EntryEntity e = buildEntry("income", new BigDecimal("100"), new BigDecimal("115"));
        assertThat(service.computeAvailableBalance(List.of(e))).isEqualByComparingTo("115");
    }

    @Test
    void computeAvailableBalance_emptyEntries_returnsZero() {
        assertThat(service.computeAvailableBalance(List.of())).isEqualByComparingTo("0");
    }

    @Test
    void computeAvailableBalance_canGoNegative() {
        List<EntryEntity> entries = List.of(
                buildEntry("income",  new BigDecimal("100"), null),
                buildEntry("expense", new BigDecimal("300"), null)
        );
        assertThat(service.computeAvailableBalance(entries)).isEqualByComparingTo("-200");
    }

    // ── archiveExpiredSheets ─────────────────────────────────────────────────

    @Test
    void archiveExpiredSheets_returnsZero_whenNoneExpired() {
        when(flowSheetRepository.findExpiredActiveSheets(any())).thenReturn(List.of());

        int count = service.archiveExpiredSheets();

        assertThat(count).isZero();
        verify(flowSheetRepository, never()).save(any());
    }

    @Test
    void archiveExpiredSheets_archivesAndCreatesNextPeriod() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        FlowSheetEntity expired = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(yesterday.minusMonths(1)).endDate(yesterday)
                .status("active").editLocked(false).build();

        when(flowSheetRepository.findExpiredActiveSheets(any())).thenReturn(List.of(expired));
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any())).thenReturn(false);
        when(flowSheetRepository.save(any())).thenAnswer(inv -> {
            FlowSheetEntity e = inv.getArgument(0);
            if (e.getId() == null) {
                return FlowSheetEntity.builder()
                        .id(UUID.randomUUID()).userId(e.getUserId()).periodType(e.getPeriodType())
                        .startDate(e.getStartDate()).endDate(e.getEndDate())
                        .status(e.getStatus()).editLocked(e.isEditLocked()).build();
            }
            return e;
        });
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of());

        int count = service.archiveExpiredSheets();

        assertThat(count).isEqualTo(1);

        // Verify the expired sheet was archived
        ArgumentCaptor<FlowSheetEntity> captor = ArgumentCaptor.forClass(FlowSheetEntity.class);
        verify(flowSheetRepository, atLeast(2)).save(captor.capture());
        List<FlowSheetEntity> saved = captor.getAllValues();

        FlowSheetEntity archivedSheet = saved.stream()
                .filter(s -> s.getId() != null && s.getId().equals(sheetId))
                .findFirst().orElseThrow();
        assertThat(archivedSheet.getStatus()).isEqualTo("archived");
        assertThat(archivedSheet.isEditLocked()).isTrue();
    }

    @Test
    void archiveExpiredSheets_populatesRecurringEntries() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        FlowSheetEntity expired = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(yesterday.minusMonths(1)).endDate(yesterday)
                .status("active").editLocked(false).build();

        UUID newSheetId = UUID.randomUUID();
        RecurringEntryEntity recurring = RecurringEntryEntity.builder()
                .id(UUID.randomUUID()).userId(userId).entryType("expense")
                .categoryId(UUID.randomUUID()).amount(new BigDecimal("500"))
                .currency("USD").cadence("monthly").isPaused(false).isDeleted(false).build();

        when(flowSheetRepository.findExpiredActiveSheets(any())).thenReturn(List.of(expired));
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any())).thenReturn(false);
        when(flowSheetRepository.save(any())).thenAnswer(inv -> {
            FlowSheetEntity e = inv.getArgument(0);
            if (e.getId() == null) {
                return FlowSheetEntity.builder()
                        .id(newSheetId).userId(e.getUserId()).periodType(e.getPeriodType())
                        .startDate(e.getStartDate()).endDate(e.getEndDate())
                        .status(e.getStatus()).editLocked(e.isEditLocked()).build();
            }
            return e;
        });
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(recurring));

        service.archiveExpiredSheets();

        ArgumentCaptor<List<EntryEntity>> entriesCaptor = ArgumentCaptor.forClass(List.class);
        verify(entryRepository).saveAll(entriesCaptor.capture());
        List<EntryEntity> inserted = entriesCaptor.getValue();
        assertThat(inserted).hasSize(1);
        assertThat(inserted.get(0).getEntryType()).isEqualTo("expense");
        assertThat(inserted.get(0).getAmount()).isEqualByComparingTo("500");
        assertThat(inserted.get(0).getFlowSheetId()).isEqualTo(newSheetId);
    }

    @Test
    void archiveExpiredSheets_skipsNextPeriod_whenOverlapDetected() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        FlowSheetEntity expired = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(yesterday.minusMonths(1)).endDate(yesterday)
                .status("active").editLocked(false).build();

        when(flowSheetRepository.findExpiredActiveSheets(any())).thenReturn(List.of(expired));
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // First call (archive check) returns false, second call (next period check) returns true
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any()))
                .thenReturn(false)   // overlap check during archive
                .thenReturn(true);   // overlap check for next period

        service.archiveExpiredSheets();

        // Only one save: the archive update; no new sheet created
        verify(flowSheetRepository, times(1)).save(any());
        verify(entryRepository, never()).saveAll(any());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private FlowSheetEntity buildSheet(UUID id, String status, boolean editLocked) {
        return FlowSheetEntity.builder()
                .id(id).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status(status).editLocked(editLocked)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private EntryEntity buildEntry(String type, BigDecimal amount, BigDecimal convertedAmount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD").convertedAmount(convertedAmount)
                .entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}

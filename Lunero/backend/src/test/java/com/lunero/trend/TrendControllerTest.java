package com.lunero.trend;

import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryEntity;
import com.lunero.security.ClerkAuthentication;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class TrendControllerTest {

    @Mock private TrendService trendService;
    @Mock private UserService  userService;

    private MockMvc mockMvc;

    private final String clerkUserId = "clerk_trend_test";
    private final UUID   userId      = UUID.randomUUID();
    private final UUID   categoryId  = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        TrendController controller = new TrendController(trendService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        lenient().when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // ── GET /api/v1/trends ────────────────────────────────────────────────────

    @Test
    void getTrends_weekly_returns200() throws Exception {
        TrendData data = new TrendData("weekly", List.of(
                new TrendPeriod("weekly_2024-01-01_2024-01-07", "2024-01-01 – 2024-01-07",
                        "2024-01-01", "2024-01-07",
                        new BigDecimal("1000"), new BigDecimal("400"), new BigDecimal("200"),
                        new BigDecimal("400"))
        ));
        when(trendService.getTrends(eq(userId), eq("weekly"), any(), any(), isNull()))
                .thenReturn(data);

        mockMvc.perform(get("/api/v1/trends")
                        .param("view", "weekly")
                        .param("from", "2024-01-01")
                        .param("to", "2024-01-14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("weekly"))
                .andExpect(jsonPath("$.periods[0].totalIncome").value(1000.0))
                .andExpect(jsonPath("$.periods[0].totalExpenses").value(400.0))
                .andExpect(jsonPath("$.periods[0].availableBalance").value(400.0));
    }

    @Test
    void getTrends_monthly_returns200() throws Exception {
        TrendData data = new TrendData("monthly", List.of(
                new TrendPeriod("monthly_2024-01-01_2024-01-31", "January 2024",
                        "2024-01-01", "2024-01-31",
                        new BigDecimal("3000"), new BigDecimal("800"), new BigDecimal("500"),
                        new BigDecimal("1700"))
        ));
        when(trendService.getTrends(eq(userId), eq("monthly"), any(), any(), isNull()))
                .thenReturn(data);

        mockMvc.perform(get("/api/v1/trends")
                        .param("view", "monthly")
                        .param("from", "2024-01-01")
                        .param("to", "2024-01-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("monthly"))
                .andExpect(jsonPath("$.periods[0].label").value("January 2024"));
    }

    @Test
    void getTrends_yearly_returns200() throws Exception {
        TrendData data = new TrendData("yearly", List.of(
                new TrendPeriod("yearly_2024-01-01_2024-12-31", "2024",
                        "2024-01-01", "2024-12-31",
                        new BigDecimal("36000"), new BigDecimal("12000"), new BigDecimal("6000"),
                        new BigDecimal("18000"))
        ));
        when(trendService.getTrends(eq(userId), eq("yearly"), isNull(), isNull(), isNull()))
                .thenReturn(data);

        mockMvc.perform(get("/api/v1/trends").param("view", "yearly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.view").value("yearly"))
                .andExpect(jsonPath("$.periods[0].label").value("2024"));
    }

    @Test
    void getTrends_withCategoryFilter_passesIdToService() throws Exception {
        TrendData data = new TrendData("monthly", List.of());
        when(trendService.getTrends(eq(userId), eq("monthly"), any(), any(), eq(categoryId)))
                .thenReturn(data);

        mockMvc.perform(get("/api/v1/trends")
                        .param("view", "monthly")
                        .param("from", "2024-01-01")
                        .param("to", "2024-01-31")
                        .param("categoryId", categoryId.toString()))
                .andExpect(status().isOk());

        verify(trendService).getTrends(eq(userId), eq("monthly"), any(), any(), eq(categoryId));
    }

    @Test
    void getTrends_emptyPeriods_returns200WithEmptyList() throws Exception {
        when(trendService.getTrends(any(), any(), any(), any(), any()))
                .thenReturn(new TrendData("yearly", List.of()));

        mockMvc.perform(get("/api/v1/trends").param("view", "yearly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.periods").isEmpty());
    }

    // ── GET /api/v1/trends/:dataPointId/breakdown ─────────────────────────────

    @Test
    void getBreakdown_returns200WithEntries() throws Exception {
        EntryEntity entry = buildEntry("expense", new BigDecimal("200"));
        when(trendService.getBreakdown(eq(userId), eq("weekly_2024-01-01_2024-01-07"), isNull()))
                .thenReturn(List.of(entry));

        mockMvc.perform(get("/api/v1/trends/weekly_2024-01-01_2024-01-07/breakdown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].entryType").value("expense"))
                .andExpect(jsonPath("$[0].amount").value(200.0));
    }

    @Test
    void getBreakdown_withCategoryFilter_passesIdToService() throws Exception {
        when(trendService.getBreakdown(eq(userId), any(), eq(categoryId))).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/trends/monthly_2024-01-01_2024-01-31/breakdown")
                        .param("categoryId", categoryId.toString()))
                .andExpect(status().isOk());

        verify(trendService).getBreakdown(eq(userId), any(), eq(categoryId));
    }

    @Test
    void getBreakdown_returns404_whenDataPointNotFound() throws Exception {
        when(trendService.getBreakdown(eq(userId), any(), any()))
                .thenThrow(new EntityNotFoundException("TrendPeriod", "bad_id"));

        mockMvc.perform(get("/api/v1/trends/bad_id/breakdown"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBreakdown_returnsEmptyList_whenNoPeriodEntries() throws Exception {
        when(trendService.getBreakdown(eq(userId), any(), isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/trends/weekly_2024-01-01_2024-01-07/breakdown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private EntryEntity buildEntry(String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID())
                .flowSheetId(UUID.randomUUID())
                .userId(userId)
                .entryType(type)
                .category(categoryId.toString())
                .amount(amount)
                .currency("USD")
                .entryDate(LocalDate.now())
                .isDeleted(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}

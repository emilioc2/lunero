package com.lunero.ai;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.CreateEntryRequest;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.entry.EntryResponse;
import com.lunero.entry.EntryService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.projection.CategoryProjectionEntity;
import com.lunero.projection.ProjectionService;
import com.lunero.recurring.RecurringEntryEntity;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MiraService {

    static final String OVERSPEND_ALERT_TYPE = "overspend_projection";
    static final String MIRA_UNAVAILABLE_MSG = "Mira is unavailable right now";

    private final ChatClient chatClient;
    private final FlowSheetRepository flowSheetRepository;
    private final EntryRepository entryRepository;
    private final RecurringEntryRepository recurringEntryRepository;
    private final UserRepository userRepository;
    private final DismissedAlertRepository dismissedAlertRepository;
    private final EntryService entryService;
    private final CategoryRepository categoryRepository;
    private final ProjectionService projectionService;

    // ── 12.1 Query ────────────────────────────────────────────────────────────

    /**
     * Fetches the user's active FlowSheet data, builds a context prompt,
     * calls Gemini via Spring AI, and returns a grounded response.
     * Handles Gemini unavailability gracefully (12.5).
     * Supports onboarding mode (12.6).
     */
    @Transactional
    public Object query(UUID userId, String message) {
        UserEntity user = getUser(userId);

        // 12.6 — onboarding mode: parse and create entries from natural language
        if (!user.isOnboardingComplete()) {
            return handleOnboardingQuery(userId, user, message);
        }

        // 29.5 — detect projection intent (e.g. "I plan to spend $500 on groceries")
        if (isProjectionIntent(message)) {
            return handleProjectionQuery(userId, user, message);
        }

        return new MiraQueryResponse(callGemini(userId, message));
    }

    // ── 12.2 Proactive alerts ─────────────────────────────────────────────────

    /**
     * Evaluates projected balance = current balance − remaining recurring expenses.
     * Returns an overspend alert when projected balance < 0.
     * Respects overspendAlerts=false (12.4) and dismissed alerts (12.3).
     */
    @Transactional(readOnly = true)
    public List<AlertResponse> checkProactiveAlerts(UUID userId) {
        UserEntity user = getUser(userId);

        // 12.4 — respect user setting
        if (!user.isOverspendAlerts()) {
            return List.of();
        }

        Optional<FlowSheetEntity> activeSheetOpt =
                flowSheetRepository.findByUserIdAndStatus(userId, "active");
        if (activeSheetOpt.isEmpty()) {
            return List.of();
        }

        FlowSheetEntity sheet = activeSheetOpt.get();
        List<EntryEntity> entries = entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheet.getId());

        // Current balance
        BigDecimal currentBalance = computeBalance(entries);

        // Remaining recurring expenses for the period
        BigDecimal remainingRecurringExpenses = computeRemainingRecurringExpenses(userId, sheet);

        BigDecimal projectedBalance = currentBalance.subtract(remainingRecurringExpenses);

        if (projectedBalance.compareTo(BigDecimal.ZERO) < 0) {
            // Check if already dismissed for this sheet
            boolean dismissed = dismissedAlertRepository
                    .existsByUserIdAndAlertTypeAndFlowSheetId(userId, OVERSPEND_ALERT_TYPE, sheet.getId());
            if (dismissed) {
                return List.of();
            }

            // Build a transient alert (not persisted — only dismissed_alerts are persisted)
            AlertResponse alert = new AlertResponse(
                    sheet.getId(), // use flowSheetId as a stable alert id for this period
                    OVERSPEND_ALERT_TYPE,
                    "Your projected balance is negative. You may overspend this period.",
                    sheet.getId()
            );
            return List.of(alert);
        }

        return List.of();
    }

    // ── 12.3 Dismiss alert ────────────────────────────────────────────────────

    /**
     * Writes to dismissed_alerts, preventing re-surfacing for the same period.
     * Uses UNIQUE constraint (user_id, alert_type, flow_sheet_id) to avoid duplicates.
     */
    @Transactional
    public void dismissAlert(UUID userId, UUID alertId) {
        // alertId is the flowSheetId for overspend alerts
        FlowSheetEntity sheet = flowSheetRepository.findByIdAndUserId(alertId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Alert", alertId));

        boolean alreadyDismissed = dismissedAlertRepository
                .existsByUserIdAndAlertTypeAndFlowSheetId(userId, OVERSPEND_ALERT_TYPE, sheet.getId());

        if (!alreadyDismissed) {
            DismissedAlertEntity dismissed = DismissedAlertEntity.builder()
                    .userId(userId)
                    .alertType(OVERSPEND_ALERT_TYPE)
                    .flowSheetId(sheet.getId())
                    .build();
            dismissedAlertRepository.save(dismissed);
            log.info("Dismissed alert type={} for userId={} flowSheetId={}", OVERSPEND_ALERT_TYPE, userId, sheet.getId());
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Calls Gemini with a context-enriched prompt. Returns MIRA_UNAVAILABLE_MSG on failure (12.5).
     */
    String callGemini(UUID userId, String userMessage) {
        String contextPrompt = buildContextPrompt(userId, userMessage);
        try {
            return chatClient.prompt()
                    .user(contextPrompt)
                    .call()
                    .content();
        } catch (Exception ex) {
            log.warn("Gemini unavailable for userId={}: {}", userId, ex.getMessage());
            return MIRA_UNAVAILABLE_MSG;
        }
    }

    /**
     * Builds a grounded context prompt using only the authenticated user's data (Property 20).
     */
    String buildContextPrompt(UUID userId, String userMessage) {
        Optional<FlowSheetEntity> activeSheetOpt =
                flowSheetRepository.findByUserIdAndStatus(userId, "active");

        StringBuilder ctx = new StringBuilder();
        ctx.append("You are Mira, a calm and helpful budgeting coach for the Lunero app. ");
        ctx.append("Answer only based on the user's financial data provided below. ");
        ctx.append("Do not make up numbers or reference data not shown here.\n\n");

        if (activeSheetOpt.isPresent()) {
            FlowSheetEntity sheet = activeSheetOpt.get();
            List<EntryEntity> entries = entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheet.getId());

            BigDecimal income   = BigDecimal.ZERO;
            BigDecimal expenses = BigDecimal.ZERO;
            BigDecimal savings  = BigDecimal.ZERO;

            for (EntryEntity e : entries) {
                BigDecimal amt = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
                switch (e.getEntryType()) {
                    case "income"  -> income   = income.add(amt);
                    case "expense" -> expenses = expenses.add(amt);
                    case "savings" -> savings  = savings.add(amt);
                }
            }

            BigDecimal balance = income.subtract(expenses.add(savings));

            ctx.append("Current FlowSheet period: ").append(sheet.getStartDate())
               .append(" to ").append(sheet.getEndDate()).append("\n");
            ctx.append("Total Income: ").append(income).append("\n");
            ctx.append("Total Expenses: ").append(expenses).append("\n");
            ctx.append("Total Savings: ").append(savings).append("\n");
            ctx.append("Available Balance: ").append(balance).append("\n");
            ctx.append("Number of entries: ").append(entries.size()).append("\n\n");
        } else {
            ctx.append("The user has no active FlowSheet at this time.\n\n");
        }

        ctx.append("User question: ").append(userMessage);
        return ctx.toString();
    }

    /**
     * Handles onboarding mode (12.6): parses natural-language prompt and creates entries.
     */
    private OnboardingSummaryResponse handleOnboardingQuery(UUID userId, UserEntity user, String message) {
        // Ask Gemini to extract structured entry data from the natural-language prompt
        String extractionPrompt = buildOnboardingExtractionPrompt(message, user.getDefaultCurrency());

        String geminiResponse;
        try {
            geminiResponse = chatClient.prompt()
                    .user(extractionPrompt)
                    .call()
                    .content();
        } catch (Exception ex) {
            log.warn("Gemini unavailable during onboarding for userId={}: {}", userId, ex.getMessage());
            return new OnboardingSummaryResponse(MIRA_UNAVAILABLE_MSG, List.of());
        }

        // Parse the Gemini response to extract entry requests
        List<OnboardingEntryRequest> parsedEntries = parseOnboardingEntries(geminiResponse, user.getDefaultCurrency());

        if (parsedEntries.isEmpty()) {
            return new OnboardingSummaryResponse(
                    "I understood your message but couldn't identify specific entries to create. " +
                    "Try describing amounts and types, e.g. 'I earn $3000/month and spend $800 on rent'.",
                    List.of()
            );
        }

        // Get or create active FlowSheet for the user
        Optional<FlowSheetEntity> activeSheetOpt =
                flowSheetRepository.findByUserIdAndStatus(userId, "active");

        if (activeSheetOpt.isEmpty()) {
            return new OnboardingSummaryResponse(
                    "Please create a FlowSheet first before I can add entries for you.",
                    List.of()
            );
        }

        FlowSheetEntity sheet = activeSheetOpt.get();
        List<EntryResponse> createdEntries = new ArrayList<>();

        for (OnboardingEntryRequest req : parsedEntries) {
            try {
                UUID categoryId = resolveDefaultCategory(userId, req.entryType(), req.categoryId());
                if (categoryId == null) {
                    log.warn("No default category found for type={} userId={}", req.entryType(), userId);
                    continue;
                }
                CreateEntryRequest createReq = new CreateEntryRequest(
                        sheet.getId(),
                        req.entryType(),
                        categoryId,
                        req.amount(),
                        req.currency() != null ? req.currency() : user.getDefaultCurrency(),
                        req.entryDate() != null ? req.entryDate() : LocalDate.now(),
                        req.note(),
                        null
                );
                EntryResponse created = entryService.createEntry(userId, createReq);
                createdEntries.add(created);
            } catch (Exception ex) {
                log.warn("Failed to create onboarding entry for userId={}: {}", userId, ex.getMessage());
            }
        }

        String summary = createdEntries.isEmpty()
                ? "I couldn't create any entries. Please check your FlowSheet is unlocked and try again."
                : "I've added " + createdEntries.size() + " entr" + (createdEntries.size() == 1 ? "y" : "ies") +
                  " to your FlowSheet. Please review and confirm below.";

        return new OnboardingSummaryResponse(summary, createdEntries);
    }

    private String buildOnboardingExtractionPrompt(String userMessage, String defaultCurrency) {
        return """
                You are a budgeting assistant. Extract financial entries from the user's message.
                For each entry found, output one line in this exact format:
                TYPE|AMOUNT|CURRENCY|NOTE
                Where TYPE is one of: income, expense, savings
                AMOUNT is a positive number
                CURRENCY is a 3-letter code (default: %s if not mentioned)
                NOTE is a short description (or empty)
                
                Only output the data lines, no explanations.
                
                User message: %s
                """.formatted(defaultCurrency, userMessage);
    }

    /**
     * Parses Gemini's structured onboarding response into entry requests.
     * Format per line: TYPE|AMOUNT|CURRENCY|NOTE
     */
    List<OnboardingEntryRequest> parseOnboardingEntries(String geminiResponse, String defaultCurrency) {
        List<OnboardingEntryRequest> entries = new ArrayList<>();
        if (geminiResponse == null || geminiResponse.isBlank()) return entries;

        for (String line : geminiResponse.split("\n")) {
            line = line.trim();
            if (line.isBlank()) continue;
            String[] parts = line.split("\\|", -1);
            if (parts.length < 2) continue;

            String type = parts[0].trim().toLowerCase();
            if (!List.of("income", "expense", "savings").contains(type)) continue;

            BigDecimal amount;
            try {
                amount = new BigDecimal(parts[1].trim());
                if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;
            } catch (NumberFormatException ex) {
                continue;
            }

            String currency = (parts.length > 2 && !parts[2].trim().isBlank())
                    ? parts[2].trim().toUpperCase()
                    : defaultCurrency;
            String note = (parts.length > 3) ? parts[3].trim() : null;

            entries.add(new OnboardingEntryRequest(type, amount, currency, null, LocalDate.now(), note));
        }
        return entries;
    }

    private UUID resolveDefaultCategory(UUID userId, String entryType, UUID explicitCategoryId) {
        if (explicitCategoryId != null) return explicitCategoryId;
        return categoryRepository.findAllByUserIdOrderBySortOrderAsc(userId).stream()
                .filter(c -> entryType.equals(c.getEntryType()))
                .map(CategoryEntity::getId)
                .findFirst()
                .orElse(null);
    }

    private BigDecimal computeBalance(List<EntryEntity> entries) {
        BigDecimal income   = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal savings  = BigDecimal.ZERO;

        for (EntryEntity e : entries) {
            BigDecimal amt = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
            switch (e.getEntryType()) {
                case "income"  -> income   = income.add(amt);
                case "expense" -> expenses = expenses.add(amt);
                case "savings" -> savings  = savings.add(amt);
            }
        }
        return income.subtract(expenses.add(savings));
    }

    /**
     * Computes the sum of non-paused, non-deleted recurring expenses for the user
     * that haven't yet been entered in the current period (approximated as total recurring expenses).
     */
    private BigDecimal computeRemainingRecurringExpenses(UUID userId, FlowSheetEntity sheet) {
        List<RecurringEntryEntity> recurring =
                recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId);

        long periodDays = sheet.getEndDate().toEpochDay() - sheet.getStartDate().toEpochDay() + 1;

        return recurring.stream()
                .filter(r -> "expense".equals(r.getEntryType()))
                .filter(r -> cadenceFitsInPeriod(r.getCadence(), periodDays))
                .map(r -> r.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    private UserEntity getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
    }

    // ── 29.5 Projection intent helpers ───────────────────────────────────────

    /**
     * Detects whether the user's message expresses a projection intent.
     * Matches phrases like "I plan to spend", "I want to budget", "set my budget for", etc.
     */
    boolean isProjectionIntent(String message) {
        if (message == null) return false;
        String lower = message.toLowerCase();
        return lower.contains("plan to spend") || lower.contains("plan to save")
                || lower.contains("plan to earn") || lower.contains("budget for")
                || lower.contains("set my budget") || lower.contains("set a budget")
                || (lower.contains("project") && lower.contains("$"))
                || lower.contains("i want to spend") || lower.contains("i want to save");
    }

    /**
     * Handles a natural-language projection prompt by asking Gemini to extract
     * structured projection data, then calling upsertProjection for each item.
     */
    private MiraQueryResponse handleProjectionQuery(UUID userId, UserEntity user, String message) {
        String extractionPrompt = buildProjectionExtractionPrompt(message, user.getDefaultCurrency());

        String geminiResponse;
        try {
            geminiResponse = chatClient.prompt()
                    .user(extractionPrompt)
                    .call()
                    .content();
        } catch (Exception ex) {
            log.warn("Gemini unavailable for projection query userId={}: {}", userId, ex.getMessage());
            return new MiraQueryResponse(MIRA_UNAVAILABLE_MSG);
        }

        List<ProjectionIntentItem> items = parseProjectionItems(geminiResponse, user.getDefaultCurrency());
        if (items.isEmpty()) {
            return new MiraQueryResponse(callGemini(userId, message));
        }

        Optional<FlowSheetEntity> activeSheetOpt =
                flowSheetRepository.findByUserIdAndStatus(userId, "active");
        if (activeSheetOpt.isEmpty()) {
            return new MiraQueryResponse("You don't have an active FlowSheet. Please create one first.");
        }

        FlowSheetEntity sheet = activeSheetOpt.get();
        int updated = 0;

        for (ProjectionIntentItem item : items) {
            UUID categoryId = resolveDefaultCategory(userId, item.entryType(), null);
            if (categoryId == null) continue;
            try {
                projectionService.upsertProjection(userId, sheet.getId(), categoryId,
                        item.amount(), item.currency());
                updated++;
            } catch (Exception ex) {
                log.warn("Failed to upsert projection for userId={} note={}: {}", userId, item.note(), ex.getMessage());
            }
        }

        String summary = updated == 0
                ? "I understood your projection intent but couldn't update any categories."
                : "I've updated " + updated + " projection" + (updated == 1 ? "" : "s") + " for your active FlowSheet.";
        return new MiraQueryResponse(summary);
    }

    private String buildProjectionExtractionPrompt(String userMessage, String defaultCurrency) {
        return """
                You are a budgeting assistant. Extract budget projection intents from the user's message.
                For each projection found, output one line in this exact format:
                TYPE|AMOUNT|CURRENCY|NOTE
                Where TYPE is one of: income, expense, savings
                AMOUNT is a positive number
                CURRENCY is a 3-letter code (default: %s if not mentioned)
                NOTE is a short category description (e.g. groceries, rent, salary)
                
                Only output the data lines, no explanations.
                
                User message: %s
                """.formatted(defaultCurrency, userMessage);
    }

    List<ProjectionIntentItem> parseProjectionItems(String geminiResponse, String defaultCurrency) {
        List<ProjectionIntentItem> items = new ArrayList<>();
        if (geminiResponse == null || geminiResponse.isBlank()) return items;

        for (String line : geminiResponse.split("\n")) {
            line = line.trim();
            if (line.isBlank()) continue;
            String[] parts = line.split("\\|", -1);
            if (parts.length < 2) continue;

            String type = parts[0].trim().toLowerCase();
            if (!List.of("income", "expense", "savings").contains(type)) continue;

            java.math.BigDecimal amount;
            try {
                amount = new java.math.BigDecimal(parts[1].trim());
                if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;
            } catch (NumberFormatException ex) {
                continue;
            }

            String currency = (parts.length > 2 && !parts[2].trim().isBlank())
                    ? parts[2].trim().toUpperCase() : defaultCurrency;
            String note = (parts.length > 3) ? parts[3].trim() : null;

            items.add(new ProjectionIntentItem(type, amount, currency, note));
        }
        return items;
    }

    record ProjectionIntentItem(String entryType, java.math.BigDecimal amount, String currency, String note) {}
}

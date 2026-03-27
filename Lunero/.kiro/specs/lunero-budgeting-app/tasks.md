# Implementation Tasks: Lunero Budgeting App

## Phase 1 — Web MVP

---

- [x] 1. Monorepo Scaffold
  - [x] 1.1 Initialize Turborepo monorepo with `apps/web`, `apps/mobile` (placeholder), `packages/ui`, `packages/core`, `packages/api-client`, and `backend` directories
  - [x] 1.2 Configure `turbo.json` with build, dev, test, and lint pipelines ensuring `packages/core` and `packages/ui` build before `apps/web`
  - [x] 1.3 Set up root `package.json` with workspace definitions and shared dev dependencies (TypeScript, ESLint, Prettier)
  - [x] 1.4 Configure shared `tsconfig.base.json` with path aliases for all packages
  - [x] 1.5 Add `docker-compose.yml` at repo root with a PostgreSQL 16 service (`lunero_dev` database) for local development
  - [x] 1.6 Add `.env.local.example` in `apps/web` with required variable names (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_BASE_URL`) — never commit `.env.local`
  - [x] 1.7 Add `.env.example` in `backend` with required variable names (`DATABASE_URL`, `CLERK_JWKS_URI`, `GEMINI_API_KEY`, `FX_API_KEY`) — never commit actual secrets

- [x] 2. `packages/core` — Domain Types and Business Logic
  - [x] 2.1 Define TypeScript domain types: `EntryType`, `PeriodType`, `Cadence`, `ThemePreference`, `FlowSheet`, `Entry`, `Category`, `RecurringEntry`, `UserProfile`
  - [x] 2.2 Implement `computeAvailableBalance(entries: Entry[]): number` — pure function, uses `convertedAmount` when present
  - [x] 2.3 Implement period utilities: `isWithinPeriod`, `getNextPeriodRange`, `shouldAutoArchive`
  - [x] 2.4 Implement `getRecurringEntriesForPeriod(recurring, period)` — filters by cadence and pause state
  - [x] 2.5 Implement `validateEntry` and `validateFlowSheet` — return `ValidationResult` with field-level errors
  - [x] 2.6 Write unit tests for all `packages/core` functions (≥80% coverage)
  - [x] 2.7* Write property-based tests using fast-check for `computeAvailableBalance` (Property 1: Available Balance Invariant)

- [x] 3. Backend — Spring Boot Project Setup
  - [x] 3.1 Initialize Spring Boot project with dependencies: Spring Web, Spring Data JPA, Spring Security, Spring AI (Gemini), Spring Cache (Caffeine), Spring Scheduler, Validation, PostgreSQL driver, Flyway
  - [x] 3.2 Configure `application.yml` (base), `application-dev.yml` (local DB via docker-compose, debug logging), and `application-prod.yml` (NeonDB, reduced logging) — all secrets via environment variables, never hardcoded
  - [x] 3.3 Set up Flyway for database migrations
  - [x] 3.4 Create initial migration: all tables from the design schema (`users`, `flow_sheets`, `categories`, `entries`, `recurring_entries`, `dismissed_alerts`, `audit_log`, `notification_tokens`)
  - [x] 3.5 Configure global `@ControllerAdvice` in `common/` package returning `ProblemDetail` (RFC 7807) for all error types

- [x] 4. Backend — Security and Auth
  - [x] 4.1 Implement Clerk JWT validation filter in `security/` — validate against Clerk JWKS endpoint, extract `userId` and set in `SecurityContext`
  - [x] 4.2 Configure Spring Security to require authentication on all `/api/v1/**` endpoints
  - [x] 4.3 Implement RBAC ownership check utility in `common/` — reusable method to verify resource belongs to authenticated user, returns 403 if not
  - [x] 4.4 Implement async `AuditLogService` in `common/` — fire-and-forget writes to `audit_log` on create/update/delete mutations
  - [x] 4.5 Write integration tests for JWT rejection (expired, malformed, missing) — validates Property 24
  - [ ] 4.6* Write property-based tests using jqwik for cross-user data isolation (Property 25: RBAC — No Cross-User Data Access)

- [x] 5. Backend — User Profile
  - [x] 5.1 Create `UserEntity` JPA entity and `UserRepository`
  - [x] 5.2 Implement `UserService`: `getOrCreateUser(clerkUserId)`, `updateProfile(userId, dto)`, `deleteUser(userId)`
  - [x] 5.3 Create `UserController` with `GET /api/v1/profile`, `PATCH /api/v1/profile`, `DELETE /api/v1/profile`
  - [x] 5.4 Implement account deletion — schedule permanent data removal within 30 days (soft-delete flag + scheduled cleanup job)
  - [x] 5.5 Write unit and integration tests for user profile endpoints

- [x] 6. Backend — Category Domain
  - [x] 6.1 Create `CategoryEntity` JPA entity and `CategoryRepository`
  - [x] 6.2 Implement `CategoryService`: `getCategories(userId)`, `createCategory(userId, dto)`, `updateCategory(userId, id, dto)`, `deleteCategory(userId, id)`, `reassignEntries(userId, fromId, toId)`
  - [x] 6.3 Enforce `entryType` immutability in `updateCategory` — reject with 400 if `entryType` is changed
  - [x] 6.4 Enforce deletion guard — return 409 if category has assigned entries and no reassignment target provided
  - [x] 6.5 Create `CategoryController` with full CRUD endpoints and `PATCH /api/v1/categories/:id/reassign`
  - [x] 6.6 Seed default categories on user creation: at least one each for `income`, `expense`, `savings`
  - [x] 6.7 Write unit and integration tests for category service
  - [ ] 6.8* Write property-based tests using jqwik for category type immutability (Property 8) and deletion guard (Property 10)

- [-] 7. Backend — FlowSheet Domain
  - [x] 7.1 Create `FlowSheetEntity` JPA entity and `FlowSheetRepository` with overlap exclusion constraint support
  - [x] 7.2 Implement `FlowSheetService`: `createFlowSheet`, `getActiveFlowSheet`, `getAllFlowSheets`, `getFlowSheetById`, `unlockPastSheet`
  - [x] 7.3 Implement `computeAvailableBalance` in service layer using `convertedAmount` from entries
  - [x] 7.4 Implement `archiveExpiredSheets()` — `@Scheduled` daily job, archives expired sheets, creates next period with recurring entries pre-populated
  - [x] 7.5 Validate no overlapping active FlowSheet date ranges on creation — return 400
  - [x] 7.6 Create `FlowSheetController` with all endpoints from the design
  - [x] 7.7 Write unit and integration tests for FlowSheet service
  - [x] 7.8* Write property-based tests using jqwik for no-overlap invariant (Property 2) and past sheet immutability (Property 3)

- [x] 8. Backend — Entry Domain
  - [x] 8.1 Create `EntryEntity` JPA entity and `EntryRepository`
  - [x] 8.2 Implement `EntryService`: `createEntry`, `updateEntry`, `deleteEntry` (soft-delete) — each recalculates `availableBalance`
  - [x] 8.3 Validate `amount > 0` on create and update — return 400 if violated
  - [x] 8.4 Validate `editLocked` on past FlowSheet mutations — return 422 if sheet is locked
  - [x] 8.5 Create `EntryController` with `GET /api/v1/flowsheets/:id/entries`, `POST /api/v1/entries`, `PATCH /api/v1/entries/:id`, `DELETE /api/v1/entries/:id`
  - [x] 8.6 Write unit and integration tests for entry service
  - [x] 8.7* Write property-based tests using jqwik for available balance invariant (Property 1) and entry amount validation (Property 5)

- [x] 9. Backend — Currency Service
  - [x] 9.1 Implement `CurrencyService` with Caffeine in-memory cache (24h TTL)
  - [x] 9.2 Implement `refreshRates()` — `@Scheduled` every 24h, fetches from `api.frankfurter.app/latest`, updates cache
  - [x] 9.3 Implement `convert(amount, fromCurrency, toCurrency)` — uses cached rates, stores `conversionRate` on entry
  - [x] 9.4 Handle Frankfurter unavailability — retain last known rates, set `ratesStale = true` on `GET /api/v1/currencies` response
  - [x] 9.5 Create `CurrencyController` with `GET /api/v1/currencies` returning supported currencies, rates, and `updatedAt`
  - [x] 9.6 Wire currency conversion into `EntryService.createEntry` and `updateEntry` when `currency != userDefaultCurrency`
  - [x] 9.7 Write unit tests for currency conversion logic
  - [x] 9.8* Write property-based tests using jqwik for conversion round-trip (Property 7) and default currency pre-population (Property 6)

- [x] 10. Backend — Recurring Entries
  - [x] 10.1 Create `RecurringEntryEntity` JPA entity and `RecurringEntryRepository`
  - [x] 10.2 Implement `RecurringEntryService`: `list`, `create`, `update`, `delete`, `pause`, `resume`
  - [x] 10.3 Implement `getRecurringEntriesForPeriod` — filters by cadence, pause state, and period range
  - [x] 10.4 Wire recurring entry auto-population into `FlowSheetService.archiveExpiredSheets` and `createFlowSheet`
  - [x] 10.5 Implement recurring suggestion detection — flag entries with same amount+category in 3+ consecutive periods
  - [x] 10.6 Create `RecurringEntryController` with all endpoints including pause/resume
  - [x] 10.7 Write unit and integration tests for recurring entry service
  - [x] 10.8* Write property-based tests using jqwik for auto-population (Property 11), future-only edits (Property 12), and paused exclusion (Property 13)

- [x] 11. Backend — Trends
  - [x] 11.1 Implement `TrendService`: `getTrends(userId, view, from, to)` — aggregates entries into weekly/monthly/yearly buckets using `convertedAmount`
  - [x] 11.2 Implement `getBreakdown(userId, dataPointId)` — returns all entries contributing to a trend period
  - [x] 11.3 Implement category filter support on trend queries
  - [x] 11.4 Create `TrendController` with `GET /api/v1/trends` and `GET /api/v1/trends/:dataPointId/breakdown`
  - [x] 11.5 Write unit and integration tests for trend aggregation
  - [x] 11.6* Write property-based tests using jqwik for trend aggregation correctness (Property 17), breakdown sum (Property 18), and category filter (Property 19)

- [x] 12. Backend — Mira
  - [x] 12.1 Implement `MiraService.query(userId, message)` — fetches user's active FlowSheet data, builds context prompt, calls Gemini via Spring AI, validates response is grounded
  - [x] 12.2 Implement `checkProactiveAlerts(userId)` — evaluates projected balance (current balance minus remaining recurring expenses), returns overspend alert if projected balance < 0
  - [x] 12.3 Implement `dismissAlert(userId, alertId)` — writes to `dismissed_alerts`, prevents re-surfacing for same period
  - [x] 12.4 Respect `overspendAlerts = false` user setting — return empty alert list when disabled
  - [x] 12.5 Handle Gemini unavailability gracefully — return "Mira is unavailable right now" instead of 500
  - [x] 12.6 Support onboarding mode — when `onboardingComplete = false`, Mira can create entries and projections directly from natural-language prompts and return a structured summary for user review
  - [x] 12.7 Create `MiraController` with `POST /api/v1/ai/query`, `GET /api/v1/ai/alerts`, `POST /api/v1/ai/alerts/:id/dismiss`
  - [x] 12.8 Write unit tests for Mira service (mock Gemini client)
  - [x] 12.9* Write property-based tests using jqwik for data isolation (Property 20), alert trigger (Property 21), dismissed alert (Property 22), and alerts-disabled setting (Property 23)

- [x] 13. Backend — Notifications
  - [x] 13.1 Implement `NotificationService.sendOverspendAlert(userId)` — dispatches Web Push notification to all registered web tokens for user
  - [x] 13.2 Implement failure logging — log delivery failure to `audit_log`, retry once, do not retry further
  - [x] 13.3 Create endpoint to register/deregister notification tokens: `POST /api/v1/notifications/token`, `DELETE /api/v1/notifications/token`
  - [x] 13.4 Wire overspend alert trigger into `EntryService` — fire notification when `availableBalance` goes negative after entry save
  - [x] 13.5 Write unit tests for notification service (mock Web Push client)

- [x] 14. `packages/api-client` — HTTP Layer
  - [x] 14.1 Set up Axios instance with base URL, auth token injection (Clerk JWT), and error interceptor
  - [x] 14.2 Implement `flowSheetApi` — all FlowSheet endpoints
  - [x] 14.3 Implement `entryApi` — all Entry endpoints
  - [x] 14.4 Implement `categoryApi` — all Category endpoints
  - [x] 14.5 Implement `recurringApi` — all Recurring Entry endpoints
  - [x] 14.6 Implement `trendApi` — trend and breakdown endpoints
  - [x] 14.7 Implement `aiCoachApi` — query, alerts, dismiss endpoints
  - [x] 14.8 Implement `profileApi` and `currencyApi`
  - [x] 14.9 Write unit tests for API client error handling and token injection
  - [x] 14.10 Set up React Query client in `apps/web/lib/query-client.ts` — configure stale time, retry policy; React Query hooks in `apps/web/lib/` consume `api-client` for caching and server state (do not put React Query logic inside `packages/api-client`)

- [-] 15. `packages/ui` — Tamagui Setup and Base Components
  - [x] 15.1 Initialize Tamagui in `packages/ui` with theme tokens: warm neutral palette, category colors (`#6B6F69`, `#C86D5A`, `#C4A484`), dark/light themes
  - [x] 15.2 Implement `BalanceDisplay` — large available balance figure with income/expense/savings breakdown
  - [x] 15.3 Implement `EntryRow` — amount, category chip, date, note; accessible with ARIA labels
  - [x] 15.4 Implement `CategoryChip` — colored pill using category type color tokens
  - [x] 15.5 Implement `FlowSheetCard` — period label, available balance, totals summary
  - [x] 15.6 Implement `EntryForm` — modal for create/edit entry with amount, type, category, date, currency, note fields; inline validation
  - [x] 15.7 Implement `OnboardingStep` — step wrapper with progress indicator

- [x] 16. Next.js App — Project Setup
  - [x] 16.1 Initialize Next.js 14 App Router in `apps/web` with TypeScript, Tamagui integration, and Clerk provider
  - [x] 16.2 Configure Clerk middleware for route protection — redirect unauthenticated users to sign-in
  - [x] 16.3 Set up Zustand store with slices for: active FlowSheet, entries, categories, recurring entries, user profile
  - [x] 16.4 Configure dark/light theme toggle using Tamagui theme provider — default to system preference, persist user override to profile
  - [x] 16.5 Implement root layout with navigation shell (sidebar/topbar), theme provider, and Clerk session provider

- [x] 17. Next.js App — Auth Screens
  - [x] 17.1 Implement sign-in page using Clerk `<SignIn />` component
  - [x] 17.2 Implement sign-up page using Clerk `<SignUp />` component with email verification flow
  - [x] 17.3 Implement password reset page using Clerk's built-in flow
  - [x] 17.4 Implement sign-out action that invalidates session and redirects to sign-in

- [x] 18. Next.js App — Onboarding Flow
  - [x] 18.1 Implement onboarding route guard — redirect new users to `/onboarding` before main app access
  - [x] 18.2 Implement step 1: Display Name input
  - [x] 18.3 Implement step 2: Default currency selector (minimum 30 currencies)
  - [x] 18.4 Implement step 3: FlowSheet period preference (weekly/monthly/custom; default monthly)
  - [x] 18.5 Implement step 4: Theme preference (light/dark/system; default system)
  - [x] 18.6 Implement step 5: Notification opt-in for overspend alerts
  - [x] 18.7 Implement step 6: Optional guided budget setup — present choice between manual path and Mira path with a prominent skip option
  - [x] 18.8 Implement manual path — guided form prompting user to add at least one income entry, one expense entry, and optionally a savings entry, with contextual hints at each step
  - [x] 18.9 Implement Mira path — embedded Mira chat interface where user describes their finances in natural language; Mira creates entries and projections, then displays a review/edit summary before confirming
  - [x] 18.10 Allow switching between manual and Mira paths mid-step
  - [x] 18.11 Persist onboarding progress — resume from last incomplete step on re-login
  - [x] 18.12 On completion, save all preferences to user profile via `PATCH /api/v1/profile` and redirect to main app

- [x] 19. Next.js App — Dashboard (Active FlowSheet)
  - [x] 19.1 Implement dashboard page — fetch and display active FlowSheet with `BalanceDisplay` and entry list
  - [x] 19.2 Implement "Add Entry" flow — open `EntryForm` modal, submit to `POST /api/v1/entries`, optimistically update Zustand store
  - [x] 19.3 Implement entry edit — open `EntryForm` pre-filled, submit to `PATCH /api/v1/entries/:id`
  - [x] 19.4 Implement entry delete — confirm dialog, submit to `DELETE /api/v1/entries/:id`, update store
  - [x] 19.5 Display recurring entry suggestion banner when backend flags a pattern (3+ consecutive periods)
  - [x] 19.6 Implement keyboard navigation for all dashboard interactive elements

- [x] 20. Next.js App — Past FlowSheets
  - [x] 20.1 Implement past FlowSheets list page — fetch from `GET /api/v1/flowsheets`, display ordered most recent first
  - [x] 20.2 Implement past FlowSheet detail view — read-only by default with unlock button
  - [x] 20.3 Implement unlock flow — call `POST /api/v1/flowsheets/:id/unlock`, enable entry editing, re-lock on save

- [x] 21. Next.js App — Calendar View
  - [x] 21.1 Implement `CalendarGrid` Tamagui component — date grid for FlowSheet period, colored day indicators using dominant entry type color
  - [x] 21.2 Implement day cell click — display entries for selected date in a side panel or modal
  - [x] 21.3 Implement "Add Entry" from day cell — pre-populate `entryDate` in `EntryForm`
  - [x] 21.4 Implement month navigation controls within FlowSheet period
  - [x] 21.5 Display empty days as neutral cells with no stress-inducing indicators

- [x] 22. Next.js App — Trend Views
  - [x] 22.1 Implement `TrendChart` Tamagui component — bar/line chart for weekly/monthly/yearly data using category colors
  - [x] 22.2 Implement trend page with view switcher (weekly/monthly/yearly)
  - [x] 22.3 Implement data point drill-down — click period to show entry breakdown
  - [x] 22.4 Implement category filter on trend view
  - [x] 22.5 Handle insufficient data state — display available data with "more data needed" message when fewer than 2 periods exist

- [x] 23. Next.js App — Categories Management
  - [x] 23.1 Implement categories settings page — list categories grouped by type with type-color indicators
  - [x] 23.2 Implement create category form — name and type selector; type locked after creation
  - [x] 23.3 Implement rename category inline edit
  - [x] 23.4 Implement delete category flow — show reassign or discard dialog when entries exist
  - [x] 23.5 Implement drag-to-reorder within type group

- [x] 24. Next.js App — Recurring Entries
  - [x] 24.1 Implement recurring entries list page — grouped by type, showing cadence and amount
  - [x] 24.2 Implement create/edit recurring entry form — amount, type, category, cadence, note
  - [x] 24.3 Implement pause/resume toggle per recurring entry
  - [x] 24.4 Implement delete recurring entry with confirmation

- [x] 25. Next.js App — Mira
  - [x] 25.1 Implement `AICoachPanel` Tamagui component — chat-style interface with message input and response display
  - [x] 25.2 Implement query submission — POST to `/api/v1/ai/query`, display response; show loading state during request
  - [x] 25.3 Implement proactive alerts display — fetch from `GET /api/v1/ai/alerts`, show dismissible alert cards
  - [x] 25.4 Implement alert dismiss — call `POST /api/v1/ai/alerts/:id/dismiss`, remove from UI
  - [x] 25.5 Handle Mira unavailability — display "Coach is unavailable right now" inline, do not block other app functions

- [x] 26. Next.js App — Profile and Settings
  - [x] 26.1 Implement profile settings page — display name, email, password change (via Clerk re-auth), default currency, FlowSheet period, theme, notification preferences
  - [x] 26.2 Implement theme toggle — persist to user profile, apply immediately without restart
  - [x] 26.3 Implement notification preferences toggle — overspend alerts opt-in/out
  - [x] 26.4 Implement account deletion flow — confirmation dialog, call `DELETE /api/v1/profile`
  - [x] 26.5 Implement Tutorial re-access link from settings and help section

- [x] 27. Next.js App — Tutorial
  - [x] 27.1 Implement tutorial overlay/walkthrough — covers FlowSheet navigation, entry capture, Calendar View, Mira
  - [x] 27.2 Auto-launch tutorial on first login after onboarding completion
  - [x] 27.3 Implement skip button — record tutorial as skipped, do not auto-launch again
  - [x] 27.4 On completion, record `tutorialComplete = true` via `PATCH /api/v1/profile`

- [x] 28. Web Push Notifications
  - [x] 28.1 Implement service worker registration in Next.js app for Web Push
  - [x] 28.2 Implement notification permission request flow — triggered from onboarding and settings
  - [x] 28.3 Register push token with backend via `POST /api/v1/notifications/token` after permission granted
  - [x] 28.4 Handle notification click — open app and navigate to active FlowSheet

- [x] 29. Backend — Budget Projections
  - [x] 29.1 Create `CategoryProjectionEntity` JPA entity and `CategoryProjectionRepository` with unique constraint on `(flow_sheet_id, category_id)`
  - [x] 29.2 Implement `ProjectionService`: `getProjections(userId, flowSheetId)`, `upsertProjection(userId, flowSheetId, categoryId, amount)`, `deleteProjection(userId, flowSheetId, categoryId)`, `getProjectionSummary(userId, flowSheetId)`
  - [x] 29.3 Implement projection carryover in `FlowSheetService.archiveExpiredSheets` — copy projections from archived sheet to new sheet as defaults
  - [x] 29.4 Implement `getProjectionSummary` — aggregates projected vs actual at category, entry-type, and FlowSheet levels using `convertedAmount` for actuals; computes `statusColor` per row: category natural color when actual < projected, warm neutral when actual = projected, `#C86D5A` when actual > projected
  - [x] 29.5 Wire Mira to handle natural-language projection prompts (e.g. "I plan to spend $500 on groceries") — parse intent and call `upsertProjection`
  - [x] 29.6 Create `ProjectionController` with `GET /api/v1/flowsheets/:id/projections`, `PUT /api/v1/flowsheets/:id/projections/:categoryId`, `DELETE /api/v1/flowsheets/:id/projections/:categoryId`, `GET /api/v1/flowsheets/:id/projections/summary`
  - [x] 29.7 Add projection cleanup to `CategoryService.deleteCategory` — remove all projections for the deleted category
  - [x] 29.8 Write unit and integration tests for projection service
  - [x] 29.9* Write property-based tests using jqwik for projection amount validation (Property 37), balance unaffected by projections (Property 38), summary aggregation (Property 39), carryover (Property 40), and status color correctness (Property 41)

- [x] 30. `packages/api-client` — Projections API
  - [x] 30.1 Implement `projectionApi` — `getProjections`, `upsertProjection`, `deleteProjection`, `getProjectionSummary`

- [x] 31. Next.js App — Budget Projections UI
  - [x] 31.1 Implement `ProjectionBar` Tamagui component — shows projected vs actual as a progress-style bar; color reflects status: category natural color (under), warm neutral (at), soft red `#C86D5A` (over)
  - [x] 31.2 Implement `ProjectionSummaryPanel` — projected vs actual breakdown at entry-type level (income/expense/savings) and FlowSheet overall
  - [x] 31.3 Add projection input to the category view — inline editable projected amount per category with validation (must be > 0)
  - [x] 31.4 Display projected vs actual comparison on the active FlowSheet dashboard at category level and entry-type level
  - [x] 31.5 On new FlowSheet creation, pre-fill projections carried over from previous period and allow user to adjust before confirming
  - [x] 31.6 Ensure projections are visible but clearly separated from Available Balance — Available Balance must always reflect actuals only

- [x] 32. Accessibility and Localization
  - [x] 32.1 Audit all primary flows for keyboard navigation — ensure all interactive elements are reachable and operable via keyboard
  - [x] 32.2 Add ARIA labels and roles to all icon-only buttons, form fields, and dynamic content regions
  - [x] 32.3 Implement locale-aware date formatting using `Intl.DateTimeFormat` — store UTC, display in device locale
  - [x] 32.4 Implement locale-aware number and currency formatting using `Intl.NumberFormat`
  - [x] 32.5 Implement locale-aware sorting for category and entry lists

- [x] 33. Final Integration and Checkpoint
  - [x] 33.1 End-to-end test: new user registration → onboarding → create FlowSheet → add entries → verify available balance
  - [x] 33.2 End-to-end test: FlowSheet auto-archive → new period created with recurring entries and projections carried over
  - [x] 33.3 End-to-end test: multi-currency entry → verify converted amount in balance calculation
  - [x] 33.4 End-to-end test: Mira natural-language projection prompt → verify category projection updated
  - [x] 33.5 End-to-end test: Mira query → verify response is grounded in user data only
  - [x] 33.6 Verify all correctness properties pass (run property-based test suites)
  - [x] 33.7 Performance check: dashboard load <2s, key API endpoints <200ms median
  - [x] 33.8 Security review: confirm no cross-user data leakage, all endpoints require valid JWT, audit log populated

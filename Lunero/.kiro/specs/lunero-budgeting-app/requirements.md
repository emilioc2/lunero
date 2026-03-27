# Requirements Document

## Introduction

Lunero is a calm, nature-inspired personal budgeting app targeting individuals who want effortless manual budget tracking. The tagline is "A calmer way to budget." The central budgeting unit is a FlowSheet — a period-based budget (weekly, monthly, or custom) that auto-archives at period end and resets fresh. The core formula is: Available Balance = Total Income − (Total Expenses + Total Savings). Lunero is intentionally non-banking in aesthetic, using warm neutrals and an editorial visual language.

**Phase 1** targets the Web platform only (Next.js). **Phase 2** will extend to iOS and Android mobile apps (React Native / Expo).

---

## Glossary

- **FlowSheet**: The active budget container for a chosen time period (weekly, monthly, or custom). Holds all income, expense, and savings entries for that period.
- **Available_Balance**: The computed value: Total Income − (Total Expenses + Total Savings). Never labeled "remaining" or "leftover."
- **Entry**: A single financial record of type `income`, `expense`, or `savings`, belonging to a FlowSheet.
- **Recurring_Entry**: An entry marked to repeat automatically on a defined cadence (daily, weekly, monthly, etc.).
- **Category**: A user-defined or default label assigned to an Entry. Category type (Income / Expense / Savings) is immutable after creation.
- **Past_FlowSheet**: An archived, completed FlowSheet. Read-only by default; can be unlocked for editing.
- **Mira**: The in-app AI budgeting coach that responds to natural-language queries, sets projected amounts, and sends proactive alerts. Named Mira throughout the UI.
- **App**: The Lunero web application (Next.js). Phase 2 will add iOS and Android mobile apps.
- **Backend**: The server-side API and services powering the App.
- **Auth_Service**: The authentication subsystem handling identity and session management.
- **Sync_Engine**: The subsystem responsible for offline queuing and cross-device data synchronization.
- **Currency_Service**: The backend subsystem that handles multi-currency conversion.
- **Trend_View**: A visual summary of spending/income/savings patterns over weekly, monthly, or yearly intervals.
- **Calendar_View**: A date-grid view showing daily entry breakdowns within a FlowSheet period.
- **Onboarding_Flow**: The guided setup sequence presented to a new user after account creation, capturing display name, default currency, FlowSheet period preference, and notification preferences.
- **Display_Name**: The user's chosen name shown in the app UI. Not required to be unique across the dataset.
- **Tutorial**: The interactive walkthrough of core app features shown on first login, re-accessible from settings.
- **Notification_Service**: The subsystem responsible for delivering web push notifications. Phase 2 will add APNs (iOS) and FCM (Android).

---

## Requirements

### Requirement 1: FlowSheet Creation and Management

**User Story:** As a user, I want to create and manage FlowSheets for different time periods, so that I can organize my budget by week, month, or a custom range.

#### Acceptance Criteria

1. THE App SHALL allow a user to create a FlowSheet with a period type of weekly, monthly, or custom date range.
2. THE App SHALL display the Available_Balance on the active FlowSheet dashboard, computed as Total Income − (Total Expenses + Total Savings).
3. WHEN a FlowSheet period ends, THE App SHALL automatically archive the FlowSheet as a Past_FlowSheet and create a new active FlowSheet for the next period.
4. WHEN a user views a Past_FlowSheet, THE App SHALL display it in read-only mode by default.
5. WHEN a user explicitly requests to edit a Past_FlowSheet, THE App SHALL unlock it for editing and re-lock it upon save.
6. THE App SHALL display all Past_FlowSheets in a list ordered by most recent period first.
7. IF a FlowSheet period type is custom, THEN THE App SHALL require the user to provide both a start date and an end date before saving.
8. THE App SHALL prevent a user from creating two active FlowSheets with overlapping date ranges.

---

### Requirement 2: Manual Entry Capture

**User Story:** As a user, I want to manually add income, expense, and savings entries to my FlowSheet, so that I can track exactly where my money comes from and goes.

#### Acceptance Criteria

1. THE App SHALL allow a user to create an Entry with a type of `income`, `expense`, or `savings`.
2. THE App SHALL require each Entry to have an amount, a date, and a Category before saving.
3. THE App SHALL allow a user to add an optional note to any Entry.
4. WHEN a user saves an Entry, THE App SHALL immediately recalculate and display the updated Available_Balance on the active FlowSheet.
5. THE App SHALL allow a user to edit any field of an Entry in the active FlowSheet.
6. THE App SHALL allow a user to delete an Entry from the active FlowSheet.
7. WHEN a user deletes an Entry, THE App SHALL recalculate and display the updated Available_Balance.
8. IF an Entry amount is zero or negative, THEN THE App SHALL display a validation error and prevent saving.
9. WHEN a user creates a new Entry, THE App SHALL pre-populate the currency field with the user's default currency set during the Onboarding_Flow; THE App SHALL allow the user to override the currency for that individual Entry.
10. WHEN the Entry currency differs from the user's default currency, THE Backend SHALL convert the amount server-side before including it in Available_Balance calculations.

---

### Requirement 3: Category Management

**User Story:** As a user, I want to create and manage custom categories for my entries, so that I can organize my budget in a way that reflects my actual life.

#### Acceptance Criteria

1. THE App SHALL provide default categories for each entry type: at least one default for `income`, `expense`, and `savings`.
2. THE App SHALL allow a user to create a custom Category with a name and an entry type (`income`, `expense`, or `savings`).
3. THE App SHALL display Income categories using the color `#6B6F69`, Expense categories using `#C86D5A`, and Savings categories using `#C4A484`.
4. THE App SHALL prevent a user from changing the entry type of a Category after it has been created.
5. THE App SHALL allow a user to rename a custom Category.
6. THE App SHALL allow a user to delete a custom Category that has no entries assigned to it.
7. IF a user attempts to delete a Category that has entries assigned to it, THEN THE App SHALL prompt the user to either reassign those entries to another Category or discard all entries in the Category before deletion proceeds.
8. THE App SHALL allow a user to reorder categories within their type group.

---

### Requirement 4: Recurring Entries

**User Story:** As a user, I want to mark entries as recurring, so that regular income and expenses are automatically added to each new FlowSheet without manual re-entry.

#### Acceptance Criteria

1. THE App SHALL allow a user to mark any Entry as a Recurring_Entry with a cadence of daily, weekly, bi-weekly, or monthly.
2. WHEN a new FlowSheet is created, THE App SHALL automatically populate it with all Recurring_Entries whose cadence falls within the new period.
3. THE App SHALL allow a user to view a list of all active Recurring_Entries.
4. THE App SHALL allow a user to edit the amount, category, or cadence of a Recurring_Entry; WHEN edited, THE App SHALL apply the change to future FlowSheets only.
5. THE App SHALL allow a user to pause a Recurring_Entry; WHILE a Recurring_Entry is paused, THE App SHALL not add it to new FlowSheets.
6. THE App SHALL allow a user to delete a Recurring_Entry; WHEN deleted, THE App SHALL remove it from all future FlowSheets but retain it in Past_FlowSheets.
7. WHEN the App detects that a user has manually entered the same amount and category three or more consecutive periods, THE App SHALL suggest converting that entry to a Recurring_Entry.

---

### Requirement 5: Calendar View

**User Story:** As a user, I want to see a calendar view of my FlowSheet, so that I can understand my spending and income patterns day by day.

#### Acceptance Criteria

1. THE App SHALL display a Calendar_View for the active FlowSheet showing each day of the period as a cell.
2. WHEN a user taps or clicks a day cell, THE App SHALL display all entries logged on that date.
3. THE App SHALL visually indicate days that have entries using the category color of the dominant entry type for that day.
4. THE App SHALL display days with no entries as neutral/empty cells without stress-inducing visual indicators.
5. THE App SHALL allow a user to add a new Entry directly from a day cell in the Calendar_View.
6. THE App SHALL allow a user to navigate between months within a FlowSheet period using forward and back controls.

---

### Requirement 6: Trend Views

**User Story:** As a user, I want to see trend summaries of my income, expenses, and savings over time, so that I can understand my financial patterns and make better decisions.

#### Acceptance Criteria

1. THE App SHALL provide a weekly Trend_View showing totals for income, expenses, and savings for each week in the selected range.
2. THE App SHALL provide a monthly Trend_View showing totals for income, expenses, and savings for each month in the selected range.
3. THE App SHALL provide a yearly Trend_View showing totals for income, expenses, and savings for each year available in the user's history.
4. THE App SHALL display Trend_View data using the defined category colors: `#6B6F69` for income, `#C86D5A` for expenses, `#C4A484` for savings.
5. WHEN a user selects a data point in a Trend_View, THE App SHALL display the breakdown of entries contributing to that data point.
6. THE App SHALL allow a user to filter Trend_View data by Category.
7. WHEN a user has fewer than two periods of data, THE App SHALL display a Trend_View with available data and indicate that more data is needed for meaningful trends.

---

### Requirement 7: AI Budgeting Coach

**User Story:** As a user, I want an AI coach that understands my budget and can answer questions and give proactive suggestions, so that I can make smarter financial decisions without stress.

#### Acceptance Criteria

1. THE App SHALL provide an Mira interface where a user can submit natural-language queries about their budget.
2. WHEN a user submits a query, THE Mira SHALL respond with an answer grounded in the user's actual FlowSheet data within 5 seconds under normal network conditions.
3. THE Mira SHALL proactively alert a user when their Available_Balance is projected to reach zero before the end of the current FlowSheet period, based on recurring entries and historical patterns.
4. THE Mira SHALL suggest entry capture when it detects a pattern of missing recurring entries for the current period.
5. THE App SHALL allow a user to dismiss any Mira alert; WHEN dismissed, THE App SHALL not re-surface the same alert for the same period.
6. THE Mira SHALL only access the data of the authenticated user and SHALL not share data between users.
7. IF the Mira cannot generate a confident response to a query, THEN THE Mira SHALL inform the user that it cannot answer rather than fabricating a response.
8. THE App SHALL allow a user to disable Mira proactive alerts in settings.

---

### Requirement 8: User Accounts and Authentication

**User Story:** As a user, I want to create an account and sign in securely, so that my budget data is private and accessible across all my devices.

#### Acceptance Criteria

1. THE Auth_Service SHALL allow a user to register with an email address and password.
2. THE Auth_Service SHALL allow a user to sign in using Google OAuth.
3. THE Auth_Service SHALL allow a user to sign in using Apple Sign-In. *(Phase 2 — Apple Sign-In requires a paid Apple Developer account; may be deferred to mobile launch)*
4. WHEN a user registers with email and password, THE Auth_Service SHALL hash the password using bcrypt or argon2 before storing it.
5. THE Auth_Service SHALL require email verification before a new email/password account can access budget data.
6. THE Auth_Service SHALL allow a user to reset their password via a time-limited email link.
7. WHEN a user signs in, THE Auth_Service SHALL issue a session token valid for a configurable duration.
8. IF a session token is expired or invalid, THEN THE Auth_Service SHALL reject the request and prompt the user to sign in again.
9. THE Auth_Service SHALL enforce HTTPS for all authentication endpoints.
10. THE App SHALL allow a user to sign out, which SHALL invalidate the current session token.
11. THE App SHALL allow a user to delete their account; WHEN deleted, THE Backend SHALL permanently remove all associated FlowSheet and entry data within 30 days.

---

### Requirement 9: Cross-Device Sync (Phase 2)

**User Story:** As a user, I want my budget data to stay in sync across all my devices, so that I can capture entries on my phone and review them on the web without inconsistency.

> Phase 1 (Web): Data is always fetched from the server; no offline queue required. Phase 2 will add offline-first support and mobile sync.

#### Acceptance Criteria

1. THE Sync_Engine SHALL synchronize FlowSheet and entry data across all authenticated devices within 5 seconds of a change under normal network conditions.
2. WHILE a device is offline, THE App SHALL allow a user to create, edit, and delete entries; THE Sync_Engine SHALL queue these mutations locally. *(Phase 2 — mobile only)*
3. WHEN a device reconnects to the network, THE Sync_Engine SHALL automatically upload all queued mutations to the Backend. *(Phase 2 — mobile only)*
4. WHEN two devices have conflicting edits to the same Entry, THE Sync_Engine SHALL apply a last-write-wins resolution strategy and notify the user of the conflict. *(Phase 2)*
5. THE App SHALL display a visual indicator when the device is operating in offline mode. *(Phase 2 — mobile only)*
6. THE App SHALL display a visual indicator when a sync is in progress. *(Phase 2 — mobile only)*

---

### Requirement 10: Multi-Currency Support

**User Story:** As a user, I want to log entries in different currencies and see my budget in my preferred currency, so that I can track finances across currencies without manual conversion.

#### Acceptance Criteria

1. THE App SHALL allow a user to set a default display currency in account settings; this setting SHALL also serve as the default currency pre-populated on all new Entries.
2. THE App SHALL allow a user to assign any supported currency to an individual Entry, overriding the default for that Entry.
3. WHEN an Entry's currency differs from the user's default currency, THE Currency_Service SHALL convert the Entry amount to the default currency using current exchange rates before including it in Available_Balance calculations.
4. THE App SHALL display the original Entry currency and amount alongside the converted amount.
5. THE Currency_Service SHALL update exchange rates at least once every 24 hours.
6. IF exchange rate data is unavailable, THEN THE App SHALL display the unconverted amount with a warning indicator and exclude it from Available_Balance until rates are restored.
7. THE App SHALL support a minimum of 30 commonly used currencies at launch.

---

### Requirement 11: Dark Mode

**User Story:** As a user, I want a dark mode option, so that I can use the app comfortably in low-light environments.

#### Acceptance Criteria

1. THE App SHALL provide a dark mode theme at launch on Web. iOS and Android dark mode support will be added in Phase 2.
2. THE App SHALL allow a user to toggle between light and dark mode in settings.
3. WHERE the device operating system provides a system-level dark mode preference, THE App SHALL respect that preference by default.
4. WHEN a user explicitly sets a theme preference in the App, THE App SHALL use that preference and override the system setting.
5. THE App SHALL maintain WCAG AA contrast ratios for all text and interactive elements in both light and dark mode.

---

### Requirement 12: Performance

**User Story:** As a user, I want the app to load and respond quickly, so that capturing entries and checking my budget feels effortless.

#### Acceptance Criteria

1. THE App SHALL load the active FlowSheet dashboard within 2 seconds on a broadband or typical 4G connection.
2. THE Backend SHALL respond to key API endpoints (entry creation, FlowSheet fetch, Available_Balance calculation) with a median latency of less than 200ms.
3. THE Backend SHALL maintain 99.5% uptime on a monthly basis.
4. THE App SHALL render Trend_View charts without blocking the main UI thread.
5. WHEN a user navigates between screens, THE App SHALL display the new screen within 300ms on a device meeting minimum supported hardware specifications.

---

### Requirement 13: Security and Privacy

**User Story:** As a user, I want my financial data to be secure and private, so that I can trust Lunero with sensitive information.

#### Acceptance Criteria

1. THE Backend SHALL enforce HTTPS for all client-server communication.
2. THE Backend SHALL implement role-based access control so that a user can only read and write their own data.
3. THE Backend SHALL maintain audit logs of all data mutations (create, update, delete) for a minimum of 90 days.
4. THE Backend SHALL not expose another user's data through any API endpoint.
5. THE App SHALL not store unencrypted sensitive data (passwords, session tokens) in local device storage.
6. WHEN a security vulnerability is identified in a dependency, THE Backend SHALL apply a patch within 14 days of a fix being available.

---

### Requirement 14: Accessibility

**User Story:** As a user with accessibility needs, I want the app to support assistive technologies, so that I can use Lunero regardless of my abilities.

#### Acceptance Criteria

1. THE App SHALL provide keyboard navigation support for all interactive elements on the Web platform.
2. THE App SHALL provide screen reader support using ARIA on Web for all primary user flows. VoiceOver (iOS) and TalkBack (Android) support will be added in Phase 2.
3. THE App SHALL maintain WCAG AA contrast ratios for all text and UI elements.
4. THE App SHALL provide text labels for all icon-only buttons and controls.
5. THE App SHALL support dynamic text size adjustments on iOS and Android without breaking layout. *(Phase 2 — mobile only)*

---

### Requirement 15: Localization Readiness

**User Story:** As a user in any region, I want dates, numbers, and currencies to display in my local format, so that the app feels native to my locale.

#### Acceptance Criteria

1. THE App SHALL format dates according to the user's device locale settings.
2. THE App SHALL format numbers and currency amounts according to the user's device locale settings.
3. THE App SHALL store all dates in UTC internally and convert to local time for display.
4. THE App SHALL support locale-aware sorting for category and entry lists.
5. WHERE a locale uses right-to-left text direction, THE App SHALL render layouts in right-to-left order.

---

### Requirement 16: Onboarding

**User Story:** As a new user, I want to be guided through a setup flow after creating my account, so that the app is configured to my preferences before I start budgeting.

#### Acceptance Criteria

1. WHEN a user creates a new account, THE App SHALL present the Onboarding_Flow before allowing access to the main app.
2. THE Onboarding_Flow SHALL require the user to provide a Display_Name; THE App SHALL not require the Display_Name to be unique across the dataset.
3. THE Onboarding_Flow SHALL require the user to select a default currency from the list of supported currencies; THE App SHALL use this selection as the default currency pre-populated on all new Entries.
4. THE Onboarding_Flow SHALL require the user to select a FlowSheet period preference of weekly, monthly, or custom; THE App SHALL pre-select monthly as the default.
5. THE App SHALL fix the week start day as Sunday; THE Onboarding_Flow SHALL not present week start day as a user-configurable option.
6. THE App SHALL fix the date display format as DD/MM/YYYY; THE Onboarding_Flow SHALL not present date format as a user-configurable option.
7. THE Onboarding_Flow SHALL present a theme preference step defaulting to the system setting; THE App SHALL allow the user to select light, dark, or system at this step.
8. THE Onboarding_Flow SHALL present a notification preference opt-in for overspend alerts; THE App SHALL never send AI coach notifications outside the app — Mira alerts are surfaced exclusively within the in-app interface.
9. WHEN a user completes the Onboarding_Flow, THE App SHALL save all captured preferences to the user's profile and proceed to the main app.
10. IF a user exits the Onboarding_Flow before completing it, THEN THE App SHALL resume the Onboarding_Flow from the last incomplete step on next login.

---

### Requirement 17: In-App Tutorial

**User Story:** As a new user, I want an interactive tutorial on first login, so that I can learn the core app flows without having to explore blindly.

#### Acceptance Criteria

1. WHEN a user logs in for the first time after completing the Onboarding_Flow, THE App SHALL automatically launch the Tutorial.
2. THE Tutorial SHALL cover the following core flows: FlowSheet creation and navigation, manual entry capture, Calendar_View, and Mira.
3. THE App SHALL allow a user to skip the Tutorial at any point during the walkthrough.
4. THE App SHALL allow a user to re-access the Tutorial at any time from the settings menu and from the help section.
5. WHEN a user completes or skips the Tutorial, THE App SHALL record that state so the Tutorial is not automatically launched on subsequent logins.
6. WHEN a user re-accesses the Tutorial from settings or help, THE App SHALL start the Tutorial from the beginning.

---

### Requirement 18: Profile Management

**User Story:** As a user, I want to update my profile and preferences at any time from settings, so that I can keep my account details and app configuration current.

#### Acceptance Criteria

1. THE App SHALL allow a user to update their Display_Name from the profile settings screen at any time.
2. THE App SHALL allow a user to update their email address from the profile settings screen; WHEN a user requests an email address change, THE Auth_Service SHALL require re-authentication before applying the change.
3. THE App SHALL allow a user to update their password from the profile settings screen; WHEN a user requests a password change, THE Auth_Service SHALL require re-authentication before applying the change.
4. THE App SHALL allow a user to update their default currency from the profile settings screen; WHEN updated, THE App SHALL use the new default currency as the pre-populated currency on all subsequently created Entries.
5. THE App SHALL allow a user to update their FlowSheet period preference from the profile settings screen.
6. THE App SHALL allow a user to update their notification preferences (overspend alerts) from the profile settings screen.
7. THE App SHALL allow a user to update their theme preference (light, dark, or system) from the profile settings screen; THE App SHALL default the theme preference to the system setting.
8. WHEN a user saves a profile change, THE App SHALL apply the updated preference immediately without requiring a restart.

---

### Requirement 19: Notifications

**User Story:** As a user, I want to receive a notification when I overspend, so that I can stay on top of my budget without having to check the app constantly.

#### Acceptance Criteria

1. WHEN the Available_Balance of the active FlowSheet becomes negative, THE Notification_Service SHALL send an overspend alert notification to the user on all platforms where the user has opted in.
2. THE App SHALL never send Mira alerts as external notifications; all Mira proactive alerts SHALL be surfaced exclusively within the in-app interface.
3. THE App SHALL allow a user to opt in or opt out of overspend alert notifications.
4. THE Notification_Service SHALL deliver notifications on Web using the Web Push protocol. APNs (iOS) and FCM (Android) support will be added in Phase 2.
5. WHEN a user has opted out of overspend alerts, THE Notification_Service SHALL not send overspend notifications to that user.
6. IF a notification cannot be delivered due to a platform error, THEN THE Notification_Service SHALL log the failure and not retry more than once within the same event window.

---

### Requirement 21: Guided Initial Budget Setup (Onboarding)

**User Story:** As a new user completing onboarding, I want to be guided through setting up my first entries and projected amounts, so that my FlowSheet has real data from day one and I understand how the app works.

#### Acceptance Criteria

1. AFTER completing the Onboarding_Flow steps (display name, currency, period, theme, notifications), THE App SHALL present an optional guided budget setup step before proceeding to the main app.
2. THE App SHALL allow a user to skip the guided budget setup step at any time; WHEN skipped, THE App SHALL proceed directly to the main app with an empty FlowSheet.
3. THE guided setup step SHALL offer two paths for adding initial entries and projections:
   - **Manual path**: A guided form flow prompting the user to add at least one income entry, one expense entry, and optionally a savings entry, with contextual hints and examples at each step.
   - **Mira path**: A Mira chat interface where the user can describe their financial situation in natural language (e.g. "I earn $3000/month, I spend $800 on rent and $400 on groceries") and Mira will create the corresponding entries and projected amounts on their behalf.
4. THE App SHALL allow a user to switch between the manual path and the Mira path at any point during the guided setup step.
5. WHEN Mira creates entries or projections from a natural-language prompt during onboarding, THE App SHALL display a summary of what was created and allow the user to review, edit, or remove individual items before confirming.
6. WHEN a user completes or skips the guided budget setup step, THE App SHALL proceed to the main app dashboard.
7. THE guided budget setup step SHALL NOT be re-shown on subsequent logins; it is a one-time onboarding step.

**User Story:** As a user, I want to set projected spending amounts per category for each FlowSheet period, so that I can compare my planned budget against what I actually spent.

### Requirement 22: Category Budget Projections

**User Story:** As a user, I want to set projected spending amounts per category for each FlowSheet period, so that I can compare my planned budget against what I actually spent.

#### Acceptance Criteria
2. WHEN a new FlowSheet is created, THE App SHALL carry over the projected amounts from the most recent previous FlowSheet as default projections for the new period; THE App SHALL allow the user to adjust these defaults before or during the period.
3. THE Mira SHALL accept natural-language prompts to set projected amounts (e.g. "I plan to spend $500 on groceries this month"); WHEN such a prompt is received, THE Mira SHALL update the corresponding Category projection for the active FlowSheet.
4. THE App SHALL display a projected vs. actual comparison at the Category level, showing the projected amount and the actual total of entries in that Category for the period.
5. THE App SHALL display a projected vs. actual comparison at the entry type level, showing the projected total and the actual total for each of `income`, `expense`, and `savings`.
6. THE App SHALL display a projected vs. actual comparison at the FlowSheet level, showing the overall projected totals and the overall actual totals for the period.
7. THE App SHALL calculate Available_Balance using actual entry amounts only; projected amounts SHALL NOT affect the Available_Balance calculation.
8. THE Trend_View SHALL display actual amounts only; projected amounts SHALL NOT be included in trend chart data.
9. IF a projected amount is set to zero or a negative value, THEN THE App SHALL display a validation error and prevent saving.
10. WHEN a Category is deleted, THE App SHALL also remove any projected amounts associated with that Category for all FlowSheet periods.
11. THE App SHALL indicate the projection status of each Category using the following color scheme:
    - WHEN actual amount is less than projected amount, THE App SHALL display the projection indicator using the category's natural type color (`#6B6F69` for income, `#C86D5A` for expense, `#C4A484` for savings).
    - WHEN actual amount equals the projected amount, THE App SHALL display the projection indicator using a warm neutral/muted color.
    - WHEN actual amount exceeds the projected amount, THE App SHALL display the projection indicator using soft red (`#C86D5A`), regardless of category type.
12. THE App SHALL apply the same three-state color scheme at the entry type level and FlowSheet level projection summaries.

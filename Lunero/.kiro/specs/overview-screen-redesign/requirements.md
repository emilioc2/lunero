# Requirements Document

## Introduction

This document captures the requirements for a comprehensive design overhaul of Lunero's primary screens. All redesigned screens share a unified visual language derived from Figma prototypes, ensuring consistent typography, color palette, card styling, spacing, and layout patterns across the application.

The overhaul covers seven areas:

1. **Overview Screen Redesign (Requirements 1–10):** Redesign the current Dashboard screen and rename it to "Overview." The redesign replaces the sidebar navigation with a horizontal top tab bar, introduces a new card-based layout with summary cards, an active FlowSheet progress card, a monthly overview bar chart, and a recent transactions list. All existing data hooks and backend integrations are preserved.

2. **Tutorial Overlay Redesign (Requirements 11–13):** The six-step Tutorial_Overlay is redesigned to match the new Overview aesthetic. The overlay adopts a segmented progress bar, emoji-decorated titles, bullet-list step content with colored checkmarks, and updated navigation controls while preserving the existing text copy and auto-launch behavior.

3. **FlowSheets Page Redesign (Requirements 15–16):** The current "Past FlowSheets" page is redesigned into a unified "FlowSheets" list page showing both active and archived sheets in a 2-column card grid. The FlowSheet detail page is redesigned with summary cards, category-level income/expense breakdowns with progress bars, and a back-navigation header.

4. **Cross-Cutting Design Consistency (Requirement 14):** A cross-cutting requirement ensures all redesigned screens use the same fonts, colors, spacing, card styles, and layout patterns as defined in the Figma prototypes, maintaining a cohesive visual identity across the entire application.

5. **Calendar Page Redesign (Requirement 17):** The existing Calendar page is redesigned as "Transaction Calendar" with a full-width calendar grid, colored transaction dots (green for income, red for expense), today-highlight, and a clean card container matching the new design system.

6. **Transactions Page (Requirement 18):** A new dedicated "All Transactions" page is introduced, providing a full-width list of all entries with colored type indicators, category badges, dates, signed amounts, and delete actions. Accessible via the "Transactions" tab in the Top_Tab_Bar.

7. **Analytics Page Redesign (Requirements 19–21):** The current "Trends" page is renamed to "Analytics" with a route change. The redesigned page features a 2-column chart layout with a "Spending by Category" donut/pie chart on the left and the "Monthly Overview" bar chart on the right, replacing the previous weekly/monthly/yearly switcher as the primary view.

8. **Mira Floating Popup Chat (Requirement 22):** Mira is converted from a dedicated full-page route into a floating popup chat widget accessible from any page via a floating action button in the bottom-right corner. The popup supports minimize and close controls, preserves all existing chat functionality, and the "Mira" tab is removed from the Top_Tab_Bar.

## Glossary

- **Overview_Screen**: The primary landing page of the authenticated app, formerly named "Dashboard," displaying the user's current balance, summary cards, active FlowSheet status, monthly chart, and recent transactions.
- **Top_Tab_Bar**: A horizontal navigation bar rendered at the top of the app layout, replacing the vertical Sidebar, containing tab links to each main section.
- **Summary_Card**: A compact card component displaying a single financial metric (Income, Expenses, or Savings) with its total amount and optional subtitle.
- **Active_FlowSheet_Card**: A card component showing the currently active FlowSheet's name, status badge, date range, income/expense progress bars, and projected balance.
- **Monthly_Overview_Chart**: A grouped bar chart displaying Income, Expenses, and Savings totals per month over a rolling window of recent months.
- **Recent_Transactions_List**: A list component showing the most recent entries with category badge, date, and signed amount.
- **Balance_Section**: The top section of the Overview_Screen displaying the current available balance with a positive/negative status indicator.
- **Status_Indicator**: A visual badge showing whether the current balance is positive or negative.
- **Progress_Bar**: A horizontal bar visualizing actual spend or income against a projected/budgeted target within the Active_FlowSheet_Card.
- **FlowSheet**: The active budget for a chosen period (weekly, monthly, or custom).
- **Entry**: A single income, expense, or savings transaction recorded by the user.
- **Tutorial_Overlay**: A modal dialog overlay that guides new users through Lunero's core features in six sequential steps, rendered on top of the Overview_Screen with a semi-transparent backdrop.
- **Segmented_Progress_Bar**: A horizontal bar divided into six equal segments that fills progressively to indicate the current tutorial step, replacing the previous dot-based progress indicator.
- **Step_Card**: The white rounded-corner card rendered inside the Tutorial_Overlay containing the step title, description, bullet list, progress bar, and navigation controls.
- **Checkmark_Bullet**: A bullet list item prefixed with a colored checkmark (✓) using the Clay Red accent color (`#C86D5A`), used to present key points within each tutorial step.
- **Close_Button**: An × icon button positioned in the top-right corner of the Step_Card that dismisses the Tutorial_Overlay (equivalent to skipping).
- **FlowSheets_List_Page**: The page displaying all FlowSheets (active and archived) in a 2-column card grid, accessible via the "FlowSheets" tab in the Top_Tab_Bar. Formerly named "Past FlowSheets."
- **FlowSheet_Card**: A card component on the FlowSheets_List_Page representing a single FlowSheet, displaying its name, status badge, period type, date range, income/expense progress bars, projected balance, and a "View Details →" link.
- **FlowSheet_Detail_Page**: The page displaying a single FlowSheet's full breakdown, including summary cards for income/expenses/balance, category-level income source and expense cards with projected vs. actual comparisons, and back navigation.
- **Detail_Summary_Card**: A compact card on the FlowSheet_Detail_Page displaying a single aggregate metric (Total Income, Total Expenses, or Net Balance) with its projected comparison value.
- **Category_Card**: A card component on the FlowSheet_Detail_Page representing a single income source or expense category, showing projected amount, actual amount, a progress bar, and the difference between projected and actual.
- **Design_Token_Set**: The shared set of typography, color, spacing, border-radius, and shadow values derived from the Figma prototypes that all redesigned screens reference for visual consistency.
- **Transaction_Calendar_Page**: The redesigned Calendar page displaying a full-width calendar grid titled "Transaction Calendar" with colored dots indicating transaction types (green for income, red/coral for expense) and today-date highlighting.
- **Transaction_Dot**: A small colored circle rendered below a date number in the Transaction_Calendar_Page grid, indicating the presence and type of entries on that day (green for income, red/coral for expense).
- **Transactions_Page**: A new dedicated page displaying all entries from the active FlowSheet in a full-width list, with each row showing a colored type indicator, transaction name, category badge, date, signed amount, and a delete action.
- **Transaction_Row**: A single row in the Transactions_Page list representing one Entry, displaying a colored circle icon, note/description, category badge, entry date, signed amount, and a delete icon.
- **Analytics_Page**: The redesigned page formerly named "Trends," displaying a 2-column chart layout with a "Spending by Category" donut/pie chart and a "Monthly Overview" bar chart, accessible via the "Analytics" tab in the Top_Tab_Bar.
- **Spending_By_Category_Chart**: A donut/pie chart on the Analytics_Page showing expense breakdown by category with percentage labels and a color-coded legend.
- **Mira_Popup**: A floating chat widget rendered in the bottom-right corner of the screen, providing access to the Mira AI budgeting coach from any page without navigating to a dedicated route.
- **Mira_FAB**: A floating action button positioned in the bottom-right corner of the app layout that toggles the visibility of the Mira_Popup.

## Requirements

### Requirement 1: Rename Dashboard to Overview

**User Story:** As a user, I want the main landing page to be called "Overview" instead of "Dashboard," so that the terminology matches the new design.

#### Acceptance Criteria

1. THE Overview_Screen SHALL use the title "Overview" in the page heading, browser tab, and aria-label attributes.
2. THE Top_Tab_Bar SHALL display "Overview" as the label for the tab linking to the root app route (`/`).
3. WHEN a user navigates to the root app route, THE Overview_Screen SHALL render as the active page.
4. THE Overview_Screen SHALL not contain any references to the term "Dashboard" in visible text or accessible labels.

### Requirement 2: Replace Sidebar with Horizontal Top Tab Bar

**User Story:** As a user, I want a horizontal top tab navigation bar instead of a sidebar, so that I have more horizontal content space and a cleaner layout.

#### Acceptance Criteria

1. THE Top_Tab_Bar SHALL render horizontally at the top of the app layout, below the header area containing the Lunero logo and tagline.
2. THE Top_Tab_Bar SHALL contain the following tabs in order: Overview, FlowSheets, Transactions, Calendar, Analytics, and an "+ Add New" action.
3. THE Top_Tab_Bar SHALL visually indicate the currently active tab using a distinct style (e.g., underline, bold weight, or contrasting background).
4. WHEN a user activates a tab, THE Top_Tab_Bar SHALL navigate to the corresponding route.
5. THE Top_Tab_Bar SHALL be keyboard-navigable using arrow keys and support `aria-current="page"` on the active tab.
6. THE Top_Tab_Bar SHALL display the Lunero logo and "Smart Budget Management" tagline in the top-left area above or inline with the tabs.
7. THE Top_Tab_Bar SHALL display a "Help" link in the top-right area.
8. THE app layout SHALL remove the vertical Sidebar component from the page structure.

### Requirement 3: Current Balance Section

**User Story:** As a user, I want to see my current available balance prominently at the top of the Overview screen, so that I immediately know my financial position.

#### Acceptance Criteria

1. THE Balance_Section SHALL display the text "Current Balance" as a heading.
2. THE Balance_Section SHALL display the available balance amount formatted in the user's default currency.
3. WHEN the available balance is zero or greater, THE Status_Indicator SHALL display a "Positive" label with a green visual treatment.
4. WHEN the available balance is less than zero, THE Status_Indicator SHALL display a "Negative" label with a red visual treatment (Clay Red `#C86D5A`).
5. THE Balance_Section SHALL render as the first content section below the Top_Tab_Bar on the Overview_Screen.

### Requirement 4: Summary Cards Row

**User Story:** As a user, I want to see my Income, Expenses, and Savings totals in a row of cards, so that I can quickly compare my financial categories.

#### Acceptance Criteria

1. THE Overview_Screen SHALL display three Summary_Card components in a horizontal row below the Balance_Section.
2. THE first Summary_Card SHALL display the label "Income" and the total income amount from the active FlowSheet.
3. THE second Summary_Card SHALL display the label "Expenses" and the total expenses amount from the active FlowSheet.
4. THE third Summary_Card SHALL display the label "Savings," the total savings amount, and a subtitle showing savings as a percentage of income (e.g., "8.1% of Income").
5. WHEN total income is zero, THE third Summary_Card SHALL display "0% of Income" as the subtitle.
6. THE Summary_Card components SHALL format amounts in the user's default currency.
7. THE Summary_Card components SHALL each include a small icon or indicator in the top-right corner to distinguish the card type.

### Requirement 5: Active FlowSheet Card

**User Story:** As a user, I want to see the status and progress of my active FlowSheet on the Overview screen, so that I can track my budget at a glance.

#### Acceptance Criteria

1. THE Active_FlowSheet_Card SHALL display the active FlowSheet's name (e.g., "March 2026 Budget").
2. THE Active_FlowSheet_Card SHALL display an "Active" status badge and a period type label (e.g., "Monthly").
3. THE Active_FlowSheet_Card SHALL display the FlowSheet's date range (start date to end date).
4. THE Active_FlowSheet_Card SHALL display a Progress_Bar for income showing actual income against projected income.
5. THE Active_FlowSheet_Card SHALL display a Progress_Bar for expenses showing actual expenses against projected expenses.
6. THE Active_FlowSheet_Card SHALL display the projected available balance.
7. THE Active_FlowSheet_Card SHALL include a "View Details →" link that navigates to the detailed FlowSheet view.
8. IF no active FlowSheet exists, THEN THE Overview_Screen SHALL display a prompt to create a new FlowSheet instead of the Active_FlowSheet_Card.

### Requirement 6: Monthly Overview Chart

**User Story:** As a user, I want to see a bar chart of my monthly Income, Expenses, and Savings, so that I can visualize spending trends over time.

#### Acceptance Criteria

1. THE Monthly_Overview_Chart SHALL display a grouped or stacked bar chart with one group per month.
2. THE Monthly_Overview_Chart SHALL show data for a rolling window of the six most recent months.
3. THE Monthly_Overview_Chart SHALL include bars for Income, Expenses, and Savings in each month group.
4. THE Monthly_Overview_Chart SHALL display a legend identifying Income, Expenses, and Savings by color.
5. THE Monthly_Overview_Chart SHALL label the Y-axis with currency amounts and the X-axis with abbreviated month names.
6. THE Monthly_Overview_Chart SHALL use Lunero brand colors: Olive Gray (`#6B6F69`) for Income, Clay Red (`#C86D5A`) for Expenses, and Warm Earth (`#C4A484`) for Savings.
7. THE Monthly_Overview_Chart SHALL be accessible, providing a text alternative or aria-label describing the chart data for screen readers.

### Requirement 7: Recent Transactions List

**User Story:** As a user, I want to see my most recent transactions on the Overview screen, so that I can review recent activity without navigating away.

#### Acceptance Criteria

1. THE Recent_Transactions_List SHALL display the five most recent entries from the active FlowSheet, ordered by entry date descending.
2. EACH item in the Recent_Transactions_List SHALL display the entry note or description, category name as a badge, entry date, and signed amount.
3. THE Recent_Transactions_List SHALL format amounts with a "+" prefix for income entries and a "−" prefix for expense entries.
4. THE Recent_Transactions_List SHALL format amounts in the user's default currency.
5. WHEN the active FlowSheet has no entries, THE Recent_Transactions_List SHALL display a message: "No transactions yet."
6. THE Recent_Transactions_List SHALL use the `role="list"` attribute and each item SHALL use `role="listitem"` for accessibility.

### Requirement 8: Overview Screen Layout and Ordering

**User Story:** As a user, I want the Overview screen sections to follow a logical top-to-bottom order, so that the most important information is visible first.

#### Acceptance Criteria

1. THE Overview_Screen SHALL render sections in the following vertical order: Balance_Section, Summary Cards Row, Active_FlowSheet_Card, Monthly_Overview_Chart, Recent_Transactions_List.
2. THE Overview_Screen SHALL use a single-column layout with a maximum content width appropriate for readability.
3. THE Overview_Screen SHALL maintain consistent spacing between sections.
4. THE Overview_Screen SHALL be scrollable when content exceeds the viewport height.

### Requirement 9: Preserve Existing Data Integration

**User Story:** As a developer, I want the redesigned Overview screen to use the same data hooks and backend APIs, so that no backend changes are required.

#### Acceptance Criteria

1. THE Overview_Screen SHALL retrieve the active FlowSheet using the existing `useActiveFlowSheet` hook.
2. THE Overview_Screen SHALL retrieve entries using the existing `useEntries` hook.
3. THE Overview_Screen SHALL retrieve projection data using the existing `useProjectionSummary` hook.
4. THE Overview_Screen SHALL retrieve categories using the existing `useCategories` hook.
5. THE Overview_Screen SHALL retrieve user profile and default currency using the existing `useProfile` hook.
6. THE Overview_Screen SHALL retrieve trend data for the Monthly_Overview_Chart using the existing `useTrends` hook.
7. THE Overview_Screen SHALL continue to use the Zustand `useEntryStore` for optimistic entry state management.
8. WHILE the Overview_Screen is loading data, THE Overview_Screen SHALL display a loading indicator with an accessible `role="status"` attribute.
9. IF the active FlowSheet fails to load, THEN THE Overview_Screen SHALL display an error message with an accessible `role="alert"` attribute.

### Requirement 10: Responsive and Accessible Design

**User Story:** As a user, I want the Overview screen to be usable on different screen sizes and with assistive technologies, so that the app is accessible to all users.

#### Acceptance Criteria

1. THE Overview_Screen SHALL use Tamagui components as the source of truth for UI elements.
2. THE Summary_Card components SHALL stack vertically on viewports narrower than 768px.
3. THE Top_Tab_Bar SHALL remain horizontally scrollable or collapse into a menu on narrow viewports.
4. THE Overview_Screen SHALL meet WCAG AA contrast requirements for all text and interactive elements.
5. THE Overview_Screen SHALL support full keyboard navigation, including tab order through all interactive elements.
6. THE Monthly_Overview_Chart SHALL provide a text-based fallback or summary for screen reader users.

### Requirement 11: Tutorial Overlay Visual Redesign

**User Story:** As a user, I want the tutorial overlay to match the new Overview screen aesthetic with a modern card layout, segmented progress bar, and emoji-decorated titles, so that the onboarding experience feels cohesive with the redesigned app.

#### Acceptance Criteria

1. THE Tutorial_Overlay SHALL render a Step_Card with a white background (`#FAFAF9`), rounded corners (16px border-radius), and a drop shadow consistent with the Overview_Screen card style.
2. THE Tutorial_Overlay SHALL display a Segmented_Progress_Bar at the top of the Step_Card, divided into six equal-width segments.
3. WHEN the user is on step N, THE Segmented_Progress_Bar SHALL fill the first N segments with the brand dark tone (`#44403C`) and leave the remaining segments in a muted color (`#D6D3D1`).
4. THE Tutorial_Overlay SHALL display a themed emoji icon centered above the step title for each step (✨ for step 1, 📊 for step 2, 🤙 for step 3, 📅 for step 4, 💫 for step 5, 🎉 for step 6).
5. THE Tutorial_Overlay SHALL display the step title with its corresponding emoji suffix (e.g., "Welcome to Lunero! 🌙", "Understanding FlowSheets 📊").
6. THE Tutorial_Overlay SHALL display a Close_Button (× icon) in the top-right corner of the Step_Card.
7. WHEN the user activates the Close_Button, THE Tutorial_Overlay SHALL dismiss the overlay and mark the tutorial as complete (equivalent to skipping).
8. THE Tutorial_Overlay SHALL render on a semi-transparent dark backdrop (`rgba(28, 25, 23, 0.55)`) centered over the Overview_Screen.
9. THE Tutorial_Overlay SHALL replace the existing dot-based progress indicator with the Segmented_Progress_Bar.

### Requirement 12: Tutorial Step Content Structure

**User Story:** As a user, I want each tutorial step to present information in a scannable bullet-list format with colored checkmarks, so that I can quickly understand each feature without reading long paragraphs.

#### Acceptance Criteria

1. EACH tutorial step SHALL display a title line (with emoji), a short description paragraph, and a Checkmark_Bullet list of key points.
2. THE Checkmark_Bullet items SHALL use a colored checkmark prefix (✓) rendered in the Clay Red accent color (`#C86D5A`).
3. THE Tutorial_Overlay SHALL preserve the existing six-step text copy, restructured into the title, description, and bullet-list format.
4. Step 1 ("Welcome to Lunero! 🌙") SHALL display a description paragraph introducing FlowSheets without a bullet list.
5. Step 2 ("Understanding FlowSheets 📊") SHALL display four Checkmark_Bullet items: "Set projected income and expenses," "Track actual spending automatically," "Compare budget vs reality in real-time," and "View past FlowSheets for insights."
6. Step 3 ("Managing Transactions 🤙") SHALL display three Checkmark_Bullet items: "Income: Salary, freelance work, gifts," "Expenses: Daily spending across categories," and "Savings: Money set aside for goals."
7. Step 4 ("Calendar View 📅") SHALL display four Checkmark_Bullet items: "Green highlights = positive cash flow," "Red highlights = more expenses than income," "Dots show transaction types," and "Click any day for details."
8. Step 5 ("Meet Mira, Your AI Coach 💫") SHALL display four Checkmark_Bullet items: "Get spending insights and trends," "Receive budget recommendations," "Ask questions about your finances," and "Set and track financial goals."
9. Step 6 ("You're All Set! 🎉") SHALL display a description paragraph without a bullet list.
10. THE Tutorial_Overlay SHALL display a step counter label "X of 6" centered between the Previous and Next navigation controls.

### Requirement 13: Tutorial Navigation and Interaction

**User Story:** As a user, I want consistent and accessible navigation controls in the tutorial overlay, so that I can move between steps, dismiss the tutorial, and complete it with clear affordances.

#### Acceptance Criteria

1. THE Tutorial_Overlay SHALL display a "Previous" text link on the left side of the navigation row and a "Next →" button on the right side.
2. WHEN the user is on step 1, THE Tutorial_Overlay SHALL hide or disable the "Previous" control.
3. WHEN the user is on step 6, THE Tutorial_Overlay SHALL replace the "Next →" button with a "Get Started 🚀" button.
4. WHEN the user activates the "Get Started 🚀" button, THE Tutorial_Overlay SHALL call the `onComplete` callback to mark the tutorial as complete and dismiss the overlay.
5. THE Tutorial_Overlay SHALL support keyboard navigation: Escape to dismiss, ArrowRight/ArrowDown to advance, ArrowLeft/ArrowUp to go back.
6. THE Tutorial_Overlay SHALL use `role="dialog"` and `aria-modal="true"` attributes on the overlay container.
7. THE Tutorial_Overlay SHALL provide an `aria-label` of "App tutorial" on the dialog container.
8. THE Tutorial_Overlay SHALL auto-launch after onboarding completion when the user profile's `tutorialComplete` flag is false, using the existing `useTutorial` hook and Zustand `useTutorialStore`.
9. THE Tutorial_Overlay SHALL reset to step 1 each time the overlay opens.
10. WHEN the user dismisses the tutorial via the Close_Button or keyboard Escape, THE Tutorial_Overlay SHALL persist `tutorialComplete = true` to the user profile so the tutorial does not auto-launch on subsequent sessions.

### Requirement 14: Cross-Cutting Design Consistency

**User Story:** As a user, I want all redesigned screens to share the same visual language (fonts, colors, spacing, card styles, and layout patterns), so that the application feels cohesive and polished throughout.

#### Acceptance Criteria

1. THE Design_Token_Set SHALL define a single font family (Inter / Plus Jakarta Sans) used across all redesigned screens for headings, body text, labels, and badges.
2. THE Design_Token_Set SHALL define consistent font size and weight pairings: page titles (20px, weight 500), section headings (15–17px, weight 500), body text (14px, weight 400), labels and badges (11–13px, weight 500).
3. THE Design_Token_Set SHALL use the Lunero brand color palette consistently: Stone neutrals (`#FAFAF9` through `#1C1917`), Olive Gray (`#6B6F69`) for income, Clay Red (`#C86D5A`) for expenses, Warm Earth (`#C4A484`) for savings, and brand dark (`#44403C`) for primary actions.
4. THE Design_Token_Set SHALL define a consistent card style: white background (`#FFFFFF` light / `surface1` dark), 1px border (`#E7E5E4` light / `borderColor` dark), 12px border-radius, and 20–28px internal padding.
5. THE Design_Token_Set SHALL define consistent button styles: primary buttons use brand dark background (`#44403C`) with light text (`#FAFAF9`) and 8px border-radius; accent buttons use Clay Red (`#C86D5A`) background with white text.
6. THE Design_Token_Set SHALL define consistent spacing values: 8px between tightly grouped elements, 16px between related sections, 24–28px between major page sections.
7. THE Design_Token_Set SHALL define a consistent maximum content width for all page layouts to maintain readability.
8. THE Top_Tab_Bar SHALL appear consistently on all redesigned pages (Overview_Screen, FlowSheets_List_Page, FlowSheet_Detail_Page, Transactions_Page, Transaction_Calendar_Page, Analytics_Page) with the same visual treatment.
9. THE Progress_Bar component SHALL use a consistent height, border-radius, and color scheme (Olive Gray for income, Clay Red for expenses) across all screens where progress bars appear (Overview_Screen, FlowSheets_List_Page, FlowSheet_Detail_Page).
10. WHILE the application is in dark mode, THE Design_Token_Set SHALL map all color values to their dark theme equivalents as defined in the Tamagui theme configuration.

### Requirement 15: FlowSheets List Page Redesign

**User Story:** As a user, I want a unified FlowSheets page that shows both my active and archived FlowSheets in a visual card grid, so that I can manage all my budget periods from one place.

#### Acceptance Criteria

1. THE FlowSheets_List_Page SHALL display the page title "FlowSheets" and a subtitle "Manage your budget periods and track projected vs actual spending."
2. THE FlowSheets_List_Page SHALL display a "+ New FlowSheet" button in the top-right area of the page header, styled with the Clay Red accent color (`#C86D5A`) and a "+" icon.
3. THE "+ New FlowSheet" button SHALL always be visible regardless of whether an active FlowSheet exists.
4. THE FlowSheets_List_Page SHALL display all FlowSheets (active and archived) as FlowSheet_Card components in a 2-column grid layout.
5. THE FlowSheets_List_Page SHALL sort FlowSheets with the active sheet first, followed by archived sheets ordered by end date descending (most recent first).
6. EACH FlowSheet_Card SHALL display the FlowSheet name, period type label (e.g., "Monthly"), a calendar icon with the date range (start date to end date), income progress (actual vs. projected) with a Progress_Bar, expense progress (actual vs. projected) with a Progress_Bar, projected balance, and a "View Details →" link.
7. WHEN a FlowSheet has an "active" status, THE FlowSheet_Card SHALL display a green "Active" badge next to the FlowSheet name.
8. WHEN a FlowSheet has an "active" status, THE FlowSheet_Card SHALL have a visually distinct treatment (e.g., accent left border or highlighted border) to differentiate the card from archived FlowSheet_Cards.
9. WHEN a FlowSheet has an "archived" status, THE FlowSheet_Card SHALL omit the status badge.
10. THE FlowSheet_Card grid SHALL stack to a single-column layout on viewports narrower than 768px.
11. WHEN the user activates the "View Details →" link on a FlowSheet_Card, THE FlowSheets_List_Page SHALL navigate to the FlowSheet_Detail_Page for that FlowSheet.
12. THE FlowSheets_List_Page SHALL be accessible via the "FlowSheets" tab in the Top_Tab_Bar.
13. THE FlowSheets_List_Page SHALL retrieve FlowSheet data using the existing `useFlowSheets` hook and projection data using the existing `useProjections` hook.
14. WHILE the FlowSheets_List_Page is loading data, THE FlowSheets_List_Page SHALL display a loading indicator with an accessible `role="status"` attribute.
15. IF the FlowSheets data fails to load, THEN THE FlowSheets_List_Page SHALL display an error message with an accessible `role="alert"` attribute.
16. WHEN no FlowSheets exist, THE FlowSheets_List_Page SHALL display an empty state message: "No FlowSheets yet. Create your first budget period to get started."

### Requirement 16: FlowSheet Detail Page Redesign

**User Story:** As a user, I want the FlowSheet detail page to show a comprehensive breakdown of my income sources and expense categories with projected vs. actual comparisons, so that I can understand exactly where my money is going.

#### Acceptance Criteria

1. THE FlowSheet_Detail_Page SHALL display a back-navigation arrow (←) followed by the FlowSheet name as the page title.
2. THE FlowSheet_Detail_Page SHALL display the FlowSheet date range (formatted as "MMM D, YYYY – MMM D, YYYY") below the page title.
3. WHEN the FlowSheet has an "active" status, THE FlowSheet_Detail_Page SHALL display an "Active Period" badge in the top-right area, styled with the Clay Red accent color.
4. WHEN the FlowSheet has an "archived" status, THE FlowSheet_Detail_Page SHALL display an "Archived" badge in the top-right area, styled with the muted neutral color (`#78716C`).
5. THE FlowSheet_Detail_Page SHALL display three Detail_Summary_Card components in a horizontal row: "Total Income" (with "Projected: [amount]" subtitle), "Total Expenses" (with "Projected: [amount]" subtitle), and "Net Balance" (with "Projected: [amount]" subtitle).
6. THE Detail_Summary_Card components SHALL format all amounts in the user's default currency.
7. THE FlowSheet_Detail_Page SHALL display an "Income Sources" section heading followed by a 2-column grid of Category_Card components for each income category.
8. THE FlowSheet_Detail_Page SHALL display an "Expense Categories" section heading followed by a 2-column grid of Category_Card components for each expense category.
9. EACH Category_Card SHALL display the category name, a subtitle indicating the type ("Income Source" or "Expense Category"), the projected amount, the actual amount with a Progress_Bar, and the difference between actual and projected.
10. WHEN a Category_Card represents an unlocked FlowSheet, THE Category_Card SHALL display an edit icon (pencil) in the top-right corner that allows the user to edit entries for that category.
11. WHEN actual expenses exceed the projected amount for an expense category, THE Category_Card SHALL display the actual amount and the difference value in Clay Red (`#C86D5A`).
12. WHEN actual income exceeds the projected amount for an income category, THE Category_Card SHALL display the difference as a positive value (e.g., "+$200.00").
13. THE Category_Card grid SHALL stack to a single-column layout on viewports narrower than 768px.
14. THE FlowSheet_Detail_Page SHALL preserve the existing unlock-to-edit flow for archived FlowSheets, including the unlock confirmation dialog.
15. THE FlowSheet_Detail_Page SHALL retrieve data using the existing `useFlowSheet`, `useEntries`, `useCategories`, `useProfile`, and `useProjections` hooks.
16. WHEN the user activates the back-navigation arrow, THE FlowSheet_Detail_Page SHALL navigate back to the FlowSheets_List_Page.
17. WHILE the FlowSheet_Detail_Page is loading data, THE FlowSheet_Detail_Page SHALL display a loading indicator with an accessible `role="status"` attribute.
18. IF the FlowSheet data fails to load, THEN THE FlowSheet_Detail_Page SHALL display an error message with an accessible `role="alert"` attribute and a link back to the FlowSheets_List_Page.

### Requirement 17: Calendar Page Redesign

**User Story:** As a user, I want the Calendar page to display a clean, full-width "Transaction Calendar" with colored dots indicating my income and expense entries, so that I can visually scan my transaction activity across the month.

#### Acceptance Criteria

1. THE Transaction_Calendar_Page SHALL display the page title "Transaction Calendar" with a calendar emoji (📅) prefix.
2. THE Transaction_Calendar_Page SHALL display a full-width calendar grid with day-of-week column headers (Sun, Mon, Tue, Wed, Thu, Fri, Sat).
3. THE Transaction_Calendar_Page SHALL render the calendar grid inside a white card container with rounded corners (12px border-radius) and 1px border (`#E7E5E4`), matching the Design_Token_Set card style.
4. THE Transaction_Calendar_Page SHALL display month navigation arrows ("←" and "→") positioned to the right of the month/year label (e.g., "March 2026").
5. WHEN a day has income entries, THE Transaction_Calendar_Page SHALL display a green Transaction_Dot below the date number for that day.
6. WHEN a day has expense entries, THE Transaction_Calendar_Page SHALL display a red/coral Transaction_Dot (Clay Red `#C86D5A`) below the date number for that day.
7. WHEN a day has both income and expense entries, THE Transaction_Calendar_Page SHALL display both a green and a red/coral Transaction_Dot below the date number.
8. THE Transaction_Calendar_Page SHALL highlight today's date with a blue/purple background circle to distinguish the current day from other dates.
9. THE Transaction_Calendar_Page SHALL fill the full content width of the page layout, wider than the previous calendar implementation.
10. THE Transaction_Calendar_Page SHALL preserve the existing month navigation functionality using the `useActiveFlowSheet` hook to determine navigable date boundaries.
11. THE Transaction_Calendar_Page SHALL preserve the existing entry creation flow, allowing users to create entries with a pre-populated date when interacting with a calendar day.
12. THE Transaction_Calendar_Page SHALL retrieve entries using the existing `useEntries` hook and categories using the existing `useCategories` hook.
13. WHILE the Transaction_Calendar_Page is loading data, THE Transaction_Calendar_Page SHALL display a loading indicator with an accessible `role="status"` attribute.
14. IF no active FlowSheet exists, THEN THE Transaction_Calendar_Page SHALL display an error message with an accessible `role="alert"` attribute.
15. THE Transaction_Calendar_Page SHALL be accessible via the "Calendar" tab in the Top_Tab_Bar.

### Requirement 18: Transactions Page

**User Story:** As a user, I want a dedicated page listing all my transactions with details and quick-delete capability, so that I can review and manage my entries in one place.

#### Acceptance Criteria

1. THE Transactions_Page SHALL display the page title "All Transactions" with the total transaction count displayed on the right side of the header (e.g., "8 transactions").
2. THE Transactions_Page SHALL display all entries from the active FlowSheet in a full-width list, ordered by entry date descending (most recent first).
3. EACH Transaction_Row SHALL display a colored circle icon on the left indicating the entry type: green for income, red/coral (Clay Red `#C86D5A`) for expense, and warm earth (`#C4A484`) for savings.
4. EACH Transaction_Row SHALL display the entry note or description as the primary text.
5. EACH Transaction_Row SHALL display the category name as a styled badge next to the transaction name.
6. EACH Transaction_Row SHALL display the entry date formatted as "MMM D, YYYY" (e.g., "Mar 15, 2026") below the transaction name.
7. EACH Transaction_Row SHALL display the entry amount on the right side, prefixed with "+" for income (in green) and "−" for expense (in Clay Red `#C86D5A`), formatted in the user's default currency.
8. EACH Transaction_Row SHALL display a delete icon (trash) on the far right that allows the user to delete the entry.
9. WHEN the user activates the delete icon on a Transaction_Row, THE Transactions_Page SHALL display a confirmation dialog before deleting the entry.
10. WHEN the active FlowSheet has no entries, THE Transactions_Page SHALL display an empty state message: "No transactions yet. Add entries to your FlowSheet to see them here."
11. THE Transactions_Page SHALL be accessible via the "Transactions" tab in the Top_Tab_Bar.
12. THE Transactions_Page SHALL retrieve the active FlowSheet using the existing `useActiveFlowSheet` hook, entries using the existing `useEntries` hook, categories using the existing `useCategories` hook, and user profile using the existing `useProfile` hook.
13. THE Transactions_Page SHALL use the Zustand `useEntryStore` for optimistic entry state management during delete operations.
14. WHILE the Transactions_Page is loading data, THE Transactions_Page SHALL display a loading indicator with an accessible `role="status"` attribute.
15. IF the active FlowSheet fails to load, THEN THE Transactions_Page SHALL display an error message with an accessible `role="alert"` attribute.
16. THE Transactions_Page list SHALL use the `role="list"` attribute and each Transaction_Row SHALL use `role="listitem"` for accessibility.

### Requirement 19: Rename Trends to Analytics

**User Story:** As a user, I want the "Trends" section to be called "Analytics," so that the terminology matches the new design and better describes the page's expanded charting capabilities.

#### Acceptance Criteria

1. THE Analytics_Page SHALL use the title "Analytics" in the page heading, browser tab, and aria-label attributes.
2. THE Top_Tab_Bar SHALL display "Analytics" as the label for the tab linking to the Analytics_Page route, replacing the previous "Trends" label.
3. THE Analytics_Page route SHALL be updated from `/trends` to `/analytics` (or the appropriate route matching the Top_Tab_Bar tab configuration).
4. THE application SHALL not contain any user-visible references to the term "Trends" in navigation labels, page headings, or accessible labels after the rename.
5. THE Analytics_Page SHALL preserve all existing trend data retrieval using the existing `useTrends` and `useTrendBreakdown` hooks.
6. THE Analytics_Page SHALL retrieve categories using the existing `useCategories` hook and user profile using the existing `useProfile` hook.
7. WHILE the Analytics_Page is loading data, THE Analytics_Page SHALL display a loading indicator with an accessible `role="status"` attribute.
8. IF the trend data fails to load, THEN THE Analytics_Page SHALL display an error message with an accessible `role="alert"` attribute.

### Requirement 20: Analytics Spending by Category Chart

**User Story:** As a user, I want to see a donut/pie chart showing my expense breakdown by category with percentages, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE Spending_By_Category_Chart SHALL display a donut or pie chart visualizing expense totals grouped by category.
2. THE Spending_By_Category_Chart SHALL display percentage labels for each category segment (e.g., "Housing 67%", "Food 16%").
3. THE Spending_By_Category_Chart SHALL display a legend below the chart with colored squares corresponding to each category and its label.
4. THE Spending_By_Category_Chart SHALL calculate category percentages based on each category's share of total expenses in the active FlowSheet.
5. WHEN the active FlowSheet has no expense entries, THE Spending_By_Category_Chart SHALL display an empty state message: "No expense data yet."
6. THE Spending_By_Category_Chart SHALL render inside a white card container with the heading "Spending by Category," matching the Design_Token_Set card style.
7. THE Spending_By_Category_Chart SHALL be accessible, providing a text alternative or aria-label describing the category breakdown for screen readers.
8. THE Spending_By_Category_Chart SHALL derive expense data from the existing `useEntries` and `useCategories` hooks.

### Requirement 21: Analytics Page Layout and Monthly Overview

**User Story:** As a user, I want the Analytics page to show the spending-by-category chart and the monthly overview bar chart side by side, so that I can compare category breakdown and monthly trends in a single view.

#### Acceptance Criteria

1. THE Analytics_Page SHALL display a 2-column layout at the top of the page: the Spending_By_Category_Chart in the left column and the Monthly_Overview_Chart in the right column.
2. THE Monthly_Overview_Chart on the Analytics_Page SHALL display the same grouped bar chart (Income, Expenses, Savings per month) as defined in Requirement 6, using the existing `useTrends` hook.
3. THE Monthly_Overview_Chart on the Analytics_Page SHALL render inside a white card container with the heading "Monthly Overview," matching the Design_Token_Set card style.
4. THE 2-column chart layout SHALL stack to a single-column layout on viewports narrower than 768px, with the Spending_By_Category_Chart appearing above the Monthly_Overview_Chart.
5. THE Analytics_Page SHALL maintain consistent spacing between the chart columns and between the chart section and any content below, following the Design_Token_Set spacing values.
6. THE Analytics_Page SHALL be accessible via the "Analytics" tab in the Top_Tab_Bar.

### Requirement 22: Mira Floating Popup Chat

**User Story:** As a user, I want Mira to be available as a floating chat popup on any page instead of a dedicated page, so that I can ask budgeting questions without leaving my current context.

#### Acceptance Criteria

1. THE app layout SHALL remove the Mira dedicated page route (`/mira`) and remove the "Mira" entry from the Top_Tab_Bar navigation.
2. THE app layout SHALL render a Mira_FAB in the bottom-right corner of the screen, visible on all authenticated pages.
3. WHEN the user activates the Mira_FAB, THE Mira_Popup SHALL open as a floating chat widget overlaying the bottom-right area of the current page content.
4. THE Mira_Popup SHALL display a header with the title "Mira ✨" and the subtitle "AI Budgeting Coach."
5. THE Mira_Popup header SHALL include a minimize button (−) and a close button (×).
6. WHEN the user activates the minimize button, THE Mira_Popup SHALL collapse back to the Mira_FAB state, preserving the current chat message history in memory.
7. WHEN the user activates the close button, THE Mira_Popup SHALL close and reset the chat message history.
8. THE Mira_Popup SHALL display a chat messages area showing the conversation history between the user and Mira.
9. WHEN the Mira_Popup opens with no prior messages in the session, THE Mira_Popup SHALL display a welcome message from Mira: "Hi! I'm Mira, your AI budgeting coach. 🤖 I'm here to help you understand your spending, set goals, and make smarter financial decisions. What would you like to know?"
10. THE Mira_Popup SHALL display a text input field at the bottom with placeholder text "Ask Mira anything..." and a send button (arrow icon styled in Clay Red `#C86D5A`).
11. THE Mira_Popup SHALL display suggestion chips below the input field: "How's my spending?", "Show savings", and "Give me a tip."
12. WHEN the user activates a suggestion chip, THE Mira_Popup SHALL populate the input field with the chip text and submit the query.
13. THE Mira_Popup SHALL preserve all existing chat functionality using the `useMiraQuery` mutation for sending queries and the `useMiraAlerts` and `useDismissAlert` hooks for alert management.
14. THE Mira_Popup SHALL display a loading indicator within the chat area while a query is being processed (`isPending` state from `useMiraQuery`).
15. IF the Mira AI service is unavailable, THEN THE Mira_Popup SHALL display an inline unavailability message within the chat area without blocking other app functionality.
16. THE Mira_Popup SHALL be keyboard-accessible: Escape to close, Tab to navigate between input and controls.
17. THE Mira_Popup SHALL use `role="dialog"` and `aria-label="Mira AI budgeting coach"` on the popup container.
18. THE Mira_FAB SHALL include an `aria-label` of "Open Mira AI coach" and be keyboard-focusable.

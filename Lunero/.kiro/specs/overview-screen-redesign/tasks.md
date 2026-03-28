# Implementation Plan: Overview Screen Redesign

## Overview

This plan implements a comprehensive visual overhaul of Lunero's primary screens, replacing the sidebar layout with a horizontal top tab bar and introducing a card-based design system. Work is ordered: foundational tokens/components first, then layout restructuring, then screen-by-screen implementation, and finally route cleanup and cross-cutting concerns.

## Tasks

- [-] 1. Design tokens and shared component foundations
  - [x] 1.1 Extend design tokens in `packages/ui/src/tokens.ts`
    - Add new semantic color tokens: `positiveGreen` (`#22C55E`), `positiveBgGreen` (`#DCFCE7`), `positiveTextGreen` (`#166534`), `negativeBgRed` (`#FDF2F0`), `todayHighlight` (`#6366F1`)
    - Add badge, button, and progress bar token constants as exported objects
    - Add typography scale constants (page title, section heading, body, label, muted, balance, card amount, uppercase label)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 1.2 Create `SummaryCard` component in `packages/ui/src/summary-card.tsx`
    - Implement `SummaryCardProps` interface (label, amount, currency, subtitle, icon)
    - White card with 1px `#E7E5E4` border, 12px radius, 20px padding
    - Icon indicator top-right (↑ income, ↓ expenses, ◎ savings)
    - Label 11px uppercase `#A8A29E`, amount 20–24px weight 300, subtitle 12px `#A8A29E`
    - Dark mode support via Tamagui theme tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 14.4_

  - [x] 1.3 Write unit tests for `SummaryCard`
    - Test rendering with income, expense, savings variants
    - Test savings percentage subtitle display
    - Test currency formatting
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.4 Create `ActiveFlowSheetCard` component in `packages/ui/src/active-flow-sheet-card.tsx`
    - Implement `ActiveFlowSheetCardProps` interface
    - Display name, Active badge (green pill), period type, date range
    - Income and expense progress bars (6px height, pill radius, Olive Gray / Clay Red fills)
    - Projected balance and "View Details →" link
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 14.9_

  - [x] 1.5 Write unit tests for `ActiveFlowSheetCard`
    - Test progress bar fill percentages
    - Test "View Details →" callback
    - Test empty/no-active-sheet state
    - _Requirements: 5.4, 5.5, 5.7, 5.8_

  - [x] 1.6 Create `TransactionRow` component in `packages/ui/src/transaction-row.tsx`
    - Implement `TransactionRowProps` interface
    - Colored circle (10px) left: green income, Clay Red expense, Warm Earth savings
    - Note/description, category badge (pill), date (12px muted), signed amount (14px weight 500)
    - Delete icon (trash) far right, hover Clay Red
    - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

  - [x] 1.7 Create `RecentTransactionsList` component in `packages/ui/src/recent-transactions-list.tsx`
    - Implement `RecentTransactionsListProps` interface
    - Display 5 most recent entries with colored dot, note, category badge, date, signed amount
    - Empty state: "No transactions yet."
    - Use `role="list"` and `role="listitem"` for accessibility
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 1.8 Write unit tests for `RecentTransactionsList`
    - Test rendering 5 entries with correct formatting
    - Test empty state message
    - Test signed amount prefixes (+ for income, − for expense)
    - _Requirements: 7.1, 7.3, 7.5_

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Chart components
  - [x] 3.1 Create `MonthlyOverviewChart` component in `packages/ui/src/monthly-overview-chart.tsx`
    - Implement `MonthlyOverviewChartProps` interface using recharts `BarChart`
    - Grouped bars for Income (#6B6F69), Expenses (#C86D5A), Savings (#C4A484)
    - Legend with colored dots, Y-axis currency labels, X-axis month abbreviations
    - Wrapped in white card with "Monthly Overview" heading
    - Add `aria-label` on SVG for screen reader accessibility
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 3.2 Write unit tests for `MonthlyOverviewChart`
    - Test rendering with 6 months of data
    - Test legend presence
    - Test aria-label accessibility
    - _Requirements: 6.2, 6.4, 6.7_

  - [x] 3.3 Create `SpendingByCategoryChart` component in `packages/ui/src/spending-by-category-chart.tsx`
    - Implement `SpendingByCategoryChartProps` and `CategoryExpenseData` interfaces using recharts `PieChart` (donut)
    - Percentage labels per segment, legend below with colored squares + category name + percentage
    - Empty state: "No expense data yet."
    - Wrapped in white card with "Spending by Category" heading
    - Add `aria-label` for screen reader accessibility
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [x] 3.4 Write unit tests for `SpendingByCategoryChart`
    - Test rendering with category data
    - Test empty state message
    - Test percentage calculation display
    - _Requirements: 20.1, 20.4, 20.5_

- [x] 4. Navigation and layout restructuring
  - [x] 4.1 Create `TopTabBar` component in `packages/ui/src/top-tab-bar.tsx`
    - Implement `TopTabBarProps` and `TabItem` interfaces
    - Header area: Lunero logo left, "Smart Budget Management" tagline, "Help" link right
    - Tabs: Overview (/), FlowSheets (/flowsheets), Transactions (/transactions), Calendar (/calendar), Analytics (/analytics)
    - "+ Add New" accent button (Clay Red bg, white text)
    - Active tab visual indicator, `aria-current="page"` on active tab
    - Keyboard navigable with arrow keys
    - Horizontally scrollable on narrow viewports
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 14.8_

  - [x] 4.2 Write unit tests for `TopTabBar`
    - Test tab rendering and active state
    - Test keyboard navigation (arrow keys)
    - Test `aria-current="page"` attribute
    - Test "+ Add New" callback
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 4.3 Restructure `apps/web/app/(app)/layout.tsx`
    - Remove `Sidebar` import and rendering
    - Remove `Topbar` import and rendering
    - Add `TopTabBar` with `usePathname()` for active tab detection and `useRouter()` for navigation
    - Add Mira FAB + popup state management (isOpen, isMinimized, messages) at layout level
    - Render `MiraFAB` and `MiraPopup` components (wired to existing `useMiraQuery`, `useMiraAlerts`, `useDismissAlert` hooks)
    - Preserve `OnboardingGuard`, `TutorialOverlay`, and service worker registration
    - Update main content area: remove sidebar flex layout, use full-width centered content
    - _Requirements: 2.1, 2.8, 22.1, 22.2, 22.3, 22.6, 22.7_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Overview screen (root page) redesign
  - [x] 6.1 Rewrite `apps/web/app/(app)/page.tsx` as Overview screen
    - Rename from "Dashboard" to "Overview" in heading, aria-label
    - Add Balance Section: "Current Balance" label (12px uppercase), amount (32–36px weight 300), positive/negative badge pill
    - Add 3 Summary Cards row using `SummaryCard` component (Income, Expenses, Savings with percentage subtitle)
    - Add `ActiveFlowSheetCard` with data from `useActiveFlowSheet` and `useProjectionSummary`
    - Add `MonthlyOverviewChart` with data from `useTrends` (rolling 6 months)
    - Add `RecentTransactionsList` with 5 most recent entries from `useEntries`
    - Sections in order: Balance, Summary Cards, Active FlowSheet, Monthly Overview, Recent Transactions
    - Max content width 720px, single-column, consistent 32px section spacing
    - Preserve loading state (`role="status"`) and error state (`role="alert"`)
    - Handle no-active-FlowSheet state with prompt to create
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 6.2 Write unit tests for Overview screen
    - Test section ordering (Balance → Summary → Active FlowSheet → Chart → Recent Transactions)
    - Test "Overview" title and aria-label (no "Dashboard" references)
    - Test loading and error states
    - Test no-active-FlowSheet empty state
    - _Requirements: 1.1, 1.4, 8.1, 9.8, 9.9_

- [x] 7. Tutorial overlay redesign
  - [x] 7.1 Update `packages/ui/src/tutorial-overlay.tsx`
    - Replace dot progress indicator with Segmented Progress Bar (6 segments, filled `#44403C`, empty `#D6D3D1`, 4px height, 4px gap, 2px radius per segment)
    - Add Close (×) button top-right (14px, `#A8A29E`, hover `#44403C`), calls `onSkip`
    - Add centered emoji icon per step (✨📊🤙📅💫🎉, ~32px)
    - Update step titles with emoji suffixes (e.g., "Welcome to Lunero! 🌙")
    - Restructure step content: description paragraph + Checkmark Bullet list (✓ prefix in Clay Red `#C86D5A`)
    - Step 1: description only (no bullets). Step 2: 4 bullets. Step 3: 3 bullets. Step 4: 4 bullets. Step 5: 4 bullets. Step 6: description only
    - Update nav row: "Previous" text link left (13px `#A8A29E` underline), "X of 6" center, "Next →" / "Get Started 🚀" right
    - Preserve keyboard nav (Escape, arrows), `role="dialog"`, `aria-modal="true"`, `aria-label="App tutorial"`
    - Preserve auto-launch behavior and step reset on open
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

  - [x] 7.2 Write unit tests for redesigned Tutorial Overlay
    - Test segmented progress bar fills correctly per step
    - Test close button triggers onSkip
    - Test emoji icons per step
    - Test checkmark bullet rendering for steps 2–5
    - Test "Get Started 🚀" on final step triggers onComplete
    - _Requirements: 11.2, 11.3, 11.6, 11.7, 12.5, 13.3, 13.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. FlowSheets list page
  - [x] 9.1 Create `FlowSheetCard` redesign in `packages/ui/src/flow-sheet-card.tsx`
    - Update `FlowSheetCardProps` to include projection data
    - Display: name, Active badge (green pill if active), period type (muted right-aligned), calendar icon + date range
    - Income/expense progress bars (Olive Gray / Clay Red)
    - Projected balance, "View Details →" link
    - Active card: accent left border (3px Clay Red or green)
    - Archived cards: no badge, standard border
    - _Requirements: 15.6, 15.7, 15.8, 15.9_

  - [x] 9.2 Create `apps/web/app/(app)/flowsheets/page.tsx`
    - Page title "FlowSheets" (20px weight 500), subtitle "Manage your budget periods and track projected vs actual spending."
    - "+ New FlowSheet" accent button (Clay Red bg, white text, always visible)
    - 2-column card grid using `FlowSheetCard`, gap 16–20px
    - Sort: active first, then archived by end date descending
    - Stack to 1-column below 768px
    - Use `useFlowSheets` and `useProjections` hooks
    - Loading state (`role="status"`), error state (`role="alert"`), empty state message
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15, 15.16_

  - [x] 9.3 Write unit tests for FlowSheets list page
    - Test active sheet appears first
    - Test 2-column grid rendering
    - Test empty state message
    - Test "+ New FlowSheet" button presence
    - _Requirements: 15.4, 15.5, 15.16_

- [x] 10. FlowSheet detail page
  - [x] 10.1 Create `CategoryCard` component in `packages/ui/src/category-card.tsx`
    - Implement `CategoryCardProps` interface
    - Display: category name (15px weight 500), type subtitle ("Income Source" / "Expense Category" 12px `#A8A29E`)
    - Projected amount (13px), actual amount (14px weight 500), progress bar
    - Difference value: positive green for income surplus, Clay Red for expense overspend
    - Edit pencil icon top-right when `isEditable`
    - _Requirements: 16.9, 16.10, 16.11, 16.12_

  - [x] 10.2 Create `apps/web/app/(app)/flowsheets/[id]/page.tsx`
    - Back arrow (←) + FlowSheet name as title (20px weight 500)
    - Date range below title (13px `#A8A29E`)
    - "Active Period" badge (Clay Red) or "Archived" badge (muted)
    - 3 Detail Summary Cards row: Total Income, Total Expenses, Net Balance (each with "Projected: [amount]" subtitle)
    - "Income Sources" section with 2-column `CategoryCard` grid
    - "Expense Categories" section with 2-column `CategoryCard` grid
    - Preserve unlock-to-edit flow for archived sheets
    - Use `useFlowSheet`, `useEntries`, `useCategories`, `useProfile`, `useProjections` hooks
    - Loading/error states, back navigation to `/flowsheets`
    - Category grid stacks to 1-column below 768px
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12, 16.13, 16.14, 16.15, 16.16, 16.17, 16.18_

  - [x] 10.3 Write unit tests for FlowSheet detail page
    - Test summary cards display with projected subtitles
    - Test category cards grouped by income/expense
    - Test overspend Clay Red styling
    - Test back navigation link
    - _Requirements: 16.5, 16.7, 16.8, 16.11, 16.16_

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Transaction Calendar page redesign
  - [x] 12.1 Update `apps/web/app/(app)/calendar/page.tsx`
    - Update page title to "📅 Transaction Calendar" (20px weight 500)
    - Full-width calendar card: white bg, 1px `#E7E5E4` border, 12px radius, 20px padding
    - Transaction dots: 6px circles below date numbers (green = income, Clay Red = expense)
    - Today highlight: blue/purple circle background (`#6366F1` with white text)
    - Month nav arrows right of month/year label, secondary button style
    - Out-of-period days: muted opacity
    - Preserve existing month navigation, entry creation flow, and data hooks
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11, 17.12, 17.13, 17.14, 17.15_

  - [x] 12.2 Write unit tests for Transaction Calendar page
    - Test page title includes calendar emoji
    - Test transaction dot colors by entry type
    - Test today highlight styling
    - _Requirements: 17.1, 17.5, 17.6, 17.8_

- [x] 13. Transactions page
  - [x] 13.1 Create `apps/web/app/(app)/transactions/page.tsx`
    - Page title "All Transactions" (20px weight 500), transaction count right-aligned (14px `#A8A29E`)
    - Full-width list using `TransactionRow` components
    - Entries ordered by date descending
    - Delete icon with confirmation dialog (reuse `DeleteConfirmDialog`)
    - Use `useActiveFlowSheet`, `useEntries`, `useCategories`, `useProfile` hooks
    - Use `useEntryStore` for optimistic delete
    - Empty state: "No transactions yet. Add entries to your FlowSheet to see them here."
    - Loading/error states, `role="list"` and `role="listitem"` accessibility
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.11, 18.12, 18.13, 18.14, 18.15, 18.16_

  - [x] 13.2 Write unit tests for Transactions page
    - Test transaction count display
    - Test delete flow with confirmation
    - Test empty state message
    - Test signed amount formatting
    - _Requirements: 18.1, 18.9, 18.10, 18.7_

- [x] 14. Analytics page
  - [x] 14.1 Create `apps/web/app/(app)/analytics/page.tsx`
    - Page title "Analytics" (20px weight 500) in heading, aria-label
    - 2-column layout (max-width 860px): `SpendingByCategoryChart` left, `MonthlyOverviewChart` right
    - Derive `CategoryExpenseData` from entries + categories for pie chart
    - Use `useTrends` for bar chart, `useEntries` + `useCategories` for pie chart, `useProfile` for currency
    - Stack to 1-column below 768px (pie above bar)
    - Consistent spacing per Design Token Set
    - Loading/error states
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

  - [x] 14.2 Write unit tests for Analytics page
    - Test "Analytics" title (no "Trends" references)
    - Test 2-column layout rendering
    - Test empty state for pie chart
    - _Requirements: 19.1, 19.4, 20.5, 21.1_

- [x] 15. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Mira floating popup chat
  - [x] 16.1 Create `MiraFAB` component in `packages/ui/src/mira-fab.tsx`
    - 56px circle, fixed bottom-right, bg `#44403C`, "?" icon white
    - Shadow `0 4px 12px rgba(0,0,0,0.15)`
    - `aria-label="Open Mira AI coach"`, keyboard-focusable
    - Hidden when popup is open (`isPopupOpen` prop)
    - _Requirements: 22.2, 22.18_

  - [x] 16.2 Create `MiraPopup` component in `packages/ui/src/mira-popup.tsx`
    - Implement `MiraPopupProps` interface
    - Width 360px, max-height 520px, bottom-right corner, white bg, 12px radius, shadow
    - Header: "Mira ✨" (16px weight 500), "AI Budgeting Coach" (12px `#A8A29E`), minimize (−) and close (×) buttons
    - Chat area: scrollable, user bubbles right (dark bg `#44403C` white text), Mira bubbles left (`#F5F5F4` dark text)
    - Welcome message when no messages
    - Input: "Ask Mira anything..." placeholder, send button (Clay Red arrow)
    - Suggestion chips: "How's my spending?", "Show savings", "Give me a tip" (pill buttons, border `#E7E5E4`)
    - `role="dialog"`, `aria-label="Mira AI budgeting coach"`, Escape to close
    - _Requirements: 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10, 22.11, 22.12, 22.13, 22.14, 22.15, 22.16, 22.17_

  - [x] 16.3 Write unit tests for MiraFAB and MiraPopup
    - Test FAB visibility toggle based on popup state
    - Test minimize preserves messages, close resets messages
    - Test suggestion chip submission
    - Test welcome message on empty chat
    - _Requirements: 22.2, 22.6, 22.7, 22.9, 22.12_

- [x] 17. Route changes and cleanup
  - [x] 17.1 Set up route redirects and remove old routes
    - Create `/past` → `/flowsheets` redirect (e.g., `apps/web/app/(app)/past/page.tsx` returns `redirect('/flowsheets')`)
    - Create `/past/[id]` → `/flowsheets/[id]` redirect
    - Create `/trends` → `/analytics` redirect
    - Remove `/mira` page (`apps/web/app/(app)/mira/page.tsx`)
    - Remove `apps/web/components/nav/sidebar.tsx` file
    - Remove `apps/web/components/nav/topbar.tsx` file
    - _Requirements: 2.8, 19.3, 22.1_

  - [x] 17.2 Update `packages/ui` barrel exports
    - Export all new components: `TopTabBar`, `SummaryCard`, `ActiveFlowSheetCard`, `MonthlyOverviewChart`, `RecentTransactionsList`, `CategoryCard`, `SpendingByCategoryChart`, `TransactionRow`, `MiraPopup`, `MiraFAB`
    - Ensure updated `TutorialOverlay` and `FlowSheetCard` exports are correct
    - _Requirements: 14.8_

- [x] 18. Responsive design and dark mode
  - [x] 18.1 Add responsive breakpoints to all new components and pages
    - Summary cards: 3-column → stack vertically below 768px
    - FlowSheet card grid: 2-column → 1-column below 768px
    - Category card grid: 2-column → 1-column below 768px
    - Analytics charts: 2-column → 1-column below 768px (pie above bar)
    - TopTabBar: horizontally scrollable on narrow viewports
    - _Requirements: 10.2, 10.3, 15.10, 16.13, 21.4_

  - [x] 18.2 Verify dark mode support for all new components
    - Ensure all new components use Tamagui theme tokens (`surface1`, `borderColor`, `color`, `background`, etc.) instead of hardcoded hex values for theme-sensitive properties
    - Verify card backgrounds, borders, text colors, and chart colors adapt to dark theme
    - _Requirements: 14.10, 10.1_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All new UI components go in `packages/ui/src/` for Phase 2 mobile reuse
- No backend changes required — all work is frontend-only
- Existing data hooks, Zustand stores, and API integrations are preserved throughout

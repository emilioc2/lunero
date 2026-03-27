# Lunero — Product Overview

**Tagline:** "A calmer way to budget."

Lunero is a calm, nature-inspired personal budgeting app with a minimal, editorial aesthetic (non-banking look). It targets individuals who want effortless manual budget tracking. **Phase 1 is Web only. Phase 2 extends to iOS and Android.**

## Core Concept

The central budgeting unit is a **FlowSheet** — a period-based budget (weekly, monthly, or custom). At period end, the FlowSheet is archived and a fresh one is created automatically.

**Available Balance** = Total Income − (Total Expenses + Total Savings)

## Key Features (Phase 1 — Web MVP)

- Web app (Next.js) with full budgeting functionality
- Manual capture of Income, Expenses, and Savings entries
- FlowSheets with auto-reset, archiving, and re-editable past sheets
- Recurring entry detection and suggestions
- Calendar view with daily breakdowns per FlowSheet
- Trend views: weekly, monthly, yearly
- Custom categories (with defaults for Income, Expense, Savings)
- AI budgeting coach (Mira): capture suggestions, proactive alerts, natural-language queries
- User accounts with email/password and Google sign-in
- Multi-currency support (user sets default; backend handles conversion)
- Dark mode at launch
- Web push notifications for overspend alerts

## Phase 2 (Mobile)

- iOS and Android apps via React Native (Expo)
- Apple Sign-In
- Offline-first with queued sync
- APNs and FCM push notifications

## Out of Scope (MVP)

- Live bank integrations / automatic transaction import
- Advanced investment portfolio tracking
- Balance rollover between periods

## Domain Terminology

| Term | Meaning |
|------|---------|
| FlowSheet | The active budget for a chosen period |
| Available Balance | Income − (Expenses + Savings) |
| Past FlowSheets | Archived, read-only (by default) completed periods |
| Recurring Entry | An entry marked to repeat on a cadence |

## Brand & Design Direction

- Warm neutrals, soft accents, generous whitespace, clear hierarchy
- Typography: modern grotesk (Söhne/Inter) + Plus Jakarta Sans
- Overspend states use soft red; never stress-inducing on calendar
- Category colors: Income → Olive Gray `#6B6F69`, Expenses → Clay Red `#C86D5A`, Savings → Warm Earth `#C4A484`
- Aim for WCAG AA contrast; keyboard and screen-reader support on web

## Non-Functional Targets

- Dashboard load: ~2s on typical 4G
- API median response: <200ms for key endpoints
- Uptime: 99.5% monthly (MVP)
- Security: HTTPS, bcrypt/argon2 password hashing, role-based access, audit logs
- Offline support with queued sync
- Localization-ready (currency, dates, numbers)

# Project Structure

> The project has not been scaffolded yet. This file should be updated once the repo is initialized.

## Phase 1 Structure (Web + Backend)

```
lunero/
├── apps/
│   ├── web/                     # Next.js App Router (Phase 1)
│   │   ├── app/                 # Next.js routes and layouts
│   │   ├── components/          # Web-specific components
│   │   ├── lib/                 # Utility functions, query client setup
│   │   └── .env.local           # Local env vars (never committed)
│   └── mobile/                  # React Native / Expo — Phase 2 only
├── packages/
│   ├── ui/                      # Tamagui shared component library
│   ├── core/                    # Shared business logic (FlowSheet model, balance calc, etc.)
│   └── api-client/              # HTTP wrapper (axios/fetch); consumed by React Query hooks
├── backend/
│   └── src/main/java/com/lunero/
│       ├── flowsheet/
│       ├── entry/
│       ├── category/
│       ├── currency/
│       ├── ai/
│       ├── notification/
│       ├── user/
│       ├── security/            # JWT filter, RBAC, audit log
│       └── common/              # Exception handlers (@ControllerAdvice), shared DTOs, utils
│   └── src/main/resources/
│       ├── application.yml      # Base config
│       ├── application-dev.yml  # Dev profile (local DB, debug logging)
│       └── application-prod.yml # Prod profile (NeonDB, reduced logging)
├── turbo.json                   # Turborepo pipeline (build order, caching)
├── docker-compose.yml           # Local dev: PostgreSQL + backend
└── .kiro/
    └── steering/
```

## Key Architectural Principles

- **Monorepo (Turborepo)** — shared `core` and `ui` packages reduce duplication; ready for Phase 2 mobile.
- **Shared business logic** — FlowSheet balance calculations, period reset logic, and recurring entry detection live in `packages/core`, not in platform-specific code.
- **Web-first (Phase 1)** — no offline queue; web assumes always-online. Offline-first sync is a Phase 2 concern.
- **Backend owns currency conversion** — never convert currencies client-side.
- **Tamagui is the UI source of truth** — do not use platform-native components where a Tamagui equivalent exists.
- **`packages/api-client` is a thin HTTP wrapper** — React Query hooks in `apps/web/lib/` consume it for caching and server state management. Do not put React Query logic inside `api-client`.
- **`backend/common/`** is the home for all cross-cutting backend concerns: `@ControllerAdvice` exception handlers, shared DTOs, audit log utilities. Do not scatter these across domain packages.

## Environment Configuration

### Next.js (`apps/web`)
- Use `.env.local` for local development secrets (never commit this file)
- Use Vercel environment variables for staging and production
- Required variables:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  NEXT_PUBLIC_API_BASE_URL=
  ```

### Spring Boot (`backend`)
- Use Spring profiles: `dev` (local), `prod` (Railway/Render)
- Activate with `--spring.profiles.active=dev`
- Sensitive values (DB URL, API keys) go in environment variables, never in committed yml files
- Required environment variables:
  ```
  DATABASE_URL=
  CLERK_JWKS_URI=
  GEMINI_API_KEY=
  FX_API_KEY=
  ```

## Local Development Setup

A `docker-compose.yml` at the repo root provides a local PostgreSQL instance so you don't depend on NeonDB during development:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: lunero_dev
      POSTGRES_USER: lunero
      POSTGRES_PASSWORD: lunero
    ports:
      - "5432:5432"
```

Start local DB: `docker compose up -d`

## Turborepo Pipeline

`turbo.json` defines build order and caching. The pipeline should ensure `packages/core` and `packages/ui` build before `apps/web`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Domain Model Conventions

- Use the term `FlowSheet` (not "budget period", "cycle", etc.) throughout code and APIs.
- Use `availableBalance` (not "remaining", "leftover") for the computed balance field.
- Entry types are always one of: `income`, `expense`, `savings` (lowercase, singular).
- Category type assignment is immutable after creation (Income / Expense / Savings).

## Naming Conventions

- Files: `kebab-case` for components and modules
- Variables/functions: `camelCase`
- Types/classes/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables/fields: `snake_case`

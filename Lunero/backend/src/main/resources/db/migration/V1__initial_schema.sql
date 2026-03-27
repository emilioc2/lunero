-- Required for the no_overlap EXCLUDE constraint on flow_sheets
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Users (profile data; identity managed by Clerk)
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id       VARCHAR(255) UNIQUE NOT NULL,
    display_name        VARCHAR(255) NOT NULL,
    default_currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
    flowsheet_period    VARCHAR(20) NOT NULL DEFAULT 'monthly',
    theme_preference    VARCHAR(20) NOT NULL DEFAULT 'system',
    overspend_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_step     INTEGER NOT NULL DEFAULT 0,
    tutorial_complete   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FlowSheets
CREATE TABLE flow_sheets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type     VARCHAR(20) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    edit_locked     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_overlap EXCLUDE USING gist (
        user_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (status = 'active')
);

-- Categories
CREATE TABLE categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    entry_type   VARCHAR(20) NOT NULL,
    is_default   BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT category_type_check CHECK (entry_type IN ('income', 'expense', 'savings'))
);

-- Entries
CREATE TABLE entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_sheet_id       UUID NOT NULL REFERENCES flow_sheets(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type          VARCHAR(20) NOT NULL,
    category_id         UUID NOT NULL REFERENCES categories(id),
    amount              NUMERIC(18, 4) NOT NULL,
    currency            VARCHAR(10) NOT NULL,
    converted_amount    NUMERIC(18, 4),
    conversion_rate     NUMERIC(18, 8),
    entry_date          DATE NOT NULL,
    note                TEXT,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    client_updated_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Recurring Entries
CREATE TABLE recurring_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type      VARCHAR(20) NOT NULL,
    category_id     UUID NOT NULL REFERENCES categories(id),
    amount          NUMERIC(18, 4) NOT NULL,
    currency        VARCHAR(10) NOT NULL,
    cadence         VARCHAR(20) NOT NULL,
    note            TEXT,
    is_paused       BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Category Budget Projections
CREATE TABLE category_projections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_sheet_id    UUID NOT NULL REFERENCES flow_sheets(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    projected_amount NUMERIC(18, 4) NOT NULL,
    currency         VARCHAR(10) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (flow_sheet_id, category_id),
    CONSTRAINT positive_projected_amount CHECK (projected_amount > 0)
);

-- Dismissed Alerts
CREATE TABLE dismissed_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type      VARCHAR(50) NOT NULL,
    flow_sheet_id   UUID REFERENCES flow_sheets(id),
    dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, alert_type, flow_sheet_id)
);

-- Audit Log
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL,
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification Tokens
CREATE TABLE notification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform    VARCHAR(20) NOT NULL,
    token       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform, token)
);

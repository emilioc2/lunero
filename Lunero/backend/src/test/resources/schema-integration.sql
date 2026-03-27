-- H2-compatible schema for integration tests
-- Omits btree_gist extension and EXCLUDE constraint (PostgreSQL-only)
-- Uses gen_random_uuid() which H2 supports in PostgreSQL compatibility mode

CREATE TABLE IF NOT EXISTS users (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id       VARCHAR(255) UNIQUE NOT NULL,
    display_name        VARCHAR(255) NOT NULL,
    default_currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
    flowsheet_period    VARCHAR(20) NOT NULL DEFAULT 'monthly',
    theme_preference    VARCHAR(20) NOT NULL DEFAULT 'system',
    overspend_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_step     INTEGER NOT NULL DEFAULT 0,
    tutorial_complete   BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flow_sheets (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    edit_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    entry_type VARCHAR(20) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_sheet_id     UUID NOT NULL REFERENCES flow_sheets(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type        VARCHAR(20) NOT NULL,
    category_id       UUID NOT NULL REFERENCES categories(id),
    amount            NUMERIC(18, 4) NOT NULL,
    currency          VARCHAR(10) NOT NULL,
    converted_amount  NUMERIC(18, 4),
    conversion_rate   NUMERIC(18, 8),
    entry_date        DATE NOT NULL,
    note              TEXT,
    is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
    client_updated_at TIMESTAMP WITH TIME ZONE,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_entries (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type  VARCHAR(20) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    amount      NUMERIC(18, 4) NOT NULL,
    currency    VARCHAR(10) NOT NULL,
    cadence     VARCHAR(20) NOT NULL,
    note        TEXT,
    is_paused   BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_projections (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_sheet_id    UUID NOT NULL REFERENCES flow_sheets(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    projected_amount NUMERIC(18, 4) NOT NULL,
    currency         VARCHAR(10) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (flow_sheet_id, category_id)
);

CREATE TABLE IF NOT EXISTS dismissed_alerts (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type    VARCHAR(50) NOT NULL,
    flow_sheet_id UUID REFERENCES flow_sheets(id),
    dismissed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID NOT NULL,
    action      VARCHAR(20) NOT NULL,
    payload     VARCHAR(4096),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_tokens (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform   VARCHAR(20) NOT NULL,
    token      TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

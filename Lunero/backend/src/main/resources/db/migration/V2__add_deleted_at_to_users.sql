-- Add deleted_at column for soft-delete support (account deletion)
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

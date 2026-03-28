-- Migrate entries.category_id (UUID FK) to entries.category (VARCHAR)
-- Preserves category names by looking them up from the categories table.
-- Made fully idempotent for partial-run recovery.

ALTER TABLE entries ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Only backfill from category_id if that column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'entries' AND column_name = 'category_id'
  ) THEN
    UPDATE entries e
    SET category = c.name
    FROM categories c
    WHERE c.id = e.category_id
      AND e.category IS NULL;
  END IF;
END $$;

UPDATE entries SET category = 'Uncategorized' WHERE category IS NULL;

ALTER TABLE entries ALTER COLUMN category SET NOT NULL;

ALTER TABLE entries DROP COLUMN IF EXISTS category_id;

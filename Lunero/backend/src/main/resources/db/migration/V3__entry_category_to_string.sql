-- Migrate entries.category_id (UUID FK) to entries.category (VARCHAR)
-- Preserves category names by looking them up from the categories table.
-- Made idempotent with IF NOT EXISTS / IF EXISTS guards.

ALTER TABLE entries ADD COLUMN IF NOT EXISTS category VARCHAR(255);

UPDATE entries e
SET category = c.name
FROM categories c
WHERE c.id = e.category_id
  AND e.category IS NULL;

UPDATE entries SET category = 'Uncategorized' WHERE category IS NULL;

ALTER TABLE entries ALTER COLUMN category SET NOT NULL;

ALTER TABLE entries DROP COLUMN IF EXISTS category_id;

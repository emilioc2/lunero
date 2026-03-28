-- Migrate entries.category_id (UUID FK) to entries.category (VARCHAR)
-- Preserves category names by looking them up from the categories table.

ALTER TABLE entries ADD COLUMN category VARCHAR(255);

UPDATE entries e
SET category = c.name
FROM categories c
WHERE c.id = e.category_id;

UPDATE entries SET category = 'Uncategorized' WHERE category IS NULL;

ALTER TABLE entries ALTER COLUMN category SET NOT NULL;

ALTER TABLE entries DROP COLUMN category_id;

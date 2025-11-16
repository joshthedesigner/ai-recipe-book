-- Add sections column to recipes to support structured sections
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT NULL;

-- Optional: GIN index for contains/exists queries on sections (safe no-op if re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relname = 'idx_recipes_sections_gin'
    AND    n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_recipes_sections_gin ON recipes USING GIN (sections);
  END IF;
END$$;




-- Add public flag to recipes (default TRUE — all recipes are public)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Mark all existing recipes as public
UPDATE recipes SET is_public = TRUE WHERE is_public IS NULL;

-- Allow any authenticated user to read public recipes
CREATE POLICY "Users can view public recipes"
  ON recipes FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_public = TRUE
  );

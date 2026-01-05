-- Add Favorites Table
-- Creates a many-to-many relationship between users and recipes for favorites

-- ========================================
-- TABLE: favorites
-- ========================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate favorites (user can't favorite same recipe twice)
  UNIQUE(user_id, recipe_id)
);

-- ========================================
-- INDEXES
-- ========================================

-- Index for faster lookups by user (for favorites page)
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- Index for faster lookups by recipe (for checking if recipe is favorited)
CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id);

-- Composite index for efficient user+recipe lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_recipe ON favorites(user_id, recipe_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can read their own favorites
CREATE POLICY favorites_select_own
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY favorites_insert_own
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY favorites_delete_own
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE favorites IS 'User favorites - many-to-many relationship between users and recipes';


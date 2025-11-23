-- ============================================================================
-- Recipe Notes Feature Migration
-- 
-- Adds recipe_notes table for users to add notes and photos to recipes.
-- Notes appear in the feed chronologically with recipes.
-- ============================================================================

-- Create recipe_notes table
CREATE TABLE IF NOT EXISTS recipe_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}', -- Array of Supabase Storage URLs
  -- Denormalized fields for feed queries (avoid joins)
  recipe_title TEXT, -- Denormalized from recipes table
  recipe_image_url TEXT, -- Denormalized from recipes table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_notes_recipe_id ON recipe_notes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_notes_user_id ON recipe_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_notes_created_at ON recipe_notes(created_at DESC);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipe_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_notes_updated_at
  BEFORE UPDATE ON recipe_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_notes_updated_at();

-- Enable RLS
ALTER TABLE recipe_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read notes for recipes they have access to (same logic as recipes)
CREATE POLICY "Users can read notes for accessible recipes"
  ON recipe_notes FOR SELECT
  USING (
    -- User is the note creator
    user_id = auth.uid()
    OR
    -- User owns the recipe
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid()
    )
    OR
    -- User owns the group
    recipe_id IN (
      SELECT r.id 
      FROM recipes r
      JOIN recipe_groups rg ON r.group_id = rg.id
      WHERE rg.owner_id = auth.uid()
    )
    OR
    -- User is a member of the group
    recipe_id IN (
      SELECT r.id
      FROM recipes r
      JOIN group_members gm ON r.group_id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    )
    OR
    -- User is friends with the group owner
    recipe_id IN (
      SELECT r.id
      FROM recipes r
      JOIN recipe_groups rg ON r.group_id = rg.id
      JOIN friends f ON (
        (f.user_a_id = auth.uid() AND f.user_b_id = rg.owner_id)
        OR
        (f.user_a_id = rg.owner_id AND f.user_b_id = auth.uid())
      )
      WHERE f.status = 'accepted'
    )
  );

-- Only recipe owners can create notes
CREATE POLICY "Only recipe owners can create notes"
  ON recipe_notes FOR INSERT
  WITH CHECK (
    -- Must be authenticated user
    auth.uid() = user_id
    AND
    -- User must own the recipe
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid()
    )
  );

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
  ON recipe_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON recipe_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE recipe_notes IS 'User notes and photos for recipes, visible to friends in same groups';
COMMENT ON COLUMN recipe_notes.photo_urls IS 'Array of Supabase Storage URLs for note photos';
COMMENT ON COLUMN recipe_notes.recipe_title IS 'Denormalized recipe title for feed queries';
COMMENT ON COLUMN recipe_notes.recipe_image_url IS 'Denormalized recipe image URL for feed queries';


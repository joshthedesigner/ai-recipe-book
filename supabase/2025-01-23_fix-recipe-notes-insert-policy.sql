-- ============================================================================
-- Fix Recipe Notes Insert Policy
-- 
-- Updates the INSERT policy to only allow recipe owners to create notes
-- (previously allowed anyone who could view the recipe)
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create notes for accessible recipes" ON recipe_notes;

-- Create new policy: Only recipe owners can create notes
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


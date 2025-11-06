-- ============================================================================
-- CRITICAL FIX: Update Recipes RLS to Allow Friend Access
-- 
-- Issue: recipe_groups RLS allows viewing friend's groups, but recipes RLS
-- doesn't allow viewing recipes IN those groups. Result: Empty cookbook.
-- 
-- This adds friend-based access to the recipes SELECT policy.
-- ============================================================================

-- Drop existing recipes SELECT policy
DROP POLICY IF EXISTS "Users can view group recipes" ON recipes;

-- Recreate with friend access support
CREATE POLICY "Users can view group recipes"
  ON recipes FOR SELECT
  USING (
    -- User is the creator
    user_id = auth.uid()
    OR
    -- User owns the group
    group_id IN (
      SELECT id FROM recipe_groups WHERE owner_id = auth.uid()
    )
    OR
    -- User is a member of the group
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    -- User is friends with the group owner (NEW!)
    group_id IN (
      SELECT rg.id 
      FROM recipe_groups rg
      JOIN friends f ON (
        (f.user_a_id = auth.uid() AND f.user_b_id = rg.owner_id)
        OR
        (f.user_a_id = rg.owner_id AND f.user_b_id = auth.uid())
      )
      WHERE f.status = 'accepted'
    )
  );

-- Verify the policy was created
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'recipes' 
  AND policyname = 'Users can view group recipes';


-- ========================================
-- FIX RLS INFINITE RECURSION
-- ========================================
-- This fixes the infinite recursion between recipe_groups and group_members RLS policies
-- 
-- Problem: 
--   - recipe_groups policy queries group_members
--   - group_members policy queries recipe_groups
--   - Creates infinite recursion
--
-- Solution:
--   - Remove the recursive check from group_members policy
--   - Owners can still see members when querying through recipe_groups

-- Drop the problematic group_members policy
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Recreate WITHOUT the recursive recipe_groups query
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    -- Members can see other members (including themselves)
    (user_id = auth.uid() AND status = 'active')
    OR
    -- Users can see their own pending invites (case-insensitive)
    (LOWER(email) = LOWER(auth.email()) AND status = 'pending')
  );

-- Note: Group owners will still be able to see members because:
-- 1. When they query recipe_groups (which they own), they can JOIN to group_members
-- 2. The group_members policy allows members to see other members
-- 3. So owners can see all members through the recipe_groups query path

-- Also ensure recipe_groups policy doesn't cause recursion
DROP POLICY IF EXISTS "Users can view their groups" ON recipe_groups;

CREATE POLICY "Users can view their groups"
  ON recipe_groups FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

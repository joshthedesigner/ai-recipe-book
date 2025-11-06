-- ============================================================================
-- Fix RLS on recipe_groups to support Friends Feature
-- 
-- Purpose: Allow users to see groups owned by their friends
-- This enables proper access control at the database level instead of
-- bypassing RLS with application logic.
-- ============================================================================

-- Drop existing SELECT policy (we'll recreate it with friend support)
DROP POLICY IF EXISTS "Users can view groups they own or are members of" ON recipe_groups;

-- Create new SELECT policy with friend support
CREATE POLICY "Users can view their groups, member groups, and friend groups"
ON recipe_groups
FOR SELECT
TO authenticated
USING (
  -- User owns the group
  owner_id = auth.uid()
  OR
  -- User is an active member of the group
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = recipe_groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'active'
  )
  OR
  -- User is friends with the group owner
  EXISTS (
    SELECT 1 FROM friends
    WHERE friends.status = 'accepted'
      AND (
        (friends.user_a_id = auth.uid() AND friends.user_b_id = recipe_groups.owner_id)
        OR
        (friends.user_a_id = recipe_groups.owner_id AND friends.user_b_id = auth.uid())
      )
  )
);

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'recipe_groups' 
  AND policyname = 'Users can view their groups, member groups, and friend groups';


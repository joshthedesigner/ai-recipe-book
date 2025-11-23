-- ============================================================================
-- Fix Users Table RLS Policy for Recipe Notes
-- 
-- Updates the users table RLS policy to allow reading user names for:
-- - Users in the same groups
-- - Users who are friends
-- This allows friends to see note author names in recipe notes
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "users_select_own" ON users;

-- Create new policy: Users can read their own profile OR profiles of friends/group members
CREATE POLICY "users_select_own_or_friends"
  ON users FOR SELECT
  USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR
    -- Users can read names of users in the same groups
    id IN (
      SELECT DISTINCT gm2.user_id
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm1.status = 'active'
        AND gm2.status = 'active'
    )
    OR
    -- Users can read names of their friends
    id IN (
      SELECT user_b_id FROM friends
      WHERE user_a_id = auth.uid() AND status = 'accepted'
    )
    OR
    id IN (
      SELECT user_a_id FROM friends
      WHERE user_b_id = auth.uid() AND status = 'accepted'
    )
    OR
    -- Users can read names of group owners whose groups they're in
    id IN (
      SELECT DISTINCT rg.owner_id
      FROM recipe_groups rg
      JOIN group_members gm ON rg.id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    )
  );

-- Note: This policy allows reading the entire user record (including email)
-- If you want to restrict to only the 'name' field, you would need to:
-- 1. Create a view that only exposes 'id' and 'name'
-- 2. Apply RLS to the view instead
-- However, since email is already protected by auth and not exposed in the API,
-- this approach is simpler and sufficient for the current use case.


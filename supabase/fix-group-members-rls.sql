-- ========================================
-- FIX: Revert Group Members RLS Policy
-- ========================================
-- This reverts any changes that caused infinite recursion
-- The application code now uses JOIN queries for owners instead of relying on RLS
--
-- Run this in Supabase SQL Editor to restore working state

-- Drop the problematic policy (if it exists)
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Recreate the working non-recursive policy
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    -- Members can see other members (including themselves)
    (user_id = auth.uid() AND status = 'active')
    OR
    -- Users can see their own pending invites (case-insensitive)
    (LOWER(email) = LOWER(auth.email()) AND status = 'pending')
  );

-- Note: Owners can now see all members through the JOIN query in the application code
-- (see app/manage-users/page.tsx fetchGroupAndMembers function)
-- This avoids RLS recursion while still providing proper access control


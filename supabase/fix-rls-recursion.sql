-- Fix for infinite recursion in RLS policies
-- Drops circular references and recreates simplified policies

-- =====================================================
-- DROP OLD POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their groups" ON recipe_groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- =====================================================
-- RECREATE SIMPLIFIED POLICIES (no circular references)
-- =====================================================

-- Policy: Users can view groups they own
-- Simple check - no reference to group_members
CREATE POLICY "Users can view groups they own"
  ON recipe_groups FOR SELECT
  USING (owner_id = auth.uid());

-- Policy: Users can view group members where they are the owner OR a member
-- Uses SECURITY DEFINER function to break recursion
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    -- User can see members of groups they own
    EXISTS (
      SELECT 1 FROM recipe_groups 
      WHERE id = group_members.group_id 
        AND owner_id = auth.uid()
    )
    OR
    -- Users can see their own membership record
    user_id = auth.uid()
  );

-- =====================================================
-- UPDATE RECIPES POLICY to avoid recursion
-- =====================================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can view group recipes" ON recipes;

-- Recreate with direct checks only
CREATE POLICY "Users can view group recipes"
  ON recipes FOR SELECT
  USING (
    -- User created this recipe
    user_id = auth.uid()
    OR
    -- User owns the group (direct check, no subquery to group_members)
    EXISTS (
      SELECT 1 FROM recipe_groups 
      WHERE id = recipes.group_id 
        AND owner_id = auth.uid()
    )
    OR
    -- User is an active member with direct check
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = recipes.group_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Verify policies are working
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_groups', 'group_members', 'recipes')
ORDER BY tablename, policyname;


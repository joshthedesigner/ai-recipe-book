-- ============================================================================
-- CRITICAL SECURITY FIX: Remove Overly Permissive Recipe Policy
-- 
-- Issue: recipes_select_all policy allows ANY user to see ALL recipes
-- This is a development/testing policy that should NOT exist in production
-- 
-- Impact: Without this fix, any authenticated user can view all recipes
-- regardless of group membership or friendship status
-- ============================================================================

-- Drop the dangerous policy
DROP POLICY IF EXISTS recipes_select_all ON recipes;

-- Drop other old policies that might conflict
DROP POLICY IF EXISTS recipes_insert_own ON recipes;
DROP POLICY IF EXISTS recipes_update_own ON recipes;
DROP POLICY IF EXISTS recipes_delete_own ON recipes;

-- Verify only the correct group-based policies exist
-- These should be from roles-permissions-migration.sql:
-- 1. "Users can view group recipes" - Scoped to groups user has access to
-- 2. "Users can create recipes with write access" - Only in groups they can write to
-- 3. "Users can update their own recipes" - Only recipes they created
-- 4. "Users can delete recipes" - Own recipes OR group owner can delete

-- List remaining policies to verify:
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'recipes'
ORDER BY policyname;

-- Expected policies (from roles-permissions-migration.sql):
-- 1. Users can view group recipes
-- 2. Users can create recipes with write access  
-- 3. Users can update their own recipes
-- 4. Users can delete recipes

-- If you see ONLY these 4 policies, you're secure!
-- If you see recipes_select_all or other old policies, they need to be dropped.


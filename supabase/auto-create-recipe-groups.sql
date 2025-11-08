-- ========================================
-- AUTO-CREATE RECIPE GROUPS FOR NEW USERS
-- ========================================
-- 
-- Problem: New users don't have recipe_groups entries
-- This causes get_friends_groups() JOIN to fail
-- Friends exist but their groups don't, so they don't appear in group switcher
--
-- Solution: Auto-create recipe_groups when user signs up
--
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Create Function to Generate Recipe Group
-- ========================================

CREATE OR REPLACE FUNCTION create_user_recipe_group()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create default recipe group for new user
  -- Use their name from metadata, or email if no name
  INSERT INTO recipe_groups (name, owner_id, created_at, updated_at)
  VALUES (
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)  -- Use email prefix if no name
    ) || '''s RecipeBook',
    NEW.id,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- ========================================
-- STEP 2: Create Trigger on User Creation
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_group ON auth.users;

-- Create trigger that fires after user is created
CREATE TRIGGER on_auth_user_created_create_group
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_recipe_group();

-- ========================================
-- STEP 3: Backfill Existing Users (One-Time)
-- ========================================

-- Create recipe groups for existing users who don't have one
INSERT INTO recipe_groups (name, owner_id, created_at, updated_at)
SELECT 
  COALESCE(
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ) || '''s RecipeBook' as name,
  u.id as owner_id,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE u.id NOT IN (
  SELECT owner_id FROM recipe_groups
)
AND u.deleted_at IS NULL;  -- Only active users

-- ========================================
-- VERIFICATION
-- ========================================

-- Check that all users now have recipe groups
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT rg.owner_id) as users_with_groups,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT rg.owner_id) as users_missing_groups
FROM auth.users u
LEFT JOIN recipe_groups rg ON rg.owner_id = u.id
WHERE u.deleted_at IS NULL;

-- Expected: users_missing_groups should be 0

-- List any users still missing groups (should be empty)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.created_at
FROM auth.users u
LEFT JOIN recipe_groups rg ON rg.owner_id = u.id
WHERE rg.id IS NULL
  AND u.deleted_at IS NULL;

-- ========================================
-- SUCCESS
-- ========================================
-- ✅ All new users will automatically get recipe_groups
-- ✅ All existing users now have recipe_groups
-- ✅ get_friends_groups() JOIN will always succeed
-- ✅ Friends will appear in dropdown immediately

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- DROP TRIGGER IF EXISTS on_auth_user_created_create_group ON auth.users;
-- DROP FUNCTION IF EXISTS create_user_recipe_group();
-- Note: Does not delete recipe_groups (those are real data)


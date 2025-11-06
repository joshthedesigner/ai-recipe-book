-- ============================================================================
-- Remove group_members System (Replaced by Friends Feature)
-- 
-- Purpose: Clean up old group members tables and functions
-- This migration removes the one-way sharing system in favor of Friends
-- 
-- IMPORTANT: This will break access for existing group members!
-- Run this only after confirming all users have been migrated to Friends
-- or after confirming it's acceptable to lose existing member access.
-- ============================================================================

-- Drop RPC functions (in reverse dependency order)
DROP FUNCTION IF EXISTS activate_user_invite(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS delete_group_member_for_owner(UUID, UUID);
DROP FUNCTION IF EXISTS get_group_members_for_owner(UUID);

-- Drop the group_members table (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS group_members CASCADE;

-- Verify cleanup
SELECT 
  'Remaining group_members objects:' AS status,
  COUNT(*) AS count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'group_members';

SELECT 
  'Remaining group member functions:' AS status,
  COUNT(*) AS count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('activate_user_invite', 'delete_group_member_for_owner', 'get_group_members_for_owner');


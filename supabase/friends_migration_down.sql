-- ========================================
-- Friends Feature Migration (DOWN)
-- ========================================
-- Complete rollback of Friends feature
-- Removes all tables, functions, and indexes
--
-- Run this in Supabase SQL Editor to fully revert

-- Drop functions
DROP FUNCTION IF EXISTS get_my_friends();
DROP FUNCTION IF EXISTS activate_friend_invite(UUID, UUID, TEXT);

-- Drop table (CASCADE removes all dependent objects)
DROP TABLE IF EXISTS friends CASCADE;

-- ROLLBACK NOTE: This completely removes all Friends feature database artifacts
-- All friend relationships and pending invites will be permanently deleted


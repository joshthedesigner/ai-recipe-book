-- ========================================
-- Feed View Tracking Migration
-- ========================================
-- Adds last_feed_view_at column to users table for tracking
-- when users last viewed their feed to show new recipe notifications
--
-- Run this in Supabase SQL Editor
-- ROLLBACK: ALTER TABLE users DROP COLUMN last_feed_view_at;

-- Add column to track last feed view timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_feed_view_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_feed_view 
ON users(last_feed_view_at);

-- Add comment for documentation
COMMENT ON COLUMN users.last_feed_view_at IS 
'Timestamp of when user last viewed their friends feed. NULL means never viewed (all recipes are new).';


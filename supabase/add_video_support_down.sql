-- ========================================
-- Rollback Video Recipe Support
-- ========================================

-- Drop index
DROP INDEX IF EXISTS idx_recipes_video_url;

-- Remove video columns
ALTER TABLE recipes 
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_platform;


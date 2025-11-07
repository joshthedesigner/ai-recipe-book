-- ========================================
-- Video Recipe Support Migration
-- ========================================
-- Adds video URL and platform support to recipes table
-- Allows embedding YouTube, TikTok, Instagram videos in recipe pages
--
-- ROLLBACK: See add_video_support_down.sql

-- Add video columns to recipes table
ALTER TABLE recipes 
  ADD COLUMN video_url TEXT,
  ADD COLUMN video_platform TEXT CHECK (video_platform IN ('youtube', 'tiktok', 'instagram', 'direct'));

-- Create index for video queries
CREATE INDEX idx_recipes_video_url ON recipes(video_url) WHERE video_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN recipes.video_url IS 'URL to embedded video (YouTube, TikTok, Instagram, or direct video file)';
COMMENT ON COLUMN recipes.video_platform IS 'Platform hosting the video: youtube, tiktok, instagram, or direct';


-- Add cookbook source fields to recipes table
-- Run this migration in Supabase SQL Editor

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS cookbook_name TEXT,
ADD COLUMN IF NOT EXISTS cookbook_page TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN recipes.cookbook_name IS 'Name of cookbook if recipe is from a physical cookbook';
COMMENT ON COLUMN recipes.cookbook_page IS 'Page number in cookbook if recipe is from a physical cookbook';


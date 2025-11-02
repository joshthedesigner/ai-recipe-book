-- Fix for recipes missing group_id after migration
-- This ensures all recipes are linked to their creator's group

-- Update any recipes that don't have a group_id
UPDATE recipes
SET group_id = (
  SELECT id FROM recipe_groups WHERE owner_id = recipes.user_id LIMIT 1
)
WHERE group_id IS NULL AND user_id IS NOT NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_recipes,
  COUNT(group_id) as recipes_with_group,
  COUNT(*) - COUNT(group_id) as recipes_missing_group
FROM recipes;


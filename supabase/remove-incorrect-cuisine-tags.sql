-- Remove Incorrect Cuisine Tags from Recipes
-- This removes all cuisine tags so they can be re-applied correctly
-- Run this BEFORE running the /api/recipes/fix-tags-and-embeddings endpoint

-- Remove all cuisine tags (main cuisines + regional variants)
UPDATE recipes
SET tags = array(
  SELECT tag 
  FROM unnest(tags) AS tag
  WHERE tag NOT IN (
    -- Main cuisines
    'chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
    'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean',
    -- Regional variants
    'goan', 'punjabi', 'bengali', 'south indian', 'north indian', 'gujarati', 'maharashtrian',
    'sichuan', 'szechuan', 'cantonese', 'hunan', 'shanghainese',
    'tuscan', 'neapolitan', 'sicilian', 'roman',
    'tex-mex', 'oaxacan', 'yucatecan',
    'cajun', 'creole', 'southern',
    'provençal', 'alsatian', 'breton',
    'okinawan',
    'catalan', 'andalusian', 'basque',
    'lebanese', 'turkish', 'persian', 'moroccan'
  )
)
WHERE tags && ARRAY[
  'chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
  'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean',
  'goan', 'punjabi', 'bengali', 'south indian', 'north indian', 'gujarati', 'maharashtrian',
  'sichuan', 'szechuan', 'cantonese', 'hunan', 'shanghainese',
  'tuscan', 'neapolitan', 'sicilian', 'roman',
  'tex-mex', 'oaxacan', 'yucatecan',
  'cajun', 'creole', 'southern',
  'provençal', 'alsatian', 'breton',
  'okinawan',
  'catalan', 'andalusian', 'basque',
  'lebanese', 'turkish', 'persian', 'moroccan'
];

-- Show summary
SELECT 
  COUNT(*) as total_recipes,
  COUNT(*) FILTER (WHERE tags && ARRAY[
    'chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
    'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean'
  ]) as recipes_still_with_cuisine_tags
FROM recipes;


-- Sample Test Data for AI Recipe Book
-- Run this AFTER setting up authentication and creating a test user

-- ========================================
-- INSTRUCTIONS
-- ========================================
-- 1. Sign up a test user through your app or Supabase Auth UI
-- 2. Get the user's UUID from the auth.users table
-- 3. Replace 'YOUR_USER_ID_HERE' below with the actual UUID
-- 4. Run this script in the SQL Editor

-- ========================================
-- INSERT TEST USER (if not using auth yet)
-- ========================================

-- If you're not using authentication yet, you can create a test user:
INSERT INTO users (id, email, name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- INSERT TEST RECIPES
-- ========================================

-- Note: Replace the user_id below with your actual user ID
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

-- Recipe 1: Classic Spaghetti Carbonara
INSERT INTO recipes (
  user_id, 
  title, 
  ingredients, 
  steps, 
  tags, 
  contributor_name,
  source_url
) VALUES (
  test_user_id,
  'Classic Spaghetti Carbonara',
  '["400g spaghetti", "200g pancetta or guanciale", "4 large eggs", "100g Pecorino Romano cheese, grated", "Black pepper", "Salt"]'::jsonb,
  '["Boil water and cook spaghetti until al dente", "Meanwhile, dice pancetta and fry until crispy", "Beat eggs with grated cheese and black pepper", "Drain pasta, reserving 1 cup pasta water", "Remove pan from heat, add pasta to pancetta", "Quickly mix in egg mixture, adding pasta water to create creamy sauce", "Serve immediately with extra cheese"]'::jsonb,
  ARRAY['pasta', 'italian', 'dinner', 'quick'],
  'Test User',
  NULL
);

-- Recipe 2: Chocolate Chip Cookies
INSERT INTO recipes (
  user_id, 
  title, 
  ingredients, 
  steps, 
  tags, 
  contributor_name
) VALUES (
  test_user_id,
  'Perfect Chocolate Chip Cookies',
  '["2 1/4 cups flour", "1 tsp baking soda", "1 tsp salt", "1 cup butter, softened", "3/4 cup sugar", "3/4 cup brown sugar", "2 large eggs", "2 tsp vanilla extract", "2 cups chocolate chips"]'::jsonb,
  '["Preheat oven to 375°F (190°C)", "Mix flour, baking soda, and salt in a bowl", "Beat butter and sugars until creamy", "Add eggs and vanilla, beat well", "Gradually mix in flour mixture", "Stir in chocolate chips", "Drop rounded tablespoons onto baking sheets", "Bake 9-11 minutes until golden", "Cool on baking sheet for 2 minutes, then transfer to wire rack"]'::jsonb,
  ARRAY['dessert', 'cookies', 'baking', 'chocolate'],
  'Test User'
);

-- Recipe 3: Simple Green Salad
INSERT INTO recipes (
  user_id, 
  title, 
  ingredients, 
  steps, 
  tags, 
  contributor_name,
  source_url
) VALUES (
  test_user_id,
  'Fresh Green Salad with Lemon Vinaigrette',
  '["6 cups mixed greens", "1 cucumber, sliced", "1 cup cherry tomatoes, halved", "1/4 red onion, thinly sliced", "3 tbsp olive oil", "1 lemon, juiced", "1 tsp Dijon mustard", "Salt and pepper"]'::jsonb,
  '["Wash and dry greens thoroughly", "Combine greens, cucumber, tomatoes, and onion in large bowl", "Whisk together olive oil, lemon juice, mustard, salt, and pepper", "Toss salad with dressing just before serving"]'::jsonb,
  ARRAY['salad', 'healthy', 'vegetarian', 'quick', 'lunch'],
  'Test User',
  'https://example.com/green-salad'
);

-- Recipe 4: Chicken Stir-Fry
INSERT INTO recipes (
  user_id, 
  title, 
  ingredients, 
  steps, 
  tags, 
  contributor_name
) VALUES (
  test_user_id,
  'Quick Chicken Stir-Fry',
  '["500g chicken breast, sliced", "2 bell peppers, sliced", "1 broccoli head, florets", "2 carrots, julienned", "3 cloves garlic, minced", "1 inch ginger, grated", "3 tbsp soy sauce", "1 tbsp oyster sauce", "2 tsp sesame oil", "2 tbsp vegetable oil", "Cooked rice for serving"]'::jsonb,
  '["Heat vegetable oil in wok or large pan over high heat", "Add chicken and stir-fry until cooked, about 5 minutes, remove and set aside", "Add more oil if needed, stir-fry vegetables until tender-crisp", "Add garlic and ginger, cook 30 seconds", "Return chicken to pan", "Add soy sauce, oyster sauce, and sesame oil", "Toss everything together for 2 minutes", "Serve over rice"]'::jsonb,
  ARRAY['chicken', 'stir-fry', 'dinner', 'asian', 'quick'],
  'Test User'
);

-- Recipe 5: Banana Bread
INSERT INTO recipes (
  user_id, 
  title, 
  ingredients, 
  steps, 
  tags, 
  contributor_name
) VALUES (
  test_user_id,
  'Moist Banana Bread',
  '["3 ripe bananas, mashed", "1/3 cup melted butter", "3/4 cup sugar", "1 egg, beaten", "1 tsp vanilla", "1 tsp baking soda", "Pinch of salt", "1 1/2 cups flour"]'::jsonb,
  '["Preheat oven to 350°F (175°C)", "Grease a 9x5 loaf pan", "Mix mashed bananas and melted butter", "Mix in sugar, egg, and vanilla", "Sprinkle baking soda and salt over mixture, stir", "Add flour, mix until just combined (don''t overmix)", "Pour into prepared pan", "Bake 60-65 minutes until toothpick comes out clean", "Cool in pan 10 minutes, then turn out onto wire rack"]'::jsonb,
  ARRAY['baking', 'bread', 'breakfast', 'snack', 'banana'],
  'Test User'
);

END $$;

-- ========================================
-- VERIFY DATA
-- ========================================

-- Check that recipes were inserted
SELECT 
  title, 
  contributor_name, 
  array_length(tags, 1) as tag_count,
  created_at
FROM recipes
ORDER BY created_at DESC;

-- ========================================
-- NOTE ABOUT EMBEDDINGS
-- ========================================

-- The embedding column will be NULL for these test recipes
-- Embeddings will be generated by the Store Recipe Agent when:
-- 1. Users add recipes through the app
-- 2. We run a batch embedding script (Phase 4)

-- For now, these recipes won't appear in vector similarity searches
-- But they will appear in regular searches by title, tags, etc.


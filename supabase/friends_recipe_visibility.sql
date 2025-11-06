-- ========================================
-- Friends Recipe Visibility
-- ========================================
-- Adds ability for friends to see each other's recipes
-- Friends can view recipes from groups their friends OWN
--
-- Run this AFTER friends_migration_up.sql
-- ROLLBACK: Just drop this function, no table changes needed

-- Function to get recipes from friends' owned groups
CREATE OR REPLACE FUNCTION get_friends_recipes(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  group_id uuid,
  title text,
  ingredients jsonb,
  steps jsonb,
  tags text[],
  source_url text,
  image_url text,
  cookbook_name text,
  cookbook_author text,
  cookbook_isbn text,
  contributor_name text,
  created_at timestamptz,
  updated_at timestamptz,
  friend_name text,
  friend_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    r.id,
    r.user_id,
    r.group_id,
    r.title,
    r.ingredients,
    r.steps,
    r.tags,
    r.source_url,
    r.image_url,
    r.cookbook_name,
    r.cookbook_author,
    r.cookbook_isbn,
    r.contributor_name,
    r.created_at,
    r.updated_at,
    u.raw_user_meta_data->>'name' AS friend_name,
    u.email AS friend_email
  FROM recipes r
  JOIN recipe_groups rg ON r.group_id = rg.id
  JOIN auth.users u ON rg.owner_id = u.id
  WHERE rg.owner_id IN (
    -- Get all my friends' IDs
    SELECT 
      CASE 
        WHEN f.user_a_id = auth.uid() THEN f.user_b_id
        ELSE f.user_a_id
      END
    FROM friends f
    WHERE (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
      AND f.status = 'accepted'
  )
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_friends_recipes(INT, INT) TO authenticated;

COMMENT ON FUNCTION get_friends_recipes(INT, INT) IS 
  'Returns recipes from groups owned by the current user''s friends. Friends can view but not edit.';

-- Function to get recipes from a specific friend
CREATE OR REPLACE FUNCTION get_friend_recipes(
  friend_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  group_id uuid,
  title text,
  ingredients jsonb,
  steps jsonb,
  tags text[],
  source_url text,
  image_url text,
  cookbook_name text,
  cookbook_author text,
  cookbook_isbn text,
  contributor_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verify friendship exists
  SELECT 
    r.id,
    r.user_id,
    r.group_id,
    r.title,
    r.ingredients,
    r.steps,
    r.tags,
    r.source_url,
    r.image_url,
    r.cookbook_name,
    r.cookbook_author,
    r.cookbook_isbn,
    r.contributor_name,
    r.created_at,
    r.updated_at
  FROM recipes r
  JOIN recipe_groups rg ON r.group_id = rg.id
  WHERE rg.owner_id = friend_user_id
    AND EXISTS (
      SELECT 1 FROM friends f
      WHERE ((f.user_a_id = auth.uid() AND f.user_b_id = friend_user_id)
         OR (f.user_b_id = auth.uid() AND f.user_a_id = friend_user_id))
        AND f.status = 'accepted'
    )
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_friend_recipes(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION get_friend_recipes(UUID, INT, INT) IS 
  'Returns recipes from a specific friend''s owned groups. Verifies friendship before returning data.';


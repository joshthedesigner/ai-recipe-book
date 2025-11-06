-- ========================================
-- Friends Groups Integration
-- ========================================
-- Allows friends' owned groups to appear in the group switcher
-- Run this AFTER friends_migration_up.sql
--
-- ROLLBACK: Just drop this function, no table changes needed

-- Function to get owned groups of all friends
CREATE OR REPLACE FUNCTION get_friends_groups()
RETURNS TABLE (
  group_id uuid,
  group_name text,
  friend_id uuid,
  friend_name text,
  friend_email text,
  friended_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rg.id AS group_id,
    rg.name AS group_name,
    CASE 
      WHEN f.user_a_id = auth.uid() THEN f.user_b_id
      ELSE f.user_a_id
    END AS friend_id,
    u.raw_user_meta_data->>'name' AS friend_name,
    u.email AS friend_email,
    f.responded_at AS friended_at
  FROM friends f
  JOIN auth.users u ON (
    CASE 
      WHEN f.user_a_id = auth.uid() THEN f.user_b_id
      ELSE f.user_a_id
    END = u.id
  )
  JOIN recipe_groups rg ON rg.owner_id = u.id
  WHERE (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
    AND f.status = 'accepted'
  ORDER BY u.raw_user_meta_data->>'name', rg.name;
$$;

GRANT EXECUTE ON FUNCTION get_friends_groups() TO authenticated;

COMMENT ON FUNCTION get_friends_groups() IS 
  'Returns all owned recipe groups of the current user''s friends for display in group switcher.';


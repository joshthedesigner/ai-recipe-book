-- ============================================================================
-- RPC Function: remove_friend
-- 
-- Purpose: Safely remove a friend relationship without string interpolation
-- This replaces direct DELETE queries with parameterized RPC call
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_friend(friend_uuid UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the friendship (bidirectional check)
  -- Only the authenticated user can remove their own friendships
  DELETE FROM friends
  WHERE status = 'accepted'
    AND (
      (user_a_id = auth.uid() AND user_b_id = friend_uuid)
      OR (user_a_id = friend_uuid AND user_b_id = auth.uid())
    );
  
  -- Verify something was deleted
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found or already removed';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_friend(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION remove_friend(UUID) IS 
  'Removes a friend relationship for the authenticated user. Only allows removing your own friendships. Uses proper parameterization instead of string interpolation.';


-- ========================================
-- Friends Feature Migration (UP)
-- ========================================
-- Creates friends table with invite + relationship tracking
-- Follows existing RPC activation pattern (like activate_user_invite)
--
-- Run this in Supabase SQL Editor
-- ROLLBACK: Run friends_migration_down.sql

-- Friends table (invites + relationships in one)
CREATE TABLE friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  -- Ordered IDs only required for accepted friendships
  CONSTRAINT ordered_users_when_accepted 
    CHECK (
      status != 'accepted' 
      OR (user_a_id IS NOT NULL AND user_b_id IS NOT NULL AND user_a_id < user_b_id)
    ),
  
  -- Prevent self-friendship
  CONSTRAINT no_self_friend 
    CHECK (user_a_id IS NULL OR user_b_id IS NULL OR user_a_id != user_b_id)
);

-- Prevent duplicate pending invites
CREATE UNIQUE INDEX unique_pending_invite
  ON friends(requester_id, invited_email)
  WHERE status = 'pending';

-- Indexes for performance
CREATE INDEX idx_friends_user_a ON friends(user_a_id) WHERE status = 'accepted';
CREATE INDEX idx_friends_user_b ON friends(user_b_id) WHERE status = 'accepted';
CREATE INDEX idx_friends_pending_email ON friends(invited_email) WHERE status = 'pending';
CREATE INDEX idx_friends_requester ON friends(requester_id);

-- Enable RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: Simplified to avoid auth.users subqueries which cause permission issues
CREATE POLICY "Users can view and manage their friend data"
  ON friends FOR ALL
  USING (
    requester_id = auth.uid() 
    OR user_a_id = auth.uid() 
    OR user_b_id = auth.uid()
  )
  WITH CHECK (
    requester_id = auth.uid()
  );

-- RPC function to activate friend invite (matches activate_user_invite pattern)
CREATE OR REPLACE FUNCTION activate_friend_invite(
  invite_uuid UUID,
  user_uuid UUID,
  user_email TEXT
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Lock row to prevent race conditions
  SELECT * INTO invite_record
  FROM friends
  WHERE id = invite_uuid
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  IF invite_record.status != 'pending' THEN
    RAISE EXCEPTION 'Invite already processed (status: %)', invite_record.status;
  END IF;
  
  IF LOWER(invite_record.invited_email) != LOWER(user_email) THEN
    RAISE EXCEPTION 'Email mismatch: invite is for %, but user email is %', invite_record.invited_email, user_email;
  END IF;
  
  IF invite_record.requester_id = user_uuid THEN
    RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;
  
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;
  
  -- Set ordered IDs and accept
  UPDATE friends
  SET 
    user_a_id = LEAST(user_uuid, invite_record.requester_id),
    user_b_id = GREATEST(user_uuid, invite_record.requester_id),
    status = 'accepted',
    responded_at = NOW()
  WHERE id = invite_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION activate_friend_invite(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION activate_friend_invite(UUID, UUID, TEXT) IS 
  'Activates a pending friend invite. Only accessible to the user whose email matches the invite. Bypasses RLS to allow users to activate their own invites.';

-- Helper function for querying friends list
CREATE OR REPLACE FUNCTION get_my_friends()
RETURNS TABLE (
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
  WHERE (f.user_a_id = auth.uid() OR f.user_b_id = auth.uid())
    AND f.status = 'accepted'
  ORDER BY f.responded_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_friends() TO authenticated;

COMMENT ON FUNCTION get_my_friends() IS 
  'Returns all accepted friends for the current user.';

-- Helper function to get pending invites for current user's email
CREATE OR REPLACE FUNCTION get_my_pending_invites()
RETURNS TABLE (
  invite_id uuid,
  sender_id uuid,
  sender_name text,
  sender_email text,
  invited_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id AS invite_id,
    f.requester_id AS sender_id,
    u.raw_user_meta_data->>'name' AS sender_name,
    u.email AS sender_email,
    f.invited_at
  FROM friends f
  JOIN auth.users u ON f.requester_id = u.id
  WHERE f.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND f.status = 'pending'
  ORDER BY f.invited_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_pending_invites() TO authenticated;

COMMENT ON FUNCTION get_my_pending_invites() IS 
  'Returns all pending friend invites sent to the current user''s email.';


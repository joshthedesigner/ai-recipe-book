-- ========================================
-- FIX: Allow Users to Activate Their Own Pending Invites
-- ========================================
-- Creates a SECURITY DEFINER function that bypasses RLS for users to activate their own invites
-- This is secure because it validates email match before allowing activation
--
-- Run this in Supabase SQL Editor

-- Function to activate a pending invite for the current user
CREATE OR REPLACE FUNCTION activate_user_invite(
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
  -- First, verify the invite exists and get its details
  SELECT id, email, status, group_id, user_id
  INTO invite_record
  FROM group_members
  WHERE id = invite_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  -- Verify the invite is still pending
  IF invite_record.status != 'pending' THEN
    RAISE EXCEPTION 'Invite is not pending (status: %)', invite_record.status;
  END IF;
  
  -- Verify the email matches (case-insensitive)
  IF LOWER(invite_record.email) != LOWER(user_email) THEN
    RAISE EXCEPTION 'Email mismatch: invite is for %, but user email is %', invite_record.email, user_email;
  END IF;
  
  -- Verify user_uuid matches the authenticated user
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;
  
  -- Activate the invite (RLS bypassed due to SECURITY DEFINER)
  UPDATE group_members
  SET 
    user_id = user_uuid,
    status = 'active',
    joined_at = NOW()
  WHERE id = invite_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_user_invite(UUID, UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION activate_user_invite(UUID, UUID, TEXT) IS 
  'Activates a pending invite for the current user. Only accessible to the user whose email matches the invite. Bypasses RLS to allow users to activate their own invites.';


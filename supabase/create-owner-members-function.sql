-- ========================================
-- FIX: Allow Group Owners to See All Members
-- ========================================
-- Creates a SECURITY DEFINER function that bypasses RLS for owners
-- This is secure because it validates ownership before returning data
--
-- Run this in Supabase SQL Editor

-- Function to get all members for a group (owners only)
CREATE OR REPLACE FUNCTION get_group_members_for_owner(group_uuid UUID)
RETURNS TABLE (
  id UUID,
  group_id UUID,
  user_id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Verify the current user owns this group (using DECLARE variable to avoid ambiguity)
  SELECT EXISTS (
    SELECT 1 
    FROM recipe_groups rg
    WHERE rg.id = group_uuid 
    AND rg.owner_id = auth.uid()
  ) INTO is_owner;
  
  IF NOT is_owner THEN
    RAISE EXCEPTION 'User is not the owner of this group';
  END IF;
  
  -- Return all members (RLS bypassed due to SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    gm.id,
    gm.group_id,
    gm.user_id,
    gm.email,
    gm.role,
    gm.status,
    gm.invited_by,
    gm.invited_at,
    gm.joined_at
  FROM group_members gm
  WHERE gm.group_id = group_uuid
  ORDER BY gm.joined_at DESC NULLS LAST, gm.invited_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_group_members_for_owner(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_group_members_for_owner(UUID) IS 
  'Returns all members (including pending invites) for a group. Only accessible to group owners. Bypasses RLS to allow owners to see all members.';


-- ========================================
-- FIX: Allow Group Owners to Delete Members
-- ========================================
-- Creates a SECURITY DEFINER function that bypasses RLS for owners to delete members
-- This is secure because it validates ownership before allowing deletion
--
-- Run this in Supabase SQL Editor

-- Function to delete a member from a group (owners only)
CREATE OR REPLACE FUNCTION delete_group_member_for_owner(
  member_uuid UUID,
  group_uuid UUID
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_owner BOOLEAN;
  member_group_id UUID;
BEGIN
  -- First, verify the member exists and get their group_id
  SELECT gm.group_id INTO member_group_id
  FROM group_members gm
  WHERE gm.id = member_uuid;
  
  IF member_group_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  
  -- Verify the group_uuid matches (additional security check)
  IF member_group_id != group_uuid THEN
    RAISE EXCEPTION 'Member does not belong to the specified group';
  END IF;
  
  -- Verify the current user owns this group
  SELECT EXISTS (
    SELECT 1 
    FROM recipe_groups rg
    WHERE rg.id = group_uuid 
    AND rg.owner_id = auth.uid()
  ) INTO is_owner;
  
  IF NOT is_owner THEN
    RAISE EXCEPTION 'User is not the owner of this group';
  END IF;
  
  -- Delete the member (RLS bypassed due to SECURITY DEFINER)
  DELETE FROM group_members
  WHERE id = member_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_group_member_for_owner(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_group_member_for_owner(UUID, UUID) IS 
  'Deletes a member from a group. Only accessible to group owners. Bypasses RLS to allow owners to delete any member.';


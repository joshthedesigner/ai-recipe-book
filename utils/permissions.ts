/**
 * Permissions Utility
 * 
 * Helper functions to check user permissions within recipe groups
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'write' | 'read' | null;

/**
 * Get user's role in a specific group
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<UserRole> {
  try {
    // Check if user is the group owner
    const { data: groupData } = await supabase
      .from('recipe_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (groupData?.owner_id === userId) {
      return 'owner';
    }

    // Check if user is a member
    const { data: memberData } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberData) {
      return memberData.role as 'read' | 'write';
    }

    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user can add recipes to a group
 */
export async function canUserAddRecipes(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId, groupId);
  return role === 'owner' || role === 'write';
}

/**
 * Check if user is the group owner
 */
export async function isGroupOwner(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId, groupId);
  return role === 'owner';
}

/**
 * Get user's default group ID
 * Returns the group they own, or first group they're a member of
 */
export async function getUserDefaultGroup(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    // First, try to get group they own
    const { data: ownedGroup } = await supabase
      .from('recipe_groups')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (ownedGroup) {
      return ownedGroup.id;
    }

    // If no owned group, get first group they're a member of
    const { data: memberGroup } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    return memberGroup?.group_id || null;
  } catch (error) {
    console.error('Error getting default group:', error);
    return null;
  }
}

/**
 * Get all groups user has access to
 */
export async function getUserGroups(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<{ id: string; name: string; role: UserRole }>> {
  try {
    const groups: Array<{ id: string; name: string; role: UserRole }> = [];

    // Get owned groups
    const { data: ownedGroups } = await supabase
      .from('recipe_groups')
      .select('id, name')
      .eq('owner_id', userId);

    if (ownedGroups) {
      groups.push(...ownedGroups.map(g => ({ ...g, role: 'owner' as UserRole })));
    }

    // Get member groups
    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id, role, recipe_groups(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberGroups) {
      for (const member of memberGroups) {
        const group = member.recipe_groups as any;
        if (group) {
          groups.push({
            id: group.id,
            name: group.name,
            role: member.role as UserRole,
          });
        }
      }
    }

    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

/**
 * Check if user has any access to a group
 */
export async function hasGroupAccess(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId, groupId);
  return role !== null;
}


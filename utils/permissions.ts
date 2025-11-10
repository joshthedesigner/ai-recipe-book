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

    // Check if group is owned by a friend
    if (groupData?.owner_id) {
      const { data: areFriends, error: rpcError } = await supabase.rpc('are_friends', {
        user1_id: userId,
        user2_id: groupData.owner_id,
      });
      
      if (rpcError) {
        console.error('Error checking friend relationship:', rpcError);
      }
      
      if (areFriends) {
        return 'read'; // Friends have read-only access to owned groups
      }
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
 * Returns the group they own (Friends only system - no member groups)
 */
export async function getUserDefaultGroup(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    // Get group they own
    const { data: ownedGroup } = await supabase
      .from('recipe_groups')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    return ownedGroup?.id || null;
  } catch (error) {
    console.error('Error getting default group:', error);
    return null;
  }
}

/**
 * Get all groups user has access to
 * Returns owned groups and friends' groups (Friends-only system)
 */
export async function getUserGroups(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<{ id: string; name: string; role: UserRole; isOwn: boolean; isFriend?: boolean; joinedAt?: string | null }>> {
  try {
    const groups: Array<{ id: string; name: string; role: UserRole; isOwn: boolean; isFriend?: boolean; joinedAt?: string | null }> = [];

    // Get owned groups
    const { data: ownedGroups, error: ownedError } = await supabase
      .from('recipe_groups')
      .select('id, name')
      .eq('owner_id', userId);

    if (ownedError) {
      console.error('Error fetching owned groups:', ownedError);
      throw ownedError;
    }

    if (ownedGroups) {
      ownedGroups.forEach(g => {
        groups.push({
          id: g.id,
          name: g.name,
          role: 'owner' as UserRole,
          isOwn: true,
          joinedAt: null,
        });
      });
    }

    // Get friends' owned groups
    try {
      console.log('🔍 Calling get_friends_groups RPC...');
      
      // Also check raw friends table to compare
      const { data: rawFriends, error: rawError } = await supabase
        .from('friends')
        .select('*')
        .eq('status', 'accepted');
      
      console.log('🔍 RAW friends table:', {
        error: rawError,
        friendsCount: rawFriends?.length,
        friends: rawFriends
      });
      
      const { data: friendsGroups, error: friendsError } = await supabase
        .rpc('get_friends_groups');

      console.log('🔍 RPC returned:', { 
        error: friendsError, 
        dataLength: friendsGroups?.length,
        data: friendsGroups 
      });

      if (!friendsError && friendsGroups) {
        friendsGroups.forEach((fg: any) => {
          // Skip friends without recipe_groups (new users who haven't added recipes)
          // They'll appear in friends list but not in group switcher
          if (!fg.group_id) {
            console.log(`Skipping friend ${fg.friend_name} - no recipe group yet`);
            return;
          }
          
          groups.push({
            id: fg.group_id,
            name: `${fg.friend_name || fg.friend_email}'s RecipeAssist`,
            role: 'read' as UserRole,
            isOwn: false,
            isFriend: true,
            joinedAt: fg.friended_at,
          });
        });

        console.log(`getUserGroups: Added ${friendsGroups.length} friend group(s)`);
      } else if (friendsError) {
        console.error('🚨 RPC error:', friendsError);
      }
    } catch (friendsError) {
      console.warn('Error fetching friends groups:', friendsError);
    }

    return groups;
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

/**
 * Check if user has any access to a group
 * Relies on RLS policies to enforce access control at the database level
 */
export async function hasGroupAccess(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<boolean> {
  const role = await getUserRole(supabase, userId, groupId);
  return role !== null;
}


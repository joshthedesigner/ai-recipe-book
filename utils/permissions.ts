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

    // Check if group is owned by a friend (Friends feature)
    // Note: Server-side code uses FRIENDS_FEATURE_ENABLED (no NEXT_PUBLIC_ prefix)
    console.log('getUserRole: Checking friend access. Feature enabled?', process.env.FRIENDS_FEATURE_ENABLED);
    if (process.env.FRIENDS_FEATURE_ENABLED === 'true') {
      // Reuse groupData from line 21 (already has owner_id)
      console.log('getUserRole: Group owner:', groupData?.owner_id, 'Current user:', userId);
      if (groupData?.owner_id) {
        // Check if owner is my friend using helper RPC
        const { data: areFriends, error: friendError } = await supabase.rpc('are_friends', {
          user1_id: userId,
          user2_id: groupData.owner_id,
        });

        console.log('getUserRole: are_friends result:', areFriends, 'error:', friendError);
        
        if (areFriends) {
          console.log('getUserRole: Granting read access to friend group');
          return 'read'; // Friends have read-only access to owned groups
        }
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
 * Returns owned groups first, then member groups (excluding owned groups from member list)
 * Includes joined_at timestamp for member groups to enable smart priority selection
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

    const ownedGroupIds = new Set<string>();

    if (ownedGroups) {
      ownedGroups.forEach(g => {
        ownedGroupIds.add(g.id);
        groups.push({
          id: g.id,
          name: g.name,
          role: 'owner' as UserRole,
          isOwn: true,
          joinedAt: null, // Owned groups don't have joined_at
        });
      });
    }

    // Get member groups (excluding groups user owns)
    // Split query to avoid RLS issues with nested joins
    // First get member records
    const { data: memberRecords, error: memberError } = await supabase
      .from('group_members')
      .select('group_id, role, joined_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Add diagnostic logging
    console.log('getUserGroups: Member records query result:', { 
      count: memberRecords?.length || 0, 
      records: memberRecords,
      error: memberError,
      userId: userId
    });

    if (memberError) {
      console.error('Error fetching member groups:', memberError);
      throw memberError;
    }

    // Then fetch group details for each member group
    if (memberRecords && memberRecords.length > 0) {
      const memberGroupIds = memberRecords
        .map(m => m.group_id)
        .filter(id => !ownedGroupIds.has(id)); // Exclude groups user owns

      console.log('getUserGroups: Fetching group details for:', {
        memberGroupIds: memberGroupIds,
        ownedGroupIds: Array.from(ownedGroupIds),
        allMemberRecordIds: memberRecords.map(m => m.group_id)
      });

      if (memberGroupIds.length > 0) {
        const { data: memberGroupsData, error: groupsError } = await supabase
          .from('recipe_groups')
          .select('id, name')
          .in('id', memberGroupIds);

        console.log('getUserGroups: Group details query result:', {
          count: memberGroupsData?.length || 0,
          groups: memberGroupsData,
          error: groupsError,
          requestedIds: memberGroupIds
        });

        if (groupsError) {
          console.error('Error fetching member group details:', groupsError);
          throw groupsError;
        }

        // Combine member records with group details
        if (memberGroupsData) {
          const memberMap = new Map(memberRecords.map(m => [m.group_id, m]));
          
          for (const group of memberGroupsData) {
            const member = memberMap.get(group.id);
            if (member) {
              groups.push({
                id: group.id,
                name: group.name,
                role: member.role as UserRole,
                isOwn: false,
                joinedAt: member.joined_at || null,
              });
            }
          }
        }
      }
    }

    // Get friends' owned groups (if Friends feature is enabled)
    // Note: Client-side uses NEXT_PUBLIC_ prefix, this runs client-side so use it
    if (process.env.NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED === 'true') {
      try {
        const { data: friendsGroups, error: friendsError } = await supabase
          .rpc('get_friends_groups');

        if (!friendsError && friendsGroups) {
          friendsGroups.forEach((fg: any) => {
            groups.push({
              id: fg.group_id,
              name: `${fg.friend_name || fg.friend_email}'s Cookbook`,
              role: 'read' as UserRole, // Friends always have read-only access
              isOwn: false,
              isFriend: true, // Mark as friend's group
              joinedAt: fg.friended_at,
            });
          });
          
          console.log(`getUserGroups: Added ${friendsGroups.length} friend group(s)`);
        }
      } catch (friendsError) {
        // Friends feature is optional - don't fail if it errors
        console.warn('Error fetching friends groups (feature may be disabled):', friendsError);
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


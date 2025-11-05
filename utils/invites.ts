/**
 * Invite Utilities
 * 
 * Helper functions for managing recipe group invitations
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Activate any pending invites for a user after they sign up/sign in
 * This automatically adds them to groups they were invited to
 */
export async function activatePendingInvites(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<{ activated: number; errors: string[] }> {
  try {
    console.log(`Checking for pending invites for ${email}...`);

    // Find all pending invites for this email
    const { data: pendingInvites, error: fetchError } = await supabase
      .from('group_members')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching pending invites:', fetchError);
      return { activated: 0, errors: [fetchError.message] };
    }

    if (!pendingInvites || pendingInvites.length === 0) {
      console.log('No pending invites found');
      return { activated: 0, errors: [] };
    }

    console.log(`Found ${pendingInvites.length} pending invite(s)`);

    // Activate each invite using RPC function (bypasses RLS)
    const errors: string[] = [];
    let activated = 0;

    for (const invite of pendingInvites) {
      const { error: rpcError } = await supabase
        .rpc('activate_user_invite', {
          invite_uuid: invite.id,
          user_uuid: userId,
          user_email: email
        });

      if (rpcError) {
        console.error(`Error activating invite ${invite.id}:`, rpcError);
        errors.push(rpcError.message);
      } else {
        console.log(`Activated invite ${invite.id} for group ${invite.group_id}`);
        activated++;
      }
    }

    return { activated, errors };
  } catch (error) {
    console.error('Error in activatePendingInvites:', error);
    return {
      activated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Get user's pending invites
 * Shows invites they haven't accepted yet
 */
export async function getPendingInvites(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      id,
      role,
      invited_at,
      recipe_groups (
        id,
        name,
        owner_id
      )
    `)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending invites:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if an email has any pending invites
 */
export async function hasPendingInvites(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .limit(1);

  if (error) {
    console.error('Error checking for pending invites:', error);
    return false;
  }

  return data !== null && data.length > 0;
}


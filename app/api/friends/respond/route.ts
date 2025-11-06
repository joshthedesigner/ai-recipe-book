/**
 * Respond to Friend Invite API Route
 * 
 * POST /api/friends/respond
 * 
 * Purpose: Accept or reject friend requests
 * ROLLBACK NOTE: Delete this file to remove Friends API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Feature flag check (server-side, no NEXT_PUBLIC_ prefix)
    if (process.env.FRIENDS_FEATURE_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Feature not available' },
        { status: 404 }
      );
    }

    const { inviteId, action } = await request.json();

    // Validate input
    if (!inviteId || !action) {
      return NextResponse.json(
        { success: false, error: 'Invite ID and action are required' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get invite details
    const { data: invite, error: fetchError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Verify invite is for this user
    if (invite.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'This invite is not for you' },
        { status: 403 }
      );
    }

    // Verify invite is still pending
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Invite already ${invite.status}` },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Use RPC function to activate (follows existing pattern)
      const { error: rpcError } = await supabase.rpc('activate_friend_invite', {
        invite_uuid: inviteId,
        user_uuid: user.id,
        user_email: user.email,
      });

      if (rpcError) {
        console.error('Error activating friend invite:', rpcError);
        return NextResponse.json(
          { success: false, error: 'Failed to accept friend request', details: rpcError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
      });

    } else {
      // Reject: just update status
      const { error: updateError } = await supabase
        .from('friends')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) {
        console.error('Error rejecting friend invite:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to reject friend request' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Friend request rejected',
      });
    }

  } catch (error) {
    console.error('Error in respond to friend invite route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}


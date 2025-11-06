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

    // Note: We skip pre-validation and let the RPC function handle it
    // The RPC uses SECURITY DEFINER to bypass RLS and validates everything internally
    
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
      // Use RPC function to reject (bypasses RLS like accept)
      const { error: rpcError } = await supabase.rpc('reject_friend_invite', {
        invite_uuid: inviteId,
        user_uuid: user.id,
        user_email: user.email,
      });

      if (rpcError) {
        console.error('Error rejecting friend invite:', rpcError);
        return NextResponse.json(
          { success: false, error: 'Failed to reject friend request', details: rpcError.message },
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


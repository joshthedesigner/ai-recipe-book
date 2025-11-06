/**
 * List Friends API Route
 * 
 * GET /api/friends/list
 * 
 * Purpose: Get all friends and pending requests
 * ROLLBACK NOTE: Delete this file to remove Friends API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get accepted friends using helper function
    const { data: friends, error: friendsError } = await supabase
      .rpc('get_my_friends');

    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
    }

    // Get pending incoming requests using helper function (bypasses RLS)
    const { data: pendingIncoming, error: incomingError } = await supabase
      .rpc('get_my_pending_invites');

    if (incomingError) {
      console.error('Error fetching pending incoming:', incomingError);
    }

    // Get pending outgoing requests (I sent)
    const { data: pendingOutgoing, error: outgoingError } = await supabase
      .from('friends')
      .select('id, invited_email, invited_at')
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (outgoingError) {
      console.error('Error fetching pending outgoing:', outgoingError);
    }

    // Format incoming requests (already formatted by function)
    const formattedIncoming = (pendingIncoming || []).map((invite: any) => ({
      id: invite.invite_id,
      senderName: invite.sender_name || invite.sender_email || 'Unknown',
      senderEmail: invite.sender_email || 'Unknown',
      invitedAt: invite.invited_at,
    }));

    return NextResponse.json({
      success: true,
      friends: friends || [],
      pendingIncoming: formattedIncoming,
      pendingOutgoing: pendingOutgoing || [],
    });

  } catch (error) {
    console.error('Error in list friends route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}


/**
 * Cancel Friend Invite API Route
 * 
 * POST /api/friends/cancel-invite
 * 
 * Purpose: Cancel a pending outgoing friend invite
 * ROLLBACK NOTE: Delete this file to remove cancel invite functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { inviteId } = await request.json();

    // Validate input
    if (!inviteId) {
      return NextResponse.json(
        { success: false, error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the pending invite
    // Only allow deleting if the current user is the requester
    const { error: deleteError } = await supabase
      .from('friends')
      .delete()
      .eq('id', inviteId)
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (deleteError) {
      console.error('Error cancelling invite:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel invite', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite cancelled successfully',
    });

  } catch (error) {
    console.error('Error in cancel invite route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}


/**
 * Remove Friend API Route
 * 
 * POST /api/friends/remove
 * 
 * Purpose: Remove a friend relationship (unfriend)
 * ROLLBACK NOTE: Delete this file to remove unfriend functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { friendId } = await request.json();

    // Validate input
    if (!friendId) {
      return NextResponse.json(
        { success: false, error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(friendId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid friend ID format' },
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

    // Delete the friendship using RPC function (prevents SQL injection)
    // RPC function validates and deletes bidirectional friendship
    const { error: rpcError } = await supabase.rpc('remove_friend', {
      friend_uuid: friendId,
    });

    if (rpcError) {
      console.error('Error removing friend:', rpcError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove friend', details: rpcError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Friend removed successfully',
    });

  } catch (error) {
    console.error('Error in remove friend route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}


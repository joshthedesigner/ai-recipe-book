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

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the friendship (both rows if they exist)
    // The friendship is bidirectional, so we need to check both directions
    const { error: deleteError } = await supabase
      .from('friends')
      .delete()
      .eq('status', 'accepted')
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${friendId}),and(user_a_id.eq.${friendId},user_b_id.eq.${user.id})`);

    if (deleteError) {
      console.error('Error removing friend:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove friend', details: deleteError.message },
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


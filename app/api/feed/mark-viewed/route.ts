/**
 * Feed Mark Viewed API Route
 * 
 * POST /api/feed/mark-viewed
 * 
 * Purpose: Updates user's last_feed_view_at timestamp to current time
 * Called when user views their feed to clear unread notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/utils/rateLimit';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
        },
        { status: 401 }
      );
    }

    // Check rate limit (slightly more lenient since this is user action)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.general,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Update user's last_feed_view_at to current timestamp
    // Use server time (NOW()) to avoid timezone issues
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        last_feed_view_at: new Date().toISOString() 
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Feed Mark Viewed] Error updating user:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update feed view timestamp',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Feed Mark Viewed] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


/**
 * Feed Unread Count API Route
 * 
 * GET /api/feed/unread-count
 * 
 * Purpose: Returns count of recipes created after user's last feed view
 * Used to show red dot notification badge on Feed nav item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { getUserGroups } from '@/utils/permissions';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/utils/rateLimit';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
          count: 0,
        },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.general,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Get user's last feed view timestamp
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('last_feed_view_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('[Feed Unread Count] Error fetching user:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch user data',
          count: 0,
        },
        { status: 500 }
      );
    }

    // Get friend groups
    const allGroups = await getUserGroups(supabase, user.id);
    const friendGroups = allGroups.filter(g => g.isFriend);

    if (friendGroups.length === 0) {
      return NextResponse.json(
        {
          success: true,
          count: 0,
        },
        { status: 200 }
      );
    }

    const friendGroupIds = friendGroups.map(g => g.id);

    // Get last view timestamp (NULL means never viewed = all recipes are new)
    const lastViewAt = userRecord?.last_feed_view_at || null;
    
    // Efficient COUNT query - only count, don't fetch data
    let query = supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .in('group_id', friendGroupIds);

    // If user has viewed feed before, only count recipes created after that
    if (lastViewAt) {
      query = query.gt('created_at', lastViewAt);
    }
    // If lastViewAt is NULL, count all recipes (user never viewed feed)

    const { count, error: countError } = await query;

    if (countError) {
      console.error('[Feed Unread Count] Error counting recipes:', countError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to count unread recipes',
          count: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: count || 0,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Feed Unread Count] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        count: 0,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


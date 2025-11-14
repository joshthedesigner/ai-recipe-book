/**
 * Friends Feed API Route
 * 
 * GET /api/recipes/friends
 * 
 * Purpose: Fetch recipes from all friends' groups in chronological order
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
      console.error('[Friends Feed API] Auth error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in to view friends\' recipes.',
        },
        { status: 401 }
      );
    }

    console.log('[Friends Feed API] User authenticated:', user.id);

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = 6;
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Check rate limit (use general API limit)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.general,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Get all groups user has access to
    console.log('[Friends Feed API] Fetching user groups...');
    const allGroups = await getUserGroups(supabase, user.id);
    console.log('[Friends Feed API] Total groups:', allGroups.length);
    
    // Filter to only friend groups
    const friendGroups = allGroups.filter(g => g.isFriend);
    console.log('[Friends Feed API] Friend groups:', friendGroups.length);
    
    if (friendGroups.length === 0) {
      return NextResponse.json(
        {
          success: true,
          recipes: [],
          message: 'Add friends to see their recipes!',
        },
        { status: 200 }
      );
    }

    const friendGroupIds = friendGroups.map(g => g.id);
    console.log('[Friends Feed API] Fetching recipes from group IDs:', friendGroupIds);

    // Fetch recipes from all friend groups with pagination
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        user_id,
        group_id,
        title,
        ingredients,
        steps,
        tags,
        source_url,
        image_url,
        video_url,
        video_platform,
        cookbook_name,
        cookbook_page,
        contributor_name,
        created_at,
        updated_at
      `)
      .in('group_id', friendGroupIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('[Friends Feed API] Query result - recipes:', recipes?.length, 'error:', recipesError);

    if (recipesError) {
      console.error('[Friends Feed API] Error fetching friend recipes:', recipesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes from friends',
          details: recipesError.message,
        },
        { status: 500 }
      );
    }

    // Format recipes with friend information
    console.log('[Friends Feed API] Formatting recipes...');
    const formattedRecipes = recipes?.map(recipe => {
      // Find the matching friend group to get the friend's name
      const friendGroup = friendGroups.find(g => g.id === recipe.group_id);
      
      return {
        ...recipe,
        friend_name: friendGroup?.name.replace("'s recipes", '') || recipe.contributor_name,
        group_name: friendGroup?.name || 'Unknown',
      };
    }) || [];

    return NextResponse.json(
      {
        success: true,
        recipes: formattedRecipes,
        count: formattedRecipes.length,
        hasMore: formattedRecipes.length === limit,
        offset: offset,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Friends Feed API] Unexpected error:', error);
    console.error('[Friends Feed API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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


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
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in to view friends\' recipes.',
        },
        { status: 401 }
      );
    }

    // Check rate limit (reuse existing recipe list limit)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.recipeList,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Get all groups user has access to
    const allGroups = await getUserGroups(supabase, user.id);
    
    // Filter to only friend groups
    const friendGroups = allGroups.filter(g => g.isFriend);
    
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

    // Fetch recipes from all friend groups
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
      .limit(50);

    if (recipesError) {
      console.error('Error fetching friend recipes:', recipesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes from friends',
        },
        { status: 500 }
      );
    }

    // Format recipes with friend information
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
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in friends feed API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


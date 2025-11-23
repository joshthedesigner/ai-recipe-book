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
import { getYouTubeThumbnail } from '@/utils/youtubeHelpers';
import { FeedItem } from '@/types';

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

    // Get user's last feed view timestamp (for is_new flag)
    const { data: userRecord } = await supabase
      .from('users')
      .select('last_feed_view_at')
      .eq('id', user.id)
      .single();

    const lastViewAt = userRecord?.last_feed_view_at || null;

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
    console.log('[Friends Feed API] Fetching recipes and notes from group IDs:', friendGroupIds);

    // Performance monitoring
    const startTime = Date.now();

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
      .in('group_id', friendGroupIds);

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

    // Fetch notes from recipes in friend groups (using denormalized fields, no join needed)
    const { data: notes, error: notesError } = await supabase
      .from('recipe_notes')
      .select(`
        id,
        recipe_id,
        user_id,
        note_text,
        photo_urls,
        recipe_title,
        recipe_image_url,
        created_at,
        updated_at,
        users!recipe_notes_user_id_fkey(name)
      `)
      .in('recipe_id', recipes?.map(r => r.id) || []);

    if (notesError) {
      console.error('[Friends Feed API] Error fetching notes:', notesError);
      // Continue without notes rather than failing completely
    }

    const queryTime = Date.now() - startTime;
    console.log(`[Friends Feed API] Query time: ${queryTime}ms (recipes: ${recipes?.length || 0}, notes: ${notes?.length || 0})`);

    // Combine recipes and notes into feed items
    const feedItems: FeedItem[] = [];

    // Format recipes as feed items
    const recipeItems: FeedItem[] = (recipes || []).map(recipe => {
      const friendGroup = friendGroups.find(g => g.id === recipe.group_id);
      const isNew = lastViewAt
        ? new Date(recipe.created_at) > new Date(lastViewAt)
        : true;

      return {
        type: 'recipe' as const,
        id: recipe.id,
        created_at: recipe.created_at,
        title: recipe.title,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags,
        source_url: recipe.source_url,
        image_url: recipe.image_url,
        video_url: recipe.video_url,
        video_platform: recipe.video_platform,
        cookbook_name: recipe.cookbook_name,
        cookbook_page: recipe.cookbook_page,
        contributor_name: recipe.contributor_name,
        friend_name: friendGroup?.name.replace("'s recipes", '') || recipe.contributor_name,
        group_name: friendGroup?.name || 'Unknown',
        is_new: isNew,
      };
    });

    // Format notes as feed items
    const noteItems: FeedItem[] = (notes || []).map((note: any) => {
      // Find the recipe to get friend info
      const recipe = recipes?.find(r => r.id === note.recipe_id);
      const friendGroup = recipe ? friendGroups.find(g => g.id === recipe.group_id) : null;
      const friendName = friendGroup?.name.replace("'s recipes", '') || note.users?.name || 'Unknown';

      // Use first photo if exists, else recipe image (or generate YouTube thumbnail for legacy notes)
      let displayImage = note.photo_urls && note.photo_urls.length > 0
        ? note.photo_urls[0]
        : note.recipe_image_url;

      // Handle legacy notes: if recipe_image_url is null, try to generate from recipe's video_url
      if (!displayImage && recipe) {
        if (recipe.video_url) {
          displayImage = getYouTubeThumbnail(recipe.video_url) || null;
        } else if (recipe.image_url) {
          displayImage = recipe.image_url;
        }
      }

      return {
        type: 'note' as const,
        id: note.id,
        created_at: note.created_at,
        note_text: note.note_text,
        photo_urls: note.photo_urls || [],
        recipe_id: note.recipe_id,
        recipe_title: note.recipe_title,
        recipe_image_url: displayImage, // For feed display
        source_url: recipe?.source_url || null, // Include recipe source URL
        user_name: note.users?.name || 'Unknown',
        friend_name: friendName, // For consistency with recipe items
      };
    });

    // Combine and sort by created_at DESC
    feedItems.push(...recipeItems, ...noteItems);
    feedItems.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const paginatedItems = feedItems.slice(offset, offset + limit);
    const hasMore = feedItems.length > offset + limit;

    const totalTime = Date.now() - startTime;
    console.log(`[Friends Feed API] Total processing time: ${totalTime}ms (returning ${paginatedItems.length} items)`);

    // Log performance warning if query is slow
    if (queryTime > 1000) {
      console.warn(`[Friends Feed API] Slow query detected: ${queryTime}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        recipes: paginatedItems, // Keep 'recipes' key for backward compatibility
        feedItems: paginatedItems, // New key for clarity
        count: paginatedItems.length,
        totalCount: feedItems.length,
        hasMore: hasMore,
        offset: offset,
        queryTime: queryTime, // Performance metric
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


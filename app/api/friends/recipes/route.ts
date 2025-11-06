/**
 * Friends Recipes API Route
 * 
 * GET /api/friends/recipes
 * 
 * Purpose: Get recipes from friends' owned groups
 * ROLLBACK NOTE: Delete this file to remove Friends recipe visibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Feature flag check
    if (process.env.FRIENDS_FEATURE_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Feature not available' },
        { status: 404 }
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let recipes;
    let error;

    if (friendId) {
      // Get recipes from specific friend
      ({ data: recipes, error } = await supabase.rpc('get_friend_recipes', {
        friend_user_id: friendId,
        p_limit: limit,
        p_offset: offset,
      }));
    } else {
      // Get recipes from all friends
      ({ data: recipes, error } = await supabase.rpc('get_friends_recipes', {
        p_limit: limit,
        p_offset: offset,
      }));
    }

    if (error) {
      console.error('Error fetching friends recipes:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recipes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recipes: recipes || [],
      count: recipes?.length || 0,
    });

  } catch (error) {
    console.error('Error in friends recipes route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}


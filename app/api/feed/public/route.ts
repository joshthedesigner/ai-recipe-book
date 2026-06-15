/**
 * Public Feed API Route
 *
 * GET /api/feed/public
 *
 * Returns all recipes from all users, newest first.
 * Uses the admin client to bypass RLS (auth check is enforced manually).
 * Excludes the current user's own recipes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/utils/rateLimit';

export const dynamic = 'force-dynamic';

const LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Auth check — user must be logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(request, RATE_LIMITS.general, user.id);
    if (!rateLimitResult.success) return rateLimitResponse(rateLimitResult);

    const searchParams = request.nextUrl.searchParams;
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Get last feed view for is_new flag
    const { data: userRecord } = await supabase
      .from('users')
      .select('last_feed_view_at')
      .eq('id', user.id)
      .single();

    const lastViewAt = userRecord?.last_feed_view_at || null;

    // Use admin client to read all recipes regardless of RLS group membership
    const { data: recipes, error, count } = await supabaseAdmin
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
      `, { count: 'exact' })
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + LIMIT - 1);

    if (error) {
      console.error('[Public Feed API] Error fetching recipes:', error);
      return NextResponse.json({ success: false, error: 'Failed to load feed' }, { status: 500 });
    }

    // Fetch user names separately to avoid FK naming issues
    const userIds = [...new Set((recipes || []).map((r: any) => r.user_id))];
    const { data: users } = userIds.length
      ? await supabaseAdmin.from('users').select('id, name').in('id', userIds)
      : { data: [] };

    const userMap = new Map((users || []).map((u: any) => [u.id, u.name]));

    const feedItems = (recipes || []).map((recipe: any) => ({
      type: 'recipe' as const,
      id: recipe.id,
      user_id: recipe.user_id,
      group_id: recipe.group_id,
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
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      friend_name: userMap.get(recipe.user_id) || recipe.contributor_name || 'Someone',
      is_new: lastViewAt ? new Date(recipe.created_at) > new Date(lastViewAt) : true,
    }));

    const totalCount = count || 0;
    const hasMore = offset + LIMIT < totalCount;

    return NextResponse.json({ success: true, feedItems, hasMore, offset, totalCount });
  } catch (error) {
    console.error('[Public Feed API] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

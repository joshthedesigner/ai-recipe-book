/**
 * Recipes API Route
 * 
 * GET /api/recipes
 * 
 * Purpose: Fetch all recipes with optional filters and sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { hasGroupAccess } from '@/utils/permissions';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const requestStartTime = Date.now();
  
  try {
    console.log(`[${requestId}] 🔵 API GET /api/recipes START`, {
      url: request.url,
      timestamp: new Date().toISOString(),
    });
    
    const supabase = createClient();

    // Verify authentication - recipe access requires authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] ❌ API AUTH FAILED`);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in to view recipes.',
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Whitelist allowed sort columns to prevent SQL injection
    const ALLOWED_SORT_COLUMNS = ['created_at', 'title', 'contributor_name'];
    const ALLOWED_SORT_ORDERS = ['asc', 'desc'];
    
    // Get and validate query parameters
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase();
    const tag = searchParams.get('tag');
    const contributor = searchParams.get('contributor');
    const groupId = searchParams.get('groupId');
    
    // Validate sortBy against whitelist
    if (!ALLOWED_SORT_COLUMNS.includes(sortBy)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid sortBy parameter. Allowed values: ${ALLOWED_SORT_COLUMNS.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Validate sortOrder
    if (!ALLOWED_SORT_ORDERS.includes(sortOrder)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid sortOrder parameter. Allowed values: ${ALLOWED_SORT_ORDERS.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Validate and clamp limit (1-100)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);
    
    // Validate and clamp offset (non-negative)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    
    // Validate tag and contributor length if provided
    if (tag && tag.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Tag parameter exceeds maximum length' },
        { status: 400 }
      );
    }
    
    if (contributor && contributor.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Contributor parameter exceeds maximum length' },
        { status: 400 }
      );
    }

    // Validate groupId if provided
    if (groupId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(groupId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid groupId format' },
          { status: 400 }
        );
      }

      // Verify user has access to this group
      const hasAccess = await hasGroupAccess(supabase, user.id, groupId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'You do not have access to this recipe book' },
          { status: 403 }
        );
      }
    } else {
      // If no groupId provided, return recipes without group_id (legacy) OR user's own recipes
      // This handles backward compatibility for recipes created before groups were added
      console.log('No groupId provided, fetching legacy recipes (no group_id)');
    }

    // Build query - exclude embedding vector for performance (6KB per recipe!)
    let query = supabase
      .from('recipes')
      .select('id, user_id, group_id, title, ingredients, steps, tags, source_url, image_url, cookbook_name, cookbook_page, contributor_name, created_at, updated_at');

    // Filter by group_id if provided
    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      // Fallback: show recipes without group_id (legacy) or user's own recipes
      // This maintains backward compatibility
      query = query.or(`group_id.is.null,user_id.eq.${user.id}`);
    }

    // Apply filters
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (contributor) {
      query = query.eq('contributor_name', contributor);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const queryStartTime = Date.now();
    const { data, error, count } = await query;
    const queryTime = Date.now() - queryStartTime;

    if (error) {
      console.error(`[${requestId}] ❌ API QUERY ERROR:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes',
        },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - requestStartTime;
    
    console.log(`[${requestId}] ✅ API GET /api/recipes COMPLETE`, {
      queryTime: `${queryTime}ms`,
      totalTime: `${totalTime}ms`,
      recipeCount: data?.length || 0,
      recipeIds: data?.map((r: any) => r.id) || [],
      groupId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        recipes: data || [],
        count: count || 0,
        pagination: {
          limit,
          offset,
          hasMore: data && data.length === limit,
        },
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60', // Cache for 1 minute
        },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ API EXCEPTION:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


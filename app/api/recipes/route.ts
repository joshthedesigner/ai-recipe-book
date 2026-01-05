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
  try {
    const supabase = createClient();

    // Verify authentication - recipe access requires authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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
    
    // New filter parameters for server-side filtering
    const search = searchParams.get('search');
    const cuisine = searchParams.get('cuisine');
    const ingredient = searchParams.get('ingredient');
    const favorites = searchParams.get('favorites') === 'true';
    
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
    
    // Validate new filter parameters
    if (search && search.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Search parameter exceeds maximum length' },
        { status: 400 }
      );
    }
    
    if (cuisine && cuisine.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cuisine parameter exceeds maximum length' },
        { status: 400 }
      );
    }
    
    if (ingredient && ingredient.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Ingredient parameter exceeds maximum length' },
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
    }

    // Build query - exclude embedding vector for performance (6KB per recipe!)
    const selectWithSections = 'id, user_id, group_id, title, ingredients, steps, tags, sections, source_url, image_url, video_url, video_platform, cookbook_name, cookbook_page, contributor_name, created_at, updated_at';
    const selectWithoutSections = 'id, user_id, group_id, title, ingredients, steps, tags, source_url, image_url, video_url, video_platform, cookbook_name, cookbook_page, contributor_name, created_at, updated_at';

    // Use count: 'exact' to get total count for accurate filtering
    let query = supabase.from('recipes').select(selectWithSections, { count: 'exact' });

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
    
    // Server-side search filter (title, tags, ingredients)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      // Search in title (case-insensitive)
      // Note: For JSONB arrays (ingredients), we need to check if any element contains the search term
      // Supabase doesn't support direct JSONB array text search easily, so we'll use OR conditions
      query = query.or(`title.ilike.%${searchLower}%,tags.cs.{${searchLower}}`);
      // For ingredients search, we'll need to handle it differently since it's JSONB
      // This is a limitation - we'll match tags exactly, but title partially
      // Full ingredients search would require a more complex query or full-text search index
    }
    
    // Server-side cuisine filter (matches tags)
    if (cuisine && cuisine.trim()) {
      query = query.contains('tags', [cuisine.toLowerCase().trim()]);
    }
    
    // Server-side ingredient filter
    if (ingredient && ingredient.trim()) {
      const ingredientLower = ingredient.toLowerCase().trim();
      
      // Special case: tofu matches in title or ingredients, not just tags
      if (ingredientLower === 'tofu') {
        // For tofu, we need to check title and ingredients (JSONB array)
        // Since Supabase JSONB array search is complex, we'll use OR with title match
        // and tag match as fallback. Full JSONB array search would need a custom query.
        query = query.or(`title.ilike.%tofu%,tags.cs.{tofu}`);
        // Note: Full ingredients JSONB search would require:
        // query = query.or(`title.ilike.%tofu%,tags.cs.{tofu},ingredients.cs.["*tofu*"]`);
        // But Supabase client doesn't support complex JSONB array text search easily
        // This is a known limitation - full tofu matching would need a database function or full-text search
      } else {
        // All other ingredients match by tags (standard behavior)
        query = query.contains('tags', [ingredientLower]);
      }
    }

    // Fetch user's favorites for filtering and is_favorite flag
    const { data: userFavorites } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id);

    const favoriteRecipeIds = new Set<string>((userFavorites || []).map((f: any) => f.recipe_id));

    // Filter by favorites if requested
    if (favorites) {
      const favoriteIdsArray = Array.from(favoriteRecipeIds);
      if (favoriteIdsArray.length === 0) {
        // User has no favorites, return empty result
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Impossible UUID to return no results
      } else {
        query = query.in('id', favoriteIdsArray);
      }
    }

    // Apply sorting
    // Note: "Recently Viewed" sorting must be done client-side (uses localStorage)
    // So we always sort by created_at here, and client handles recently viewed
    const serverSortBy = sortBy === 'recently_viewed' ? 'created_at' : sortBy;
    query = query.order(serverSortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    let { data, error, count } = await query;

    // Fallback: if sections column is missing (migration not applied yet), retry without it
    if (error && typeof error.message === 'string' && /column.*sections.*does not exist/i.test(error.message)) {
      let retry = supabase.from('recipes').select(selectWithoutSections, { count: 'exact' });
      if (groupId) {
        retry = retry.eq('group_id', groupId);
      } else {
        retry = retry.or(`group_id.is.null,user_id.eq.${user.id}`);
      }
      if (tag) retry = retry.contains('tags', [tag]);
      if (contributor) retry = retry.eq('contributor_name', contributor);
      
      // Apply new server-side filters
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        retry = retry.or(`title.ilike.%${searchLower}%,tags.cs.{${searchLower}}`);
      }
      if (cuisine && cuisine.trim()) {
        retry = retry.contains('tags', [cuisine.toLowerCase().trim()]);
      }
      if (ingredient && ingredient.trim()) {
        const ingredientLower = ingredient.toLowerCase().trim();
        if (ingredientLower === 'tofu') {
          retry = retry.or(`title.ilike.%tofu%,tags.cs.{tofu}`);
        } else {
          retry = retry.contains('tags', [ingredientLower]);
        }
      }
      
      // Apply favorites filter to retry query
      if (favorites) {
        const favoriteIdsArray = Array.from(favoriteRecipeIds);
        if (favoriteIdsArray.length === 0) {
          retry = retry.eq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          retry = retry.in('id', favoriteIdsArray);
        }
      }
      
      const serverSortBy = sortBy === 'recently_viewed' ? 'created_at' : sortBy;
      retry = retry.order(serverSortBy, { ascending: sortOrder === 'asc' });
      retry = retry.range(offset, offset + limit - 1);
      const retryResult = await retry;
      const retryAny = retryResult as unknown as { data: unknown[] | null; count?: number | null; error?: unknown };
      data = retryAny.data as any;
      count = (retryAny.count ?? 0) as any;
      error = null as any;
      console.warn('Recipes API: sections column missing; served results without sections. Apply DB migration to enable sections.');
    }

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes',
        },
        { status: 500 }
      );
    }

    // Add is_favorite flag to each recipe
    const recipesWithFavorites = (data || []).map((recipe: any) => ({
      ...recipe,
      is_favorite: favoriteRecipeIds.has(recipe.id),
    }));

    // Calculate filter facets (available options based on ALL recipes, not filtered)
    // This runs a separate query to get all recipes in the group for facet calculation
    let facetsQuery = supabase.from('recipes').select('id, tags, title, ingredients');
    
    // Apply group filter (same as main query, but no other filters)
    if (groupId) {
      facetsQuery = facetsQuery.eq('group_id', groupId);
    } else {
      facetsQuery = facetsQuery.or(`group_id.is.null,user_id.eq.${user.id}`);
    }
    
    // Get all recipes for facet calculation (limit to reasonable number for performance)
    const { data: allRecipesForFacets } = await facetsQuery.limit(1000);
    
    // Calculate available filter options from all recipes
    const availableCuisines: string[] = [];
    const availableIngredients: string[] = [];
    const CUISINE_OPTIONS = [
      'american', 'chinese', 'french', 'greek', 'indian', 'italian', 
      'japanese', 'korean', 'mexican', 'thai', 'vietnamese', 
      'middle eastern', 'mediterranean'
    ];
    const INGREDIENT_OPTIONS = [
      'fish', 'seafood', 'chicken', 'beef', 'pork', 'lamb', 'tofu', 'vegetarian', 'vegan'
    ];
    
    if (allRecipesForFacets) {
      // Extract all unique tags from recipes
      const allTags = new Set<string>();
      const allTitles: string[] = [];
      const allIngredientsArrays: any[] = [];
      
      allRecipesForFacets.forEach((recipe: any) => {
        if (recipe.tags && Array.isArray(recipe.tags)) {
          recipe.tags.forEach((tag: string) => {
            allTags.add(tag.toLowerCase());
          });
        }
        if (recipe.title) {
          allTitles.push(recipe.title.toLowerCase());
        }
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          allIngredientsArrays.push(recipe.ingredients);
        }
      });
      
      // Check which cuisines exist in tags
      CUISINE_OPTIONS.forEach(cuisine => {
        if (allTags.has(cuisine.toLowerCase())) {
          availableCuisines.push(cuisine);
        }
      });
      
      // Check which ingredients exist in tags or titles/ingredients (for tofu)
      INGREDIENT_OPTIONS.forEach(ingredient => {
        const ingredientLower = ingredient.toLowerCase();
        const existsInTags = allTags.has(ingredientLower);
        
        if (ingredientLower === 'tofu') {
          // Special case: tofu matches in title or ingredients array
          const existsInTitle = allTitles.some(title => title.includes('tofu'));
          const existsInIngredients = allIngredientsArrays.some(ingArray => 
            ingArray.some((ing: any) => 
              typeof ing === 'string' && ing.toLowerCase().includes('tofu')
            )
          );
          if (existsInTags || existsInTitle || existsInIngredients) {
            availableIngredients.push(ingredient);
          }
        } else {
          if (existsInTags) {
            availableIngredients.push(ingredient);
          }
        }
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        recipes: recipesWithFavorites,
        count: count || 0,
        facets: {
          cuisines: availableCuisines,
          ingredients: availableIngredients,
        },
        pagination: {
          limit,
          offset,
          hasMore: recipesWithFavorites && recipesWithFavorites.length === limit,
        },
      },
      { status: 200 }
    );
    
    // Set conservative cache headers to prevent stale data after mutations
    // Reduced from 60s to 10s to ensure fresh data after delete/add operations
    // Removed stale-while-revalidate to prevent serving deleted recipes
    response.headers.set('Cache-Control', 's-maxage=10, max-age=0, must-revalidate');
    return response;

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


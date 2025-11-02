/**
 * Recipes API Route
 * 
 * GET /api/recipes
 * 
 * Purpose: Fetch all recipes with optional filters and sorting
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/db/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const sortBy = searchParams.get('sortBy') || 'created_at'; // created_at, title, contributor_name
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc or desc
    const tag = searchParams.get('tag'); // Filter by tag
    const contributor = searchParams.get('contributor'); // Filter by contributor
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('recipes')
      .select('*');

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
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes',
        },
        { status: 500 }
      );
    }

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
      { status: 200 }
    );

  } catch (error) {
    console.error('Recipes API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


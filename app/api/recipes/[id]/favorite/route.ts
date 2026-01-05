/**
 * Recipe Favorite API Route
 * 
 * POST /api/recipes/[id]/favorite
 * 
 * Purpose: Toggle favorite status for a recipe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recipeId = params.id;

  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify recipe exists
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check if favorite already exists
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .single();

    if (existingFavorite) {
      // Remove favorite
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId);

      if (deleteError) {
        console.error('Error removing favorite:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to remove favorite' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        is_favorite: false,
      });
    } else {
      // Add favorite
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          recipe_id: recipeId,
        });

      if (insertError) {
        console.error('Error adding favorite:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add favorite' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        is_favorite: true,
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


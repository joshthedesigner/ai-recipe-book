/**
 * Copy Recipe API Route
 * 
 * POST /api/recipes/copy
 * 
 * Purpose: Copy a friend's recipe to your own cookbook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { canUserAddRecipes, getUserDefaultGroup } from '@/utils/permissions';
import { generateEmbedding } from '@/vector/embeddings';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

function createRecipeSearchText(recipe: any): string {
  const ingredientsText = recipe.ingredients.join(', ');
  const stepsText = recipe.steps.join('. ');
  const tagsText = recipe.tags.join(', ');
  return `${recipe.title}. Ingredients: ${ingredientsText}. Instructions: ${stepsText}. Tags: ${tagsText}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in to copy recipes.',
        },
        { status: 401 }
      );
    }

    const { recipeId } = await request.json();

    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Fetch the original recipe
    const { data: originalRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (fetchError || !originalRecipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to add recipes
    const hasPermission = await canUserAddRecipes(supabase, user.id);
    if (!hasPermission) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You do not have permission to add recipes' 
        },
        { status: 403 }
      );
    }

    // Get user's default group
    const userGroupId = await getUserDefaultGroup(supabase, user.id);
    if (!userGroupId) {
      return NextResponse.json(
        { success: false, error: 'Could not find your cookbook' },
        { status: 400 }
      );
    }

    // Generate embedding for the copied recipe
    const searchText = createRecipeSearchText(originalRecipe);
    const embedding = await generateEmbedding(searchText);

    // Create a copy of the recipe in user's cookbook
    const { data: copiedRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        group_id: userGroupId,
        title: originalRecipe.title,
        ingredients: originalRecipe.ingredients,
        steps: originalRecipe.steps,
        tags: originalRecipe.tags,
        source_url: originalRecipe.source_url,
        image_url: originalRecipe.image_url,
        video_url: originalRecipe.video_url,
        video_platform: originalRecipe.video_platform,
        cookbook_name: originalRecipe.cookbook_name,
        cookbook_page: originalRecipe.cookbook_page,
        contributor_name: originalRecipe.contributor_name,
        embedding: embedding,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error copying recipe:', insertError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to copy recipe',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Recipe added to your cookbook!',
        recipe: copiedRecipe,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error copying recipe:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


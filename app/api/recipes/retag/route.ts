/**
 * Re-tag Recipes API Route
 * 
 * POST /api/recipes/retag
 * 
 * Purpose: Re-run auto-tagging logic on existing recipes to apply new cuisine configurations
 * 
 * Query Parameters:
 * - groupId (optional): Only re-tag recipes in this group
 * - batchSize (optional): Number of recipes to process per batch (default: 50)
 * - limit (optional): Maximum number of recipes to process (default: all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { mergeAutoTags } from '@/utils/autoTag';
import { hasGroupAccess } from '@/utils/permissions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const batchSize = parseInt(searchParams.get('batchSize') || '50', 10);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null;

    // Validate groupId if provided
    if (groupId) {
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

    // Build query to fetch recipes
    let query = supabase
      .from('recipes')
      .select('id, title, ingredients, steps, tags, group_id, user_id')
      .order('created_at', { ascending: false });

    // Filter by group_id if provided
    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      // Only re-tag recipes the user has access to
      query = query.or(`group_id.is.null,user_id.eq.${user.id}`);
    }

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data: recipes, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching recipes:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipes',
        },
        { status: 500 }
      );
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No recipes found to re-tag',
          stats: {
            total: 0,
            processed: 0,
            updated: 0,
            unchanged: 0,
            errors: 0,
          },
        },
        { status: 200 }
      );
    }

    // Process recipes in batches
    const stats = {
      total: recipes.length,
      processed: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
    };

    const batches: typeof recipes[] = [];
    for (let i = 0; i < recipes.length; i += batchSize) {
      batches.push(recipes.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const updatePromises = batch.map(async (recipe) => {
        try {
          // Ensure ingredients and steps are arrays
          const ingredients = Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [];
          const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
          const existingTags = Array.isArray(recipe.tags) ? recipe.tags : [];

          // Re-run auto-tagging
          const newTags = mergeAutoTags(
            existingTags,
            ingredients,
            recipe.title || '',
            steps
          );

          // Check if tags changed
          const tagsChanged =
            newTags.length !== existingTags.length ||
            !newTags.every((tag, index) => tag === existingTags[index]);

          if (tagsChanged) {
            // Update recipe with new tags
            const { error: updateError } = await supabase
              .from('recipes')
              .update({ tags: newTags })
              .eq('id', recipe.id);

            if (updateError) {
              console.error(`Error updating recipe ${recipe.id}:`, updateError);
              stats.errors++;
              return { success: false, recipeId: recipe.id };
            }

            stats.updated++;
            return {
              success: true,
              recipeId: recipe.id,
              oldTags: existingTags,
              newTags: newTags,
            };
          } else {
            stats.unchanged++;
            return {
              success: true,
              recipeId: recipe.id,
              unchanged: true,
            };
          }
        } catch (error) {
          console.error(`Error processing recipe ${recipe.id}:`, error);
          stats.errors++;
          return { success: false, recipeId: recipe.id, error: String(error) };
        }
      });

      await Promise.all(updatePromises);
      stats.processed += batch.length;
    }

    return NextResponse.json(
      {
        success: true,
        message: `Re-tagging complete. Processed ${stats.processed} recipes.`,
        stats: {
          total: stats.total,
          processed: stats.processed,
          updated: stats.updated,
          unchanged: stats.unchanged,
          errors: stats.errors,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in re-tag endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


/**
 * Fix Recipe Tags and Regenerate Embeddings
 * 
 * POST /api/recipes/fix-tags-and-embeddings
 * 
 * Purpose: Remove incorrect cuisine tags added by SQL scripts, re-apply correct tagging,
 * and regenerate embeddings to match the correct tags.
 * 
 * Query Parameters:
 * - groupId (optional): Only fix recipes in this group
 * - limit (optional): Maximum number of recipes to process (default: all)
 * - batchSize (optional): Number of recipes per batch (default: 50)
 * 
 * Process:
 * 1. Remove all cuisine tags (keep protein/dietary/meal tags)
 * 2. Re-apply correct tagging using mergeAutoTags()
 * 3. Regenerate embeddings from correct tags
 * 4. Update both tags and embedding columns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { mergeAutoTags } from '@/utils/autoTag';
import { createRecipeSearchText, generateEmbedding } from '@/vector/embed';
import { hasGroupAccess } from '@/utils/permissions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// All cuisine tags to remove (main cuisines + regional variants)
const CUISINE_TAGS_TO_REMOVE = new Set([
  // Main cuisines
  'chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
  'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean',
  // Regional variants (from CUISINE_HIERARCHY)
  'goan', 'punjabi', 'bengali', 'south indian', 'north indian', 'gujarati', 'maharashtrian',
  'sichuan', 'szechuan', 'cantonese', 'hunan', 'shanghainese',
  'tuscan', 'neapolitan', 'sicilian', 'roman',
  'tex-mex', 'oaxacan', 'yucatecan',
  'cajun', 'creole', 'southern',
  'provençal', 'alsatian', 'breton',
  'okinawan',
  'catalan', 'andalusian', 'basque',
  'lebanese', 'turkish', 'persian', 'moroccan',
]);

/**
 * Filter out cuisine tags while keeping other tags
 */
function removeCuisineTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  
  return tags.filter(tag => {
    const lowerTag = tag.toLowerCase().trim();
    return !CUISINE_TAGS_TO_REMOVE.has(lowerTag);
  });
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
          error: 'Unauthorized. Please log in.',
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : null;
    const batchSize = searchParams.get('batchSize') ? parseInt(searchParams.get('batchSize')!, 10) : 50;

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
      .select('id, title, ingredients, steps, tags, sections')
      .order('created_at', { ascending: false });

    // Filter by group_id if provided
    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      // Only fix recipes the user has access to
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
          message: 'No recipes found to fix',
          stats: {
            total: 0,
            processed: 0,
            fixed: 0,
            unchanged: 0,
            errors: 0,
          },
        },
        { status: 200 }
      );
    }

    console.log(`Processing ${recipes.length} recipes to fix tags and regenerate embeddings...`);

    // Process recipes
    const stats = {
      total: recipes.length,
      processed: 0,
      fixed: 0,
      unchanged: 0,
      errors: 0,
    };

    // Process in batches
    const batches: typeof recipes[] = [];
    for (let i = 0; i < recipes.length; i += batchSize) {
      batches.push(recipes.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      const updatePromises = batch.map(async (recipe: any) => {
        try {
          // Step 1: Remove cuisine tags, keep other tags
          const existingTags = Array.isArray(recipe.tags) ? recipe.tags : [];
          const tagsWithoutCuisine = removeCuisineTags(existingTags);

          // Step 2: Re-apply correct tagging using mergeAutoTags
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
          const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
          const title = recipe.title || '';

              // Start with tags without cuisine, then merge auto-tags
              const correctTags = await mergeAutoTags(
                tagsWithoutCuisine,
                ingredients,
                title,
                steps
              );

          // Step 3: Check if tags actually changed
          const tagsChanged = JSON.stringify(existingTags.sort()) !== JSON.stringify(correctTags.sort());

          // Step 4: Regenerate embedding from correct tags
          const recipeForEmbedding = {
            title: title,
            ingredients: ingredients,
            steps: steps,
            tags: correctTags,
            sections: recipe.sections || null,
          };

          const searchText = createRecipeSearchText(recipeForEmbedding);
          const newEmbedding = await generateEmbedding(searchText);

          // Step 5: Update recipe if tags changed or embedding needs update
          if (tagsChanged || !recipe.embedding) {
            const { error: updateError } = await supabase
              .from('recipes')
              .update({
                tags: correctTags,
                embedding: newEmbedding,
              })
              .eq('id', recipe.id);

            if (updateError) {
              console.error(`Error updating recipe ${recipe.id}:`, updateError);
              stats.errors++;
              return {
                success: false,
                recipeId: recipe.id,
                error: updateError.message,
              };
            }

            stats.fixed++;
            return {
              success: true,
              recipeId: recipe.id,
              title: title,
              oldTags: existingTags,
              newTags: correctTags,
              tagsChanged: tagsChanged,
            };
          } else {
            stats.unchanged++;
            return {
              success: true,
              recipeId: recipe.id,
              unchanged: true,
              reason: 'Tags and embedding already correct',
            };
          }
        } catch (error) {
          console.error(`Error processing recipe ${recipe.id}:`, error);
          stats.errors++;
          return {
            success: false,
            recipeId: recipe.id,
            error: String(error),
          };
        }
      });

      await Promise.all(updatePromises);
      stats.processed += batch.length;

      // Log progress
      console.log(`Processed ${stats.processed}/${stats.total} recipes...`);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Fixed tags and regenerated embeddings for ${stats.fixed} recipes.`,
        stats: {
          total: stats.total,
          processed: stats.processed,
          fixed: stats.fixed,
          unchanged: stats.unchanged,
          errors: stats.errors,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in fix-tags-and-embeddings endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}


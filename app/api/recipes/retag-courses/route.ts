/**
 * Retag Courses API Endpoint
 * 
 * POST /api/recipes/retag-courses
 * 
 * Purpose: Detect and add course type tags to recipes
 * 
 * Query Parameters:
 * - groupId (optional): Only process recipes in this group
 * - limit (optional): Maximum number of recipes to process (default: all)
 * - batchSize (optional): Number of recipes per batch (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { detectCourse } from '@/utils/autoTag';
import { hasGroupAccess } from '@/utils/permissions';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Course tags to remove before re-detection
const COURSE_TAGS_TO_REMOVE = new Set([
  'appetizer', 'appetiser', 'starter', 'soup', 'salad', 'main', 'side',
  'dessert', 'snack', 'breakfast', 'brunch', 'other'
]);

/**
 * Remove existing course tags from a tag array
 */
function removeCourseTags(tags: string[]): string[] {
  return tags.filter(tag => !COURSE_TAGS_TO_REMOVE.has(tag.toLowerCase().trim()));
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const limitParam = searchParams.get('limit');
    const batchSizeParam = searchParams.get('batchSize');

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 50;

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

    // Validate limit and batchSize
    if (limit && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    if (isNaN(batchSize) || batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid batchSize parameter (must be 1-100)' },
        { status: 400 }
      );
    }

    const stats = {
      total: 0,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      coursesAdded: {} as Record<string, number>,
    };

    // Build query
    let query = supabase
      .from('recipes')
      .select('id, title, ingredients, steps, tags')
      .order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      // Only process recipes in user's groups or user's own recipes
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = userGroups?.map(g => g.group_id) || [];
      
      if (groupIds.length > 0) {
        query = query.in('group_id', groupIds);
      } else {
        // Fallback to user's own recipes
        query = query.eq('user_id', user.id);
      }
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: recipes, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch recipes: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recipes found to process.',
        stats,
      });
    }

    stats.total = recipes.length;

    // Process in batches
    const batches: any[][] = [];
    for (let i = 0; i < recipes.length; i += batchSize) {
      batches.push(recipes.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const updatePromises = batch.map(async (recipe: any) => {
        try {
          const existingTags = Array.isArray(recipe.tags) ? recipe.tags : [];
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
          const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
          const title = recipe.title || '';

          // Remove existing course tags
          const tagsWithoutCourse = removeCourseTags(existingTags);

          // Detect course type
          const detectedCourse = detectCourse(title, ingredients, steps);

          if (!detectedCourse) {
            // No course detected - keep tags as-is (without course tags)
            stats.skipped++;
            return;
          }

          // Check if course tag already exists (case-insensitive)
          const courseTagExists = tagsWithoutCourse.some(
            tag => tag.toLowerCase() === detectedCourse.toLowerCase()
          );

          if (courseTagExists) {
            // Course tag already present, skip
            stats.skipped++;
            return;
          }

          // Add course tag
          const updatedTags = [...tagsWithoutCourse, detectedCourse];

          // Update recipe
          const { error: updateError } = await supabase
            .from('recipes')
            .update({ tags: updatedTags })
            .eq('id', recipe.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }

          stats.updated++;
          stats.coursesAdded[detectedCourse] = (stats.coursesAdded[detectedCourse] || 0) + 1;

        } catch (error) {
          console.error(`Error processing recipe ${recipe.id}:`, error);
          stats.errors++;
        }
      });

      await Promise.all(updatePromises);
      stats.processed += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.processed} recipes. Updated ${stats.updated} with course tags.`,
      stats,
    });

  } catch (error) {
    console.error('Error retagging courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}


/**
 * Retag Courses for All Recipes
 * 
 * This script detects and adds course type tags to all existing recipes.
 * 
 * Usage:
 *   npx tsx scripts/retag-courses.ts [groupId] [limit] [batchSize]
 * 
 * Parameters:
 *   - groupId (optional): Only process recipes in this group
 *   - limit (optional): Maximum number of recipes to process (default: all)
 *   - batchSize (optional): Number of recipes per batch (default: 50)
 * 
 * Process:
 * 1. Fetch recipes from database
 * 2. Detect course type for each recipe
 * 3. Add course tag to recipe tags (if not already present)
 * 4. Update recipe in database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { detectCourse } from '../utils/autoTag';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Course tags to remove before re-detection (normalize variations)
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

interface Stats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  coursesAdded: Record<string, number>;
}

async function retagCourses(groupId?: string, limit?: number, batchSize: number = 50) {
  const stats: Stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    coursesAdded: {},
  };

  console.log('🔄 Starting course retagging...');
  console.log(`   Group ID: ${groupId || 'all groups'}`);
  console.log(`   Limit: ${limit || 'unlimited'}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log('');

  try {
    // Build query
    let query = supabase
      .from('recipes')
      .select('id, title, ingredients, steps, tags')
      .order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: recipes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch recipes: ${fetchError.message}`);
    }

    if (!recipes || recipes.length === 0) {
      console.log('ℹ️  No recipes found.');
      return stats;
    }

    stats.total = recipes.length;
    console.log(`📊 Found ${stats.total} recipes to process\n`);

    // Process in batches
    const batches: any[][] = [];
    for (let i = 0; i < recipes.length; i += batchSize) {
      batches.push(recipes.slice(i, i + batchSize));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`📦 Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} recipes)...`);

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
          console.error(`   ❌ Error processing recipe ${recipe.id}:`, error);
          stats.errors++;
        }
      });

      await Promise.all(updatePromises);
      stats.processed += batch.length;

      console.log(`   ✓ Batch ${batchIdx + 1} complete (${stats.updated} updated, ${stats.errors} errors)`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }

  return stats;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const groupId = args[0] || undefined;
  const limit = args[1] ? parseInt(args[1], 10) : undefined;
  const batchSize = args[2] ? parseInt(args[2], 10) : 50;

  if (limit && isNaN(limit)) {
    console.error('❌ Invalid limit parameter. Must be a number.');
    process.exit(1);
  }

  if (isNaN(batchSize)) {
    console.error('❌ Invalid batchSize parameter. Must be a number.');
    process.exit(1);
  }

  try {
    const stats = await retagCourses(groupId, limit, batchSize);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Course Retagging Complete');
    console.log('='.repeat(60));
    console.log(`Total recipes:     ${stats.total}`);
    console.log(`Processed:         ${stats.processed}`);
    console.log(`Updated:           ${stats.updated}`);
    console.log(`Skipped:           ${stats.skipped}`);
    console.log(`Errors:            ${stats.errors}`);
    console.log('\nCourses added:');
    for (const [course, count] of Object.entries(stats.coursesAdded)) {
      console.log(`  ${course.padEnd(15)} ${count}`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { retagCourses };


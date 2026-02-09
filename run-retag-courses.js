/**
 * Browser-based Course Retagging Script
 * 
 * Run this in your browser console on the production site.
 * It will call the API endpoint to retag courses for all recipes.
 * 
 * Usage:
 *   1. Open your browser console on https://www.recipeassist.app (or your domain)
 *   2. Copy and paste this entire script
 *   3. Press Enter
 * 
 * Parameters (optional):
 *   - limit: Maximum number of recipes to process (default: all)
 *   - batchSize: Number of recipes per batch (default: 50)
 */

(async function retagCourses() {
  const limit = prompt('How many recipes to process? (Leave empty for all)') || undefined;
  const batchSize = prompt('Batch size? (Default: 50)') || '50';
  
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  params.set('batchSize', batchSize);
  
  console.log('🔄 Starting course retagging...');
  console.log(`   Limit: ${limit || 'unlimited'}`);
  console.log(`   Batch size: ${batchSize}`);
  
  try {
    const response = await fetch(`/api/recipes/retag-courses?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Course Retagging Complete');
    console.log('='.repeat(60));
    console.log(`Total recipes:     ${result.stats.total}`);
    console.log(`Processed:         ${result.stats.processed}`);
    console.log(`Updated:           ${result.stats.updated}`);
    console.log(`Skipped:           ${result.stats.skipped}`);
    console.log(`Errors:            ${result.stats.errors}`);
    console.log('\nCourses added:');
    for (const [course, count] of Object.entries(result.stats.coursesAdded || {})) {
      console.log(`  ${course.padEnd(15)} ${count}`);
    }
    console.log('='.repeat(60));
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
})();


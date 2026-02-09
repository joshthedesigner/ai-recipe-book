# How to Run Course Retagging

## Option 1: Browser Console (Recommended)

1. **Deploy the changes** (if not already deployed):
   - Make sure the new `detectCourse` function and API endpoint are deployed
   - The endpoint is at `/api/recipes/retag-courses`

2. **Open your browser** and navigate to your site (e.g., https://www.recipeassist.app)

3. **Open the browser console** (F12 or Cmd+Option+I on Mac, Ctrl+Shift+I on Windows)

4. **Copy and paste this script**:

```javascript
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
```

5. **Press Enter** and follow the prompts:
   - Enter number of recipes to process (or leave empty for all)
   - Enter batch size (default: 50)

6. **Wait for completion** - the script will show progress and final stats

## Option 2: Command Line (Local Development)

If running locally with proper environment variables:

```bash
npx tsx scripts/retag-courses.ts [groupId] [limit] [batchSize]
```

Example:
```bash
npx tsx scripts/retag-courses.ts "" 100 50
```

## What It Does

1. **Fetches recipes** from your database
2. **Removes old course tags** (appetizer, soup, salad, main, side, dessert, snack, breakfast, brunch)
3. **Detects new course type** using the semantic detection logic:
   - Checks if soup (liquid base, eaten with spoon, served alone)
   - Checks if main (served with rice/pasta/bread, has protein)
   - Checks if side (accompanies main dish)
   - Checks if appetizer (starter/small plate)
   - Checks if dessert (sweet-focused)
   - Returns null (other) if none apply
4. **Adds course tag** if detected and not already present
5. **Updates recipes** in batches

## Expected Results

The script will show:
- Total recipes found
- Number processed
- Number updated (with new course tags)
- Number skipped (already had correct tag or couldn't detect)
- Number of errors
- Breakdown by course type (soup, main, side, appetizer, dessert, other)

## Notes

- The script processes recipes in batches to avoid overwhelming the database
- It only updates recipes that need course tags (skips if already correct)
- Errors are logged but don't stop the process
- The new detection logic follows strict semantic rules based on how dishes are served


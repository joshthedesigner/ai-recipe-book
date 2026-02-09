# Fix Tags and Regenerate Embeddings Guide

## Overview

This endpoint fixes the tagging issue caused by SQL scripts that incorrectly tagged recipes. It:
1. Removes all incorrect cuisine tags
2. Re-applies correct tagging using the TypeScript logic
3. Regenerates embeddings from the correct tags

## Endpoint

**POST** `/api/recipes/fix-tags-and-embeddings`

## Authentication

Requires user authentication. Only processes recipes the user has access to.

## Query Parameters

- `groupId` (optional): Only fix recipes in this specific group
- `limit` (optional): Maximum number of recipes to process (default: all)
- `batchSize` (optional): Number of recipes per batch (default: 50)

## Usage Examples

### Fix All Recipes (Browser Console)

```javascript
// Fix all recipes you have access to
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

### Fix Recipes in a Specific Group

```javascript
// Fix recipes in a specific group
const groupId = 'your-group-id-here';
fetch(`/api/recipes/fix-tags-and-embeddings?groupId=${groupId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

### Fix Limited Number of Recipes (Test First)

```javascript
// Test with first 10 recipes
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

### Using cURL

```bash
# Fix all recipes
curl -X POST "https://your-domain.com/api/recipes/fix-tags-and-embeddings" \
  -H "Content-Type: application/json" \
  -b "your-session-cookie"

# Fix recipes in a group
curl -X POST "https://your-domain.com/api/recipes/fix-tags-and-embeddings?groupId=your-group-id" \
  -H "Content-Type: application/json" \
  -b "your-session-cookie"
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Fixed tags and regenerated embeddings for 150 recipes.",
  "stats": {
    "total": 200,
    "processed": 200,
    "fixed": 150,
    "unchanged": 45,
    "errors": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## What It Does

### Step 1: Remove Incorrect Cuisine Tags
- Removes all cuisine tags (chinese, italian, japanese, etc.)
- Removes all regional variants (sichuan, cantonese, goan, etc.)
- **Keeps**: protein tags (fish, chicken, beef, etc.)
- **Keeps**: dietary tags (vegetarian, vegan)
- **Keeps**: meal type tags (breakfast, lunch, dinner, etc.)
- **Keeps**: other user-added tags

### Step 2: Re-Apply Correct Tagging
- Uses `mergeAutoTags()` function
- Analyzes recipe content (title, ingredients, steps)
- Detects cuisines using `detectCuisines()` with proper matching logic
- Adds protein tags from ingredients
- Expands regional tags (e.g., "sichuan" → adds "chinese")

### Step 3: Regenerate Embeddings
- Creates search text from: Title + Ingredients + Steps + **Correct Tags** + Sections
- Generates new embedding using OpenAI
- Updates both `tags` and `embedding` columns

## Processing

- Processes recipes in batches (default: 50 per batch)
- Updates are done in parallel within each batch
- Logs progress to console
- Continues processing even if individual recipes fail

## Safety

- Only processes recipes the user has access to
- Can be run incrementally (use `limit` parameter)
- Can be filtered by group
- Logs all errors for debugging
- Returns detailed statistics

## Recommended Workflow

1. **Test First**: Run with `limit=10` to verify it works correctly
2. **Check Results**: Verify a few recipes have correct tags
3. **Run on Group**: Fix one group at a time
4. **Monitor Progress**: Check console logs for errors
5. **Verify**: Test semantic search to ensure it works

## Notes

- This process calls OpenAI API for each recipe (to generate embeddings)
- May take time for large recipe collections
- Cost: ~$0.02 per 1M tokens (text-embedding-3-small)
- Average recipe: ~500-1000 tokens, so ~$0.00001-0.00002 per recipe

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in
- Check that your session cookie is valid

### "You do not have access to this recipe book"
- Verify the groupId is correct
- Check that you're a member of the group

### Processing Takes Too Long
- Use `limit` parameter to process in smaller batches
- Use `batchSize` parameter to adjust batch size (smaller = slower but more memory efficient)

### Some Recipes Show Errors
- Check console logs for specific error messages
- Common issues: missing ingredients/steps, invalid data format
- These recipes are skipped and counted in `errors` stat


# How to Run the Fix Tags and Embeddings Endpoint

## Option 1: Browser Console (Recommended)

This is the easiest way since you're already logged in.

### Test with 10 Recipes First

1. Open your browser and go to your app
2. Open Developer Console (F12 or Cmd+Option+I)
3. Run this:

```javascript
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Result:', result);
  if (result.success) {
    console.log(`Fixed: ${result.stats.fixed}, Unchanged: ${result.stats.unchanged}, Errors: ${result.stats.errors}`);
  }
});
```

### If Test Looks Good, Run on All Recipes

```javascript
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Result:', result);
  console.log(`Total: ${result.stats.total}`);
  console.log(`Fixed: ${result.stats.fixed}`);
  console.log(`Unchanged: ${result.stats.unchanged}`);
  console.log(`Errors: ${result.stats.errors}`);
});
```

### Fix Recipes in a Specific Group

```javascript
const groupId = 'your-group-id-here';
fetch(`/api/recipes/fix-tags-and-embeddings?groupId=${groupId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

## Option 2: Using cURL (Requires Session Cookie)

1. Get your session cookie from browser DevTools
2. Run:

```bash
# Test with 10 recipes
curl -X POST "https://your-domain.com/api/recipes/fix-tags-and-embeddings?limit=10" \
  -H "Content-Type: application/json" \
  -b "sb-access-token=YOUR_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN"

# Run on all recipes
curl -X POST "https://your-domain.com/api/recipes/fix-tags-and-embeddings" \
  -H "Content-Type: application/json" \
  -b "sb-access-token=YOUR_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN"
```

## Option 3: Using the Script (Requires Auth Setup)

```bash
# Test with 10 recipes
npx tsx scripts/fix-tags-and-embeddings.ts --limit=10

# Run on all recipes
npx tsx scripts/fix-tags-and-embeddings.ts --all

# Fix specific group
npx tsx scripts/fix-tags-and-embeddings.ts --groupId=your-group-id
```

**Note:** The script requires authentication cookies, so browser console is easier.

## What to Expect

### First Run (Test with 10 recipes)
- Should complete in ~10-30 seconds
- Check the results to verify tags are correct
- Look at a few recipes in the UI to confirm

### Full Run
- May take several minutes depending on number of recipes
- Each recipe requires an OpenAI API call (~$0.00001-0.00002 per recipe)
- Progress is logged to server console
- Returns statistics when complete

## Monitoring Progress

The endpoint processes recipes in batches and logs progress. Check your server logs to see:
```
Processing 200 recipes to fix tags and regenerate embeddings...
Processed 50/200 recipes...
Processed 100/200 recipes...
...
```

## Verifying Results

After running, check a few recipes:
1. Open a recipe that should have a cuisine tag
2. Verify the tag is correct (e.g., Chinese recipe has "chinese" tag)
3. Try semantic search to ensure it works
4. Check that embeddings are updated (recipes should appear in correct search results)

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in
- Check that your session is valid

### "You do not have access to this recipe book"
- Verify the groupId is correct
- Check that you're a member of the group

### Some Recipes Show Errors
- Check server logs for specific error messages
- Common issues: missing data, invalid format
- These recipes are skipped and counted in errors

### Processing Takes Too Long
- This is normal for large recipe collections
- Each recipe requires an OpenAI API call
- Use `limit` parameter to process in smaller batches


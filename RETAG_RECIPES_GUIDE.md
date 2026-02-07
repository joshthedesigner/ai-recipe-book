# How to Re-tag Existing Recipes

After adding the complete cuisine configurations, you can apply them to existing recipes using the re-tag API endpoint.

## Quick Start

### Option 1: Re-tag All Your Recipes

```bash
# From your terminal (requires authentication cookie)
curl -X POST "http://localhost:3000/api/recipes/retag" \
  -H "Cookie: your-auth-cookie"
```

### Option 2: Re-tag Recipes in a Specific Group

```bash
curl -X POST "http://localhost:3000/api/recipes/retag?groupId=YOUR_GROUP_ID" \
  -H "Cookie: your-auth-cookie"
```

### Option 3: Re-tag Limited Number of Recipes (for testing)

```bash
# Re-tag first 10 recipes
curl -X POST "http://localhost:3000/api/recipes/retag?limit=10" \
  -H "Cookie: your-auth-cookie"
```

## Using from Browser Console

1. Open your browser's developer console (F12)
2. Navigate to your recipe app (must be logged in)
3. Run this JavaScript:

```javascript
// Re-tag all your recipes
fetch('/api/recipes/retag', {
  method: 'POST',
  credentials: 'include'
})
.then(res => res.json())
.then(data => {
  console.log('Re-tagging complete!', data);
  console.log(`Updated: ${data.stats.updated} recipes`);
  console.log(`Unchanged: ${data.stats.unchanged} recipes`);
  console.log(`Errors: ${data.stats.errors} recipes`);
});

// Or re-tag recipes in a specific group
const groupId = 'YOUR_GROUP_ID';
fetch(`/api/recipes/retag?groupId=${groupId}`, {
  method: 'POST',
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Result:', data));
```

## API Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `groupId` | string | No | - | Only re-tag recipes in this group |
| `batchSize` | number | No | 50 | Number of recipes to process per batch |
| `limit` | number | No | all | Maximum number of recipes to process |

## Response Format

```json
{
  "success": true,
  "message": "Re-tagging complete. Processed 150 recipes.",
  "stats": {
    "total": 150,
    "processed": 150,
    "updated": 45,
    "unchanged": 103,
    "errors": 2
  }
}
```

## What Gets Updated?

The endpoint:
1. Fetches recipes (filtered by groupId if provided)
2. Re-runs the auto-tagging logic using `mergeAutoTags()`
3. Compares new tags with existing tags
4. Updates only recipes where tags changed
5. Preserves existing tags and adds new cuisine tags

## Example: Before and After

**Before:**
```json
{
  "title": "Kung Pao Chicken",
  "tags": ["chicken", "spicy"]
}
```

**After:**
```json
{
  "title": "Kung Pao Chicken",
  "tags": ["chicken", "spicy", "chinese"]
}
```

## Safety

- ✅ Only updates recipes you have access to
- ✅ Preserves existing tags (adds new ones, doesn't remove)
- ✅ Processes in batches to avoid overwhelming the server
- ✅ Returns detailed statistics
- ✅ Handles errors gracefully

## Performance

- **Batch size**: 50 recipes per batch (configurable)
- **Processing**: Runs in parallel within each batch
- **Time**: ~1-2 seconds per 100 recipes

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in
- Check that your session cookie is valid

### "You do not have access to this recipe book"
- Verify the groupId is correct
- Check that you have access to the group

### No recipes updated
- Recipes might already have correct tags
- Check the `unchanged` count in the response
- Verify recipes have ingredients/steps that match cuisine configs

## Next Steps

After re-tagging:
1. Check the filter dropdown - you should see more cuisine options
2. Filter by cuisine to verify recipes are categorized correctly
3. If some recipes aren't tagged, they might not match the detection criteria (need 2+ indicators)


# Run Retagging Now - Quick Guide

## Quick Start

1. **Open your app in the browser** (make sure you're logged in)
2. **Open Developer Console** (F12 or Cmd+Option+I)
3. **Copy and paste ONE of these:**

### Test First (10 recipes):

```javascript
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Test:', result);
  if (result.success) {
    console.log('Fixed:', result.stats.fixed);
    console.log('Unchanged:', result.stats.unchanged);
  }
});
```

### If test looks good, run on ALL recipes:

```javascript
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Complete!', result);
  if (result.success) {
    console.log('Total:', result.stats.total);
    console.log('Fixed:', result.stats.fixed);
  }
});
```

## What It Does

1. ✅ Removes all incorrect cuisine tags
2. ✅ Re-applies correct tagging (only best match per recipe)
3. ✅ Regenerates embeddings from correct tags
4. ✅ Updates both tags and embedding columns

## Expected Results

- Each recipe should have **only ONE cuisine tag** (the best match)
- Tags should match the recipe content
- Embeddings will be regenerated to match the correct tags

## Time Estimate

- 10 recipes: ~10-30 seconds
- 100 recipes: ~2-5 minutes
- 1000 recipes: ~20-50 minutes

Each recipe requires an OpenAI API call for embedding generation.

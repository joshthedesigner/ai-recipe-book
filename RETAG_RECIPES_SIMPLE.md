# Simple Recipe Retagging Guide

## Option 1: SQL + Endpoint (Recommended)

### Step 1: Remove Incorrect Tags (SQL in Supabase)

1. Go to Supabase SQL Editor
2. Run the script: `supabase/remove-incorrect-cuisine-tags.sql`
3. This removes all cuisine tags from recipes

### Step 2: Re-tag and Regenerate Embeddings (Browser Console)

After SQL completes, run this in your browser console:

```javascript
// Test with 10 recipes first
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Test Result:', result);
  if (result.success) {
    console.log(`Fixed: ${result.stats.fixed}, Unchanged: ${result.stats.unchanged}`);
  }
});

// If test looks good, run on all recipes:
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Complete!', result);
});
```

## Option 2: Endpoint Only (No SQL)

Just run the endpoint - it will:
1. Remove cuisine tags automatically
2. Re-apply correct tagging
3. Regenerate embeddings

```javascript
// Test first
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);

// Then all recipes
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

## What Happens

1. **Removes** all cuisine tags (korean, chinese, indian, etc.)
2. **Re-applies** correct tagging using fixed logic (only best match)
3. **Regenerates** embeddings from correct tags
4. **Updates** both tags and embedding columns

## Recommendation

**Use Option 2 (Endpoint Only)** - It's simpler and does everything in one step. The endpoint already removes cuisine tags before re-applying, so the SQL step is optional.


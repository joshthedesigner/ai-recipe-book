# Tagging Issue Diagnosis

## Problem Summary
The SQL re-tagging scripts updated recipe `tags` but did NOT regenerate `embeddings`. This created a mismatch:
- **Tags** contain the new cuisine classifications
- **Embeddings** were generated from the OLD tags (before SQL update)
- **Result**: Semantic search returns incorrect recipes because embeddings don't match current tags

## Current Architecture

### How Embeddings Are Generated (Normal Flow)
1. Recipe is extracted/saved via `storeRecipe()` or `saveConfirmedRecipe()`
2. `mergeAutoTags()` adds auto-generated tags (protein + cuisine detection)
3. `createRecipeSearchText()` combines: `Title + Ingredients + Steps + Tags + Sections`
4. `generateEmbedding()` creates vector embedding from that combined text
5. Recipe saved with both `tags` and `embedding` columns

**Key Point**: Embeddings include tags in the search text, so they're semantically linked to the tags.

### What the SQL Scripts Did Wrong
1. Updated `tags` column directly via SQL
2. Did NOT regenerate `embeddings` 
3. Created mismatch: tags have new cuisine tags, but embeddings were generated from old tags

### The Mismatch
```
Before SQL:
- Tags: ["pasta", "dinner"] 
- Embedding: Generated from "Title: Pasta... Ingredients: ... Tags: pasta, dinner"

After SQL (wrong):
- Tags: ["pasta", "dinner", "italian"] ← Added cuisine tag
- Embedding: Still from "Title: Pasta... Ingredients: ... Tags: pasta, dinner" ← OLD, doesn't include "italian"
```

## Solution Required

### Step 1: Regenerate Embeddings for All Recipes
For each recipe that had tags updated:
1. Get current recipe data: `title`, `ingredients`, `steps`, `tags`, `sections`
2. Call `createRecipeSearchText()` with CURRENT tags (includes new cuisine tags)
3. Call `generateEmbedding()` to create new embedding
4. Update `recipes.embedding` column

### Step 2: Ensure Tags Are Correct
Verify that tags were correctly applied by the SQL scripts:
- Check if cuisine detection logic was correct
- Verify tags match the recipe content

## Implementation Approach

### Option A: API Endpoint (Recommended)
Create `/api/recipes/regenerate-embeddings`:
- Fetches recipes in batches
- Regenerates embeddings using current tags
- Updates database
- Can be run incrementally

### Option B: SQL Function
Create a PostgreSQL function that:
- Loops through recipes
- Calls external API to generate embeddings (complex, requires HTTP extension)
- Updates embeddings

**Recommendation**: Use Option A (API endpoint) because:
- Can leverage existing TypeScript functions (`createRecipeSearchText`, `generateEmbedding`)
- Easier to test and debug
- Can process in batches with progress tracking
- Can filter by date/group if needed

## Files to Check/Modify

1. **`vector/embed.ts`**
   - `createRecipeSearchText()` - Used to generate embedding text
   - `generateEmbedding()` - Generates the actual embedding

2. **`agents/storeRecipe.ts`**
   - Shows how embeddings are normally generated
   - Pattern to follow for regeneration

3. **Database Schema**
   - `recipes.embedding` column (VECTOR(1536))
   - `recipes.tags` column (TEXT[])

## Next Steps

1. Create API endpoint to regenerate embeddings
2. Run it on all recipes (or filter to recently updated ones)
3. Verify embeddings match current tags
4. Test semantic search to ensure it works correctly


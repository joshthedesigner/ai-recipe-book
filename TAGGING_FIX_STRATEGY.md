# Tagging Fix Strategy

## The Real Problem

You're absolutely right! If the existing tags are wrong, regenerating embeddings from wrong tags just makes the problem worse.

**Current State:**
- ❌ Tags: Wrong (SQL scripts added incorrect cuisine tags)
- ❌ Embeddings: Generated from old tags (before SQL), but those might have been wrong too
- ❌ Result: Everything is misaligned

## Solution: Three-Step Fix

### Step 1: Remove Incorrect Tags
Remove all cuisine tags that were incorrectly added by SQL scripts.

**Cuisine tags to potentially remove:**
- `chinese`, `italian`, `japanese`, `mexican`, `thai`, `indian`, `korean`, `french`, `greek`, `american`, `vietnamese`, `middle eastern`, `mediterranean`

**Strategy:**
- Option A: Remove ALL cuisine tags (clean slate)
- Option B: Keep only tags that were there before SQL (if we can identify them)
- Option C: Remove only tags that don't match recipe content (requires checking each recipe)

**Recommendation: Option A** - Remove all cuisine tags, then re-apply correctly.

### Step 2: Re-Apply Correct Tagging
Use the existing TypeScript logic to correctly tag recipes:
- `mergeAutoTags()` - This function:
  1. Gets protein tags from ingredients (fish, chicken, beef, etc.)
  2. Gets cuisine tags using `detectCuisines()` (checks ingredients + dishes + title + steps)
  3. Expands regional tags (e.g., "sichuan" → adds "chinese")
  4. Removes duplicates

**This ensures:**
- Tags are based on actual recipe content
- Uses the correct `CUISINE_CONFIGS` with proper matching logic
- Follows the same logic as new recipes

### Step 3: Regenerate Embeddings
After tags are correct:
- Use `createRecipeSearchText()` with CORRECT tags
- Generate new embeddings
- Update database

## Implementation Plan

### API Endpoint: `/api/recipes/fix-tags-and-embeddings`

**Process:**
1. Fetch recipes in batches
2. For each recipe:
   a. Remove all cuisine tags (or all tags if starting fresh)
   b. Call `mergeAutoTags()` with current recipe data to get correct tags
   c. Call `createRecipeSearchText()` with correct tags
   d. Call `generateEmbedding()` to create new embedding
   e. Update both `tags` and `embedding` columns
3. Return statistics (fixed, errors, etc.)

**Safety:**
- Process in batches (50-100 at a time)
- Can filter by date/group
- Can run incrementally
- Logs all changes

## Alternative: Two Separate Endpoints

### Endpoint 1: `/api/recipes/fix-tags`
- Removes incorrect cuisine tags
- Re-applies correct tagging using `mergeAutoTags()`
- Updates `tags` column only

### Endpoint 2: `/api/recipes/regenerate-embeddings`
- Regenerates embeddings from current (now correct) tags
- Updates `embedding` column only

**Advantage:** Can verify tags are correct before regenerating embeddings.

## What Tags to Keep?

**Keep:**
- Protein tags: `fish`, `chicken`, `beef`, `pork`, `lamb`, `seafood`
- Dietary tags: `vegetarian`, `vegan`
- Meal type tags: `breakfast`, `lunch`, `dinner`, `dessert`, `snack`
- Other user-added tags (if any)

**Remove:**
- All cuisine tags: `chinese`, `italian`, `japanese`, etc.
- Then re-add only the correct ones via `detectCuisines()`

## Questions to Answer

1. **Should we remove ALL tags or just cuisine tags?**
   - If we remove all, we lose user-added tags
   - If we remove only cuisine tags, we might miss other incorrect tags
   - **Recommendation:** Remove only cuisine tags, keep the rest

2. **How do we identify which tags are cuisine tags?**
   - Use the `CUISINE_CONFIGS` list of cuisine names
   - Also check `CUISINE_HIERARCHY` for regional variants

3. **Should we preserve any existing tags?**
   - Yes: protein tags, dietary tags, meal type tags
   - No: cuisine tags (re-apply correctly)

## Next Steps

1. Create endpoint to fix tags (remove incorrect, re-apply correct)
2. Test on a small batch first
3. Verify tags are correct
4. Then regenerate embeddings
5. Test semantic search


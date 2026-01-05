# Diagnosis: Jitter When Favoriting Recipe

## Problem
The recipe list fidgets/jumps when favoriting (or unfavoriting) a recipe. This is the same root cause as adding recipes, but occurs more frequently.

## Current Implementation Analysis

### What Happens When Recipe is Favorited:

1. User clicks "Add to favorites" on a recipe card
2. `handleFavoriteToggle` is called
3. Updates local state:
   ```typescript
   setRecipes(prev => prev.map(r => 
     r.id === recipeId ? { ...r, is_favorite: isFavorite } : r
   ));
   setFilteredRecipes(prev => prev.map(r => 
     r.id === recipeId ? { ...r, is_favorite: isFavorite } : r
   ));
   ```
   Note: `displayedRecipes` is NOT updated here
4. API call completes (updates database)

### The Issue:

When `filteredRecipes` changes (even just updating the `is_favorite` property), the useEffect runs:

```typescript
useEffect(() => {
  setCurrentPage(0);           // ⚠️ Resets to page 0
  setHasMore(filteredRecipes.length > PAGE_SIZE);
  const initialBatch = filteredRecipes.slice(0, PAGE_SIZE);
  setDisplayedRecipes(initialBatch);  // ⚠️ Replaces ALL displayed recipes
}, [filteredRecipes]);
```

### Why This Triggers:

Even though we're just updating the `is_favorite` property, `filteredRecipes` is a **new array** (because of `.map()`), so React sees it as changed, triggering the useEffect.

### What Happens:

1. User has scrolled down, loaded 36 recipes
2. User favorites a recipe
3. `setFilteredRecipes` creates a new array (same recipes, just `is_favorite` updated)
4. useEffect sees `filteredRecipes` changed → triggers
5. useEffect resets everything:
   - `currentPage` → 0
   - `displayedRecipes` → Only first 12 recipes
6. React unmounts 36 cards, mounts 12 cards
7. Layout shift/jump occurs

### What Happens:

1. User has scrolled down, loaded 36 recipes
2. User favorites a recipe
3. `setFilteredRecipes` creates a new array (even though it's the same recipes)
4. useEffect sees `filteredRecipes` changed → triggers
5. useEffect resets everything:
   - `currentPage` → 0
   - `displayedRecipes` → Only first 12 recipes
6. React unmounts 36 cards, mounts 12 cards
7. Layout shift/jump occurs

## Root Cause

**The useEffect depends on `filteredRecipes`, but `filteredRecipes` changes even when:**
- Just updating a property (like `is_favorite`)
- Not changing the actual list of recipes
- Not changing filters/sort

**The useEffect treats ALL `filteredRecipes` changes the same way:**
- Filter change → Reset (correct) ✅
- Sort change → Reset (correct) ✅
- Recipe added → Reset (incorrect) ❌
- Recipe favorited → Reset (incorrect) ❌
- Any property update → Reset (incorrect) ❌

**The core problem:** We're using `filteredRecipes` array identity to detect when to reset, but we should be using filter/sort values instead.

## Solution

The fix is the same as discussed before - track filter/sort values instead of `filteredRecipes` array identity:

1. **Track previous filter/sort values** (not just `filteredRecipes`)
2. **Only reset when filters/sort change** (not when `filteredRecipes` changes due to property updates)
3. **When just updating properties** (like favoriting):
   - Keep `displayedRecipes` as-is
   - Update the property in `displayedRecipes` as well (in `handleFavoriteToggle`)
   - No reset needed

### Key Insight:

We should compare **filter/sort values**, not `filteredRecipes` array identity, to determine if we need to reset.

## Implementation

The fix will work for both favoriting AND adding recipes:

1. Track previous filter/sort values in a ref
2. Compare current vs previous filter/sort values
3. Only reset if filters/sort changed
4. If filters/sort didn't change, don't reset `displayedRecipes`

Additionally, we need to update `displayedRecipes` when favoriting (currently it's not updated):

```typescript
const handleFavoriteToggle = (recipeId: string, isFavorite: boolean) => {
  setRecipes(prev => prev.map(r => 
    r.id === recipeId ? { ...r, is_favorite: isFavorite } : r
  ));
  setFilteredRecipes(prev => prev.map(r => 
    r.id === recipeId ? { ...r, is_favorite: isFavorite } : r
  ));
  // ADD THIS: Update displayedRecipes as well
  setDisplayedRecipes(prev => prev.map(r => 
    r.id === recipeId ? { ...r, is_favorite: isFavorite } : r
  ));
};
```

This way:
- Favoriting → Filters/sort unchanged → No reset → Update `displayedRecipes` in place → No jitter ✅
- Adding recipe → Filters/sort unchanged → No reset → Insert new recipe → No jitter ✅
- Changing filter → Filters changed → Reset → Correct behavior ✅
- Changing sort → Sort changed → Reset → Correct behavior ✅


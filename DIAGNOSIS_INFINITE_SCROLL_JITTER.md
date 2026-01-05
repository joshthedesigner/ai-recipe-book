# Diagnosis: Infinite Scroll Causing Jitter

## Problem
Even after implementing `startTransition` + Double RAF, the recipe list still fidgets/jumps when adding a recipe. Root cause is related to infinite scroll state management.

## Root Cause: Complete List Replacement on Every `filteredRecipes` Change

### The Issue:

When a recipe is added, `fetchRecipes` updates `filteredRecipes`, which triggers this useEffect:

```typescript
useEffect(() => {
  setCurrentPage(0);           // ⚠️ Always resets to page 0
  setHasMore(filteredRecipes.length > PAGE_SIZE);
  const initialBatch = filteredRecipes.slice(0, PAGE_SIZE);
  setDisplayedRecipes(initialBatch);  // ⚠️ Replaces ENTIRE array with only first 12 items
  // Scroll restoration...
}, [filteredRecipes]);
```

### What Happens:

1. User scrolls down, loads more recipes via infinite scroll
   - `currentPage` = 2
   - `displayedRecipes` = [recipe1, recipe2, ..., recipe36] (36 recipes loaded)

2. User adds a new recipe
   - `fetchRecipes` runs, updates `filteredRecipes` (includes new recipe)
   - useEffect triggers because `filteredRecipes` changed

3. useEffect resets everything:
   - `setCurrentPage(0)` → Loses track of pagination
   - `setDisplayedRecipes(initialBatch)` → Replaces all 36 recipes with only first 12
   - React unmounts all 36 recipe cards
   - React mounts 12 new recipe cards
   - **Massive layout shift/jump**

4. Even with scroll restoration:
   - Scroll position is restored
   - But content has completely changed (36 cards → 12 cards)
   - User loses all their loaded recipes
   - Visual jump occurs

### Why This Causes Jitter:

- **Complete array replacement**: React sees `displayedRecipes` as completely new array
- **All cards unmount**: All 36 recipe cards are unmounted
- **New cards mount**: Only 12 new cards mount
- **Grid layout recalculates**: Material-UI Grid recalculates for 12 items instead of 36
- **Page height changes**: Dramatically shorter page
- **Scroll position becomes wrong**: Even if restored, relative to different content

### Infinite Scroll State Loss:

The infinite scroll logic depends on:
- `currentPage` → Reset to 0, loses pagination state
- `displayedRecipes` → Reset to first PAGE_SIZE items, loses all loaded recipes
- `hasMore` → Recalculated, but user's scroll position is lost

## Evidence

### State Before Adding Recipe:
```
currentPage: 2
displayedRecipes: [recipe1, recipe2, ..., recipe36]  // 36 recipes
hasMore: true
```

### State After Adding Recipe:
```
currentPage: 0  // ⚠️ Reset!
displayedRecipes: [newRecipe, recipe1, ..., recipe11]  // ⚠️ Only 12 recipes!
hasMore: true
```

### React Behavior:
```typescript
// Before: 36 RecipeCard components mounted
// After: 12 RecipeCard components mounted
// React unmounts 36, mounts 12 → Layout shift
```

## Solution Options

### Option 1: Preserve Displayed Recipes (Smart Update) ⭐ RECOMMENDED
Only reset `displayedRecipes` when filters/sort change, not when just adding a recipe.

**When to reset:**
- Sort changed
- Filter changed (cuisine, ingredient, search, favorites)

**When to preserve:**
- Just adding a recipe (no filter/sort change)
- Merge new recipe into existing `displayedRecipes` at correct sorted position

**Implementation:**
1. Track previous filter/sort values in a ref
2. Compare current vs previous values
3. If changed → Reset `displayedRecipes` (filter/sort change)
4. If same → Insert new recipe at correct position (just adding recipe)

**Pros:**
- No unmounting of existing cards
- No layout shift
- User keeps loaded recipes
- Scroll position naturally preserved
- Most scalable

**Cons:**
- More complex logic
- Need to track filter/sort state

### Option 2: Optimistic UI Update
Add new recipe optimistically to current `displayedRecipes` before fetching.

1. Immediately insert new recipe into `displayedRecipes` at correct position
2. Fetch in background to sync
3. No reset needed

**Pros:**
- Instant feedback
- No layout shift
- Simple

**Cons:**
- Need to handle sync failures
- May show stale data briefly

### Option 3: Maintain Scroll Relative to Content (Anchor-based)
Track first visible recipe, restore scroll relative to it.

**Pros:**
- Works even with layout shifts

**Cons:**
- Still causes unmounting (cards still replaced)
- More complex
- Doesn't solve root cause

## Recommended Solution: Option 1 (Smart Update)

**Rationale:**
- Prevents unnecessary unmounting
- Preserves user's scroll position naturally
- User doesn't lose loaded recipes
- Most scalable approach
- Handles both filter changes and recipe additions correctly

**Implementation Approach:**

1. Use a ref to track previous filter/sort values:
   ```typescript
   const previousFiltersRef = useRef({
     sortBy,
     searchQuery,
     filterCuisine,
     filterMainIngredient,
     filterFavorites,
   });
   ```

2. In the useEffect, compare current vs previous:
   ```typescript
   const filtersChanged = 
     sortBy !== previousFiltersRef.current.sortBy ||
     searchQuery !== previousFiltersRef.current.searchQuery ||
     filterCuisine !== previousFiltersRef.current.filterCuisine ||
     filterMainIngredient !== previousFiltersRef.current.filterMainIngredient ||
     filterFavorites !== previousFiltersRef.current.filterFavorites;
   ```

3. If filters changed → Reset (existing behavior)
4. If filters unchanged → Insert new recipe at correct position
5. Update ref with current values

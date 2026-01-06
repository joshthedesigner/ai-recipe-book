# Fix Explanation: Infinite Scroll Jitter

## The Problem (Simplified)

Right now, **every time `filteredRecipes` changes, we reset everything** - even when just adding a recipe.

### Current Behavior:

```
User has scrolled down and loaded 36 recipes
↓
User adds a new recipe
↓
filteredRecipes changes (new recipe added)
↓
useEffect runs and RESETS everything:
  - currentPage → 0 (loses pagination)
  - displayedRecipes → Only first 12 recipes (replaces all 36)
↓
React unmounts 36 cards, mounts 12 cards
↓
Layout shift / jump occurs
```

## The Fix (Simplified)

**Only reset when filters/sort change. When just adding a recipe, insert it into the existing list.**

### New Behavior:

```
User has scrolled down and loaded 36 recipes
↓
User adds a new recipe
↓
filteredRecipes changes (new recipe added)
↓
Check: Did filters/sort change? NO (just adding recipe)
↓
Keep current displayedRecipes (36 recipes stay mounted)
Insert new recipe at correct sorted position
↓
React updates only the new card (or reorders existing cards)
↓
No layout shift / no jump
```

## How We'll Implement It

### Step 1: Track Previous Filter/Sort Values

We'll use a `useRef` to remember what the filters/sort were before:

```typescript
const previousFiltersRef = useRef({
  sortBy,
  searchQuery,
  filterCuisine,
  filterMainIngredient,
  filterFavorites,
});
```

### Step 2: Compare Current vs Previous

In the useEffect, we'll check if filters/sort changed:

```typescript
const filtersChanged = 
  sortBy !== previousFiltersRef.current.sortBy ||
  searchQuery !== previousFiltersRef.current.searchQuery ||
  filterCuisine !== previousFiltersRef.current.filterCuisine ||
  filterMainIngredient !== previousFiltersRef.current.filterMainIngredient ||
  filterFavorites !== previousFiltersRef.current.filterFavorites;
```

### Step 3: Two Different Behaviors

#### If Filters Changed → Reset (Current Behavior)
```typescript
if (filtersChanged) {
  // Reset everything (user changed filters/sort, need fresh start)
  setCurrentPage(0);
  setHasMore(filteredRecipes.length > PAGE_SIZE);
  const initialBatch = filteredRecipes.slice(0, PAGE_SIZE);
  setDisplayedRecipes(initialBatch);
}
```

#### If Filters Didn't Change → Smart Insert (New Behavior)
```typescript
else {
  // Just adding a recipe, no filter change
  // Keep current displayedRecipes, insert new recipe at correct position
  
  // Find which recipes are new (compare filteredRecipes with current displayedRecipes)
  const currentIds = new Set(displayedRecipes.map(r => r.id));
  const newRecipes = filteredRecipes.filter(r => !currentIds.has(r.id));
  
  if (newRecipes.length > 0) {
    // Insert new recipes at correct sorted position
    setDisplayedRecipes(prev => {
      const merged = [...prev, ...newRecipes];
      // Re-sort based on current sortBy
      // (recipes are already sorted from API, but we need to merge correctly)
      return merged.sort((a, b) => {
        // Sort logic based on sortBy
        // ...
      });
    });
  }
  
  // Update total count
  setTotalRecipeCount(filteredRecipes.length);
  // Don't reset currentPage or hasMore
}
```

### Step 4: Update the Ref

After processing, update the ref to current values:

```typescript
previousFiltersRef.current = {
  sortBy,
  searchQuery,
  filterCuisine,
  filterMainIngredient,
  filterFavorites,
};
```

## Important Details

### Sorting Logic

Since recipes come from the API already sorted, when we merge:
- New recipes are already in the correct position in `filteredRecipes`
- We need to find where they belong in `displayedRecipes`
- For "Recently Added" (default), new recipes go at the top
- We can use the order from `filteredRecipes` to determine correct position

### Edge Cases to Handle

1. **Multiple recipes added at once** (rare, but possible)
   - Handle multiple new recipes in the merge logic

2. **Recipe already in displayedRecipes** (shouldn't happen, but be safe)
   - Use Set to deduplicate

3. **Recipe deleted** (already handled separately)
   - Delete logic already handles this correctly

4. **Initial load** (no previous filters)
   - First time, `previousFiltersRef.current` is undefined
   - Treat as "filters changed" to reset properly

## Benefits of This Fix

1. ✅ **No unmounting** - Existing cards stay mounted
2. ✅ **No layout shift** - Grid doesn't recalculate dramatically
3. ✅ **User keeps loaded recipes** - Infinite scroll state preserved
4. ✅ **Scroll position preserved naturally** - No manual scroll restoration needed
5. ✅ **Works with filters** - Still resets correctly when filters change

## Example Flow

### Scenario: User adds recipe while scrolled down

**Before Fix:**
```
User sees: 36 recipes (scrolled down, loaded 3 pages)
User adds: New recipe "Pasta Carbonara"
Result: 
  - All 36 cards unmount
  - Only 12 cards mount (first page)
  - User loses scroll position
  - User sees jump/shift
```

**After Fix:**
```
User sees: 36 recipes (scrolled down, loaded 3 pages)
User adds: New recipe "Pasta Carbonara"
Result:
  - All 36 cards stay mounted
  - New "Pasta Carbonara" card inserted at top (if "Recently Added" sort)
  - User's scroll position preserved naturally
  - No jump/shift
  - User sees new recipe if they scroll to top
```

## Code Structure

The fix will modify the useEffect at line 330:

```typescript
useEffect(() => {
  // Check if filters changed
  const filtersChanged = /* comparison logic */;
  
  if (filtersChanged) {
    // Reset behavior (existing logic)
  } else {
    // Smart merge behavior (new logic)
  }
  
  // Update ref
  previousFiltersRef.current = { /* current values */ };
}, [filteredRecipes, sortBy, searchQuery, filterCuisine, filterMainIngredient, filterFavorites]);
```

Note: We'll need to add filter/sort dependencies to the useEffect so it can compare them.


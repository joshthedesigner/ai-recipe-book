# Diagnosis: Lazy Loader Causes Twitching - Root Cause Identified

## Problem
Loading more recipes via infinite scroll (lazy loader) causes twitching/jitter. This is a NEW issue introduced by our fix.

## Root Cause: Unnecessary `hasMore` Update in Else Branch

### The Issue:

Look at line 379 in the useEffect:

```typescript
else {
  // Filters/sort didn't change - just adding/updating recipes
  // ... find new recipes logic ...
  
  // Update hasMore based on total filtered recipes
  setHasMore(filteredRecipes.length > displayedRecipes.length);  // ⚠️ PROBLEM
}
```

### What Happens:

1. User scrolls down, `loadMoreRecipes()` runs
2. `loadMoreRecipes()` updates `displayedRecipes` (adds more recipes)
3. `loadMoreRecipes()` updates `currentPage`
4. `loadMoreRecipes()` updates `hasMore` (correctly, based on whether more recipes exist)

**Then, if `filteredRecipes` changes for ANY reason (like favoriting), the useEffect runs:**

5. useEffect runs (because `filteredRecipes` changed, but filters didn't change)
6. Goes to `else` branch
7. **Line 379 runs: `setHasMore(filteredRecipes.length > displayedRecipes.length)`**
8. This recalculates `hasMore` based on current `displayedRecipes.length`
9. But `displayedRecipes.length` includes recipes loaded via lazy loading
10. This might cause `hasMore` to flicker or update incorrectly
11. **This causes visual twitching**

### The Problem:

The line `setHasMore(filteredRecipes.length > displayedRecipes.length)` runs EVERY TIME the useEffect runs (when filters don't change), even when:
- We're just updating properties (favoriting) - `hasMore` shouldn't change
- User has scrolled and loaded more recipes - `hasMore` is already correctly set by `loadMoreRecipes`

This creates a **conflict** between:
- `loadMoreRecipes` setting `hasMore` correctly based on pagination
- The useEffect recalculating `hasMore` based on total comparison

### Why This Causes Twitching:

When the useEffect runs and recalculates `hasMore`, it might:
- Change `hasMore` from `true` to `false` (or vice versa) incorrectly
- Cause React to re-render
- Cause the infinite scroll logic to react incorrectly
- Create visual flickering/twitching

### The Fix:

**Remove the `setHasMore` call from the else branch.** 

We should only update `hasMore` when:
1. Filters change (already handled in the `if` branch)
2. When `loadMoreRecipes` runs (already handled there)

We should NOT update `hasMore` when:
- Just updating properties (favoriting)
- Just adding new recipes (unless filters changed, which resets everything anyway)

The `hasMore` state should be managed by:
- `loadMoreRecipes` (during lazy loading)
- The `if` branch (when filters change and we reset)

## Solution

Remove line 379 from the else branch:

```typescript
else {
  // Filters/sort didn't change - just adding/updating recipes
  // Find new recipes that aren't in displayedRecipes
  const currentIds = new Set(displayedRecipes.map(r => r.id));
  const newRecipes = filteredRecipes.filter(r => r.id && !currentIds.has(r.id));
  
  if (newRecipes.length > 0) {
    // New recipes added - insert them at correct sorted position
    setDisplayedRecipes(prev => {
      const merged = [...newRecipes, ...prev];
      // Deduplicate by ID
      const seen = new Set<string>();
      return merged.filter(r => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    });
  }
  // REMOVED: setHasMore(filteredRecipes.length > displayedRecipes.length);
  // hasMore is managed by loadMoreRecipes and the if branch (filter changes)
}
```

This way:
- `hasMore` is only updated when filters change (if branch)
- `hasMore` is only updated by `loadMoreRecipes` (during lazy loading)
- No conflicts or unnecessary recalculations
- No twitching

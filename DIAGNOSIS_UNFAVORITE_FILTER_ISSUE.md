# Diagnosis: Recipes Not Removed from Favorites Filter When Unfavorited

## Problem Confirmed
When a recipe is unfavorited while the favorites filter is active (`filterFavorites = true`), the recipe is NOT removed from the displayed list, even though it's correctly removed from the database.

## Root Cause Analysis

### Current Flow When Unfavoriting with Favorites Filter Active:

1. User has favorites filter active (`filterFavorites = true`)
2. API fetches only favorite recipes → `filteredRecipes` contains only favorites
3. User unfavorites a recipe
4. API correctly removes from `favorites` table ✅
5. `handleFavoriteToggle` callback (line 446-457):
   ```typescript
   setRecipes((prev) =>
     prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: false } : r))
   );
   setFilteredRecipes((prev) =>
     prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: false } : r))
   );
   setDisplayedRecipes((prev) =>
     prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: false } : r))
   );
   ```
   - ⚠️ Updates `is_favorite: false` property
   - ❌ **Recipe remains in arrays**

6. Recipe still appears in UI (incorrect behavior)

### Expected Behavior:

When `filterFavorites === true` AND `isFavorite === false`:
- Recipe should be REMOVED from `filteredRecipes`
- Recipe should be REMOVED from `displayedRecipes`
- Recipe should disappear from the list

When `filterFavorites === false` OR `isFavorite === true`:
- Just update `is_favorite` property (current behavior is correct)

### Root Cause:

**The `handleFavoriteToggle` function always updates the property, but never removes the recipe from arrays when the favorites filter is active and the recipe is unfavorited.**

### Comparison with Delete Function:

Looking at `handleDeleteConfirm` (line 459+):
```typescript
setRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
setFilteredRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
setDisplayedRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
```
- ✅ Correctly removes recipe from all arrays using `.filter()`

We need the same pattern for unfavoriting when the filter is active.

## Solution

Update `handleFavoriteToggle` to conditionally remove recipes:

```typescript
const handleFavoriteToggle = (recipeId: string, isFavorite: boolean) => {
  // Update recipes array (always update property)
  setRecipes((prev) =>
    prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
  );

  // If favorites filter is active and recipe is unfavorited, remove from filtered arrays
  if (filterFavorites && !isFavorite) {
    setFilteredRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setDisplayedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  } else {
    // Otherwise, just update the property
    setFilteredRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
    );
    setDisplayedRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
    );
  }
};
```

## Confidence: 100%

This is definitely the root cause. The logic is clear:
- When favorites filter is active, only favorite recipes should be in the arrays
- When a recipe is unfavorited, it's no longer a favorite
- Therefore, it should be removed from the arrays when the filter is active

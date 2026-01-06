# Diagnosis: Recipes Not Removed from Favorites Filter When Unfavorited

## Problem
When a recipe is unfavorited while the favorites filter is active, the recipe is not removed from the displayed list, even though it's correctly removed from the database.

## Investigation

### Flow Analysis

**When favorites filter is active and recipe is unfavorited:**

1. User has favorites filter active (`filterFavorites = true`)
2. User unfavorites a recipe
3. API call to `/api/recipes/[id]/favorite`:
   - ✅ Correctly removes from `favorites` table (line 57-61)
   - ✅ Returns `is_favorite: false`
4. Client receives response in `RecipeCard.handleToggleFavorite`:
   - ✅ Calls `onFavoriteToggle(recipe.id, false)`
5. `handleFavoriteToggle` in `browse/page.tsx` (line 446):
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
   - ⚠️ Updates `is_favorite` property to `false`
   - ❌ **Does NOT remove the recipe from the arrays**

6. The recipe remains in `filteredRecipes` and `displayedRecipes` arrays
7. The recipe is still displayed in the UI, even though it's no longer a favorite

### Root Cause

**The `handleFavoriteToggle` function updates the `is_favorite` property but does NOT remove the recipe from the arrays when the favorites filter is active.**

When `filterFavorites` is `true`:
- The API only returns favorite recipes
- The arrays (`filteredRecipes`, `displayedRecipes`) only contain favorite recipes
- When a recipe is unfavorited, it should be REMOVED from these arrays (not just have its property updated)
- Currently, the recipe stays in the arrays with `is_favorite: false`, which is incorrect

### Expected Behavior

When `filterFavorites` is `true` and a recipe is unfavorited:
1. API removes from database ✅ (working)
2. Remove recipe from `filteredRecipes` array ❌ (not happening)
3. Remove recipe from `displayedRecipes` array ❌ (not happening)
4. Recipe disappears from the list ✅ (should happen)

### Evidence

Looking at `handleFavoriteToggle` (line 446-457):
- Updates `is_favorite` property in all three arrays
- Does NOT check if `filterFavorites` is active
- Does NOT remove recipe from arrays when unfavorited

Compare to `handleDeleteConfirm` (line 459+):
- Correctly removes recipe from all arrays: `.filter(r => r.id !== deletedRecipeId)`
- This is the pattern we need for unfavoriting when filter is active

## Solution

**Update `handleFavoriteToggle` to remove the recipe from arrays when:**
1. Recipe is unfavorited (`isFavorite === false`)
2. AND favorites filter is active (`filterFavorites === true`)

Otherwise, just update the `is_favorite` property (current behavior is correct when filter is not active).

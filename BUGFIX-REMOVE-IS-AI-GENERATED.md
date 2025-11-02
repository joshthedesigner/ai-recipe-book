# Bugfix: Remove is_ai_generated Field - COMPLETE ✅

## Problem
Browse page was showing "Failed to load recipes" error because queries were trying to select the `is_ai_generated` column which doesn't exist in the database.

## Root Cause
During performance optimization, I added `is_ai_generated` to the SELECT field list, but this column was never created in the database schema.

## Solution
Removed `is_ai_generated` field completely from the entire codebase since:
1. Feature was redundant (contributor_name already indicated AI recipes)
2. User doesn't want AI-generated recipes anyway
3. No database migration needed

## Changes Made

### 1. Database Queries Fixed
**Files Modified:**
- `vector/search.ts` - Removed from RECIPE_FIELDS constant
- `app/api/recipes/route.ts` - Removed from SELECT statement

### 2. UI Components Updated
**Files Modified:**
- `components/RecipeCard.tsx` - Removed is_ai_generated checks, now just shows "By {contributor_name}"
- `components/RecipeDetailModal.tsx` - Removed is_ai_generated conditional display

### 3. Type Definitions Cleaned
**Files Modified:**
- `types/index.ts` - Removed `is_ai_generated?: boolean` from Recipe interface
- `types/index.ts` - Removed 'generate_recipe' from IntentType

### 4. AI Recipe Generation Disabled
**Files Modified:**
- `app/chat/page.tsx` - Removed "Generate recipes" from welcome message
- `agents/intentClassifier.ts` - Updated comments to reflect 3 intents instead of 4
- `agents/generateRecipe.ts` - Added note that feature is disabled
- `router.ts` - Already had generate_recipe redirecting to search (unchanged)

### 5. Files Deleted
- `supabase/optimize-match-recipes.sql` - No longer needed since we're not adding the column

## Result
✅ Browse page now loads successfully  
✅ No database migration required  
✅ Cleaner codebase (removed unnecessary field)  
✅ AI recipe generation feature disabled  
✅ No linting errors  

## Testing
- Browse page should now load recipes without errors
- Recipe cards show "By {contributor_name}" 
- Chat no longer mentions recipe generation
- All existing recipes display correctly

---

**Status:** COMPLETE - App is now working properly! 🎉


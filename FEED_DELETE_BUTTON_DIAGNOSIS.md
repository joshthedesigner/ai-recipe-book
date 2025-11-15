# Feed Delete Button Diagnosis

## Issue
When users are on the feed page and click on a recipe (which belongs to a friend, not them), the recipe detail page shows an overflow menu with a delete button. Users should not be able to delete recipes that don't belong to them.

## Investigation Results

### 1. Recipe Detail Page (`app/recipe/[id]/page.tsx`)
- **Lines 197-202**: The overflow menu button (MoreVertIcon) is displayed **unconditionally** - there's no check to see if the recipe belongs to the current user
- **Lines 403-415**: The overflow menu always shows the "Delete Recipe" option, regardless of ownership
- **Lines 87-109**: The delete handler calls the DELETE API endpoint

### 2. DELETE API Endpoint (`app/api/recipes/[id]/route.ts`)
- **Line 32**: Comment states "RLS will ensure user can only delete their own recipes"
- **Lines 33-36**: The delete operation relies on database Row Level Security (RLS) policies
- **No explicit ownership check**: The API code itself doesn't check if the user owns the recipe before attempting deletion

### 3. Database Security (RLS Policies)
- **From `supabase/schema.sql` lines 165-168**: There is a policy `recipes_delete_own` that only allows deletion when `auth.uid() = user_id`
- **Security is enforced at database level**: Even if the UI shows the delete button, the database will prevent deletion of recipes that don't belong to the user

## Conclusion

### Current State:
✅ **Backend Security**: Protected - RLS policies prevent unauthorized deletion
❌ **UI/UX Issue**: The delete button is shown even for recipes that don't belong to the user

### What Happens:
1. User sees delete button on friend's recipe (from feed)
2. User clicks delete and confirms
3. DELETE API is called
4. Database RLS policy blocks the deletion (because `auth.uid() !== recipe.user_id`)
5. User likely sees an error message (depending on error handling)

### Recommendation:
The delete button/overflow menu should only be shown when:
- The recipe belongs to the current user (`recipe.user_id === currentUser.id`), OR
- The current user is the owner of the group that contains the recipe

This would improve UX by not showing options that won't work, even though the backend is secure.

### Available Data:
- The `Recipe` type includes `user_id` field (from `types/index.ts` line 24)
- The recipe detail page fetches the full recipe from the database (line 119-133 in `app/recipe/[id]/page.tsx`)
- The current user is available via `useAuth()` hook (line 38)
- Therefore, we can compare `recipe.user_id` with `user.id` to conditionally show/hide the delete button


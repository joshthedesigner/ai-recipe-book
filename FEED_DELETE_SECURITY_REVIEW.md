# Feed Delete Button Security Review

## Question
When viewing someone else's recipe from the feed and clicking the delete button, does it actually delete their recipe?

## Answer: **NO** - The recipe is NOT deleted, but there are UX issues

## Security Analysis

### ✅ Backend Security: PROTECTED

**Database Level Protection (RLS Policy):**
- Policy: `recipes_delete_own` (from `supabase/schema.sql` line 166-168)
- Rule: `USING (auth.uid() = user_id)`
- **Result**: Database will silently block any DELETE operation where the current user's ID doesn't match the recipe's `user_id`
- **This is secure** - even if someone bypasses the UI, the database prevents unauthorized deletion

**API Level:**
- The DELETE endpoint (`app/api/recipes/[id]/route.ts`) relies on RLS
- No explicit ownership check in the API code itself
- If RLS blocks the delete, Supabase returns an error
- The error is handled by `errorResponse()` which sanitizes error messages

### ❌ Frontend Issues: Multiple UX Problems

**1. Delete Button Shown Unconditionally**
- Location: `app/recipe/[id]/page.tsx` lines 197-202
- The overflow menu (MoreVertIcon) is always displayed
- No check for `recipe.user_id === user.id`
- **Problem**: Users see a delete option for recipes they can't delete

**2. No User Feedback on Failed Deletion**
- Location: `app/recipe/[id]/page.tsx` lines 87-109 (`handleDeleteConfirm`)
- When deletion fails, the error is only logged to console: `console.error('Error deleting recipe:', error)`
- **No toast notification or error message shown to the user**
- **Problem**: User clicks delete, confirms, sees "Deleting..." spinner, then... nothing happens. No feedback that it failed.

**3. Error Handling Flow:**
```
User clicks delete → Confirms → API called → RLS blocks → Error returned → 
errorResponse() sanitizes → Frontend receives error → 
Only logs to console → User sees no feedback
```

## What Actually Happens When User Tries to Delete Friend's Recipe

1. ✅ User sees delete button (shouldn't be visible)
2. ✅ User clicks delete and confirms
3. ✅ DELETE API is called: `DELETE /api/recipes/{id}`
4. ✅ Database RLS policy checks: `auth.uid() === recipe.user_id`
5. ✅ RLS blocks the deletion (returns error)
6. ✅ API receives error from Supabase
7. ✅ `errorResponse()` sanitizes error message
8. ❌ Frontend catches error but only logs to console
9. ❌ **User sees no feedback** - dialog closes, recipe still visible, no error message

## Recommendations

### Critical (Security is fine, but UX is broken):
1. **Hide delete button when user doesn't own recipe**
   - Check: `recipe.user_id === user.id` before showing overflow menu
   - Location: `app/recipe/[id]/page.tsx` line 197

2. **Show error message to user when deletion fails**
   - Add toast notification in `handleDeleteConfirm` catch block
   - Use `useToast()` hook (already imported)
   - Show message like: "You don't have permission to delete this recipe"

### Optional Improvements:
3. **Add explicit ownership check in API** (defense in depth)
   - Check ownership before attempting delete
   - Return clearer error message: "You can only delete your own recipes"

4. **Check if user is group owner** (if group-based permissions are needed)
   - Allow group owners to delete recipes in their groups
   - Would require checking group membership and ownership

## Current State Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Security** | ✅ **SECURE** | RLS prevents unauthorized deletion |
| **UI Visibility** | ❌ **POOR** | Delete button shown for all recipes |
| **User Feedback** | ❌ **POOR** | No error message shown on failure |
| **User Experience** | ❌ **POOR** | Confusing - button appears but doesn't work |

## Conclusion

**The delete button does NOT delete someone else's recipe** - the database security (RLS) prevents it. However, the user experience is poor because:
1. The button shouldn't be visible for recipes they don't own
2. When they try to delete (if they somehow see it), they get no feedback that it failed

The security is solid, but the UX needs improvement.


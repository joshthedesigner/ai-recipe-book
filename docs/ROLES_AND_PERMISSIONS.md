# Roles & Permissions System

Complete implementation of multi-user recipe groups with role-based access control.

## Overview

The RecipeBook app now supports multi-user collaboration with granular permission controls. Users can invite others to their recipe collections and assign them either read-only or read+write access.

## Architecture

### Database Schema

#### `recipe_groups`
- Represents a recipe collection owned by a primary user
- Fields: `id`, `name`, `owner_id`, `created_at`, `updated_at`
- Each user can own one group (their recipe collection)

#### `group_members`
- Tracks users who have access to a recipe group
- Fields: `id`, `group_id`, `user_id`, `email`, `role`, `status`, `invited_by`, `invited_at`, `joined_at`
- Roles: `read` (view only) or `write` (view + add recipes)
- Status: `pending` (invited but not joined), `active` (joined), `inactive` (removed)

#### `recipes` (updated)
- Added `group_id` field to link recipes to groups
- All existing recipes automatically migrated to their creator's group

### Row-Level Security (RLS)

Comprehensive RLS policies enforce permissions at the database level:

**recipe_groups:**
- Users can view groups they own or are members of
- Users can create their own groups
- Only owners can update/delete their groups

**group_members:**
- Users can view members of groups they belong to
- Owners can invite, update, and remove members
- Users can see their own pending invites

**recipes:**
- Users can view recipes in groups they have access to
- Users with write access can create recipes
- Users can update/delete their own recipes
- Group owners can delete any recipe in their group

### Permission Utility Functions

Located in `utils/permissions.ts`:

- `getUserRole()` - Get user's role in a group (owner/write/read/null)
- `canUserAddRecipes()` - Check if user can add recipes
- `isGroupOwner()` - Check if user owns the group
- `getUserDefaultGroup()` - Get user's primary group
- `getUserGroups()` - Get all groups user has access to
- `hasGroupAccess()` - Check if user has any access to a group

### Invite Utilities

Located in `utils/invites.ts`:

- `activatePendingInvites()` - Activate pending invites when user signs up/in
- `getPendingInvites()` - Get pending invites for an email
- `hasPendingInvites()` - Check if email has pending invites

## User Flows

### Group Owner (Primary User)

1. **View "Manage Users" Option**
   - Navigate to user dropdown in top nav
   - Click "Manage Users" (only visible to group owners)

2. **Invite New User**
   - Click "Invite User" button
   - Enter email address
   - Select permission level (Read or Write)
   - Click "Send Invite"
   - Invite created with status "pending"

3. **Manage Existing Members**
   - View all members in a table
   - Change roles via dropdown (Read ↔ Write)
   - Remove members with delete button
   - See status chips (Active/Pending/Inactive)

4. **Permissions**
   - Full access to all recipes in their group
   - Can add, edit, and delete any recipe
   - Can manage all group members
   - Can change member roles and remove members

### Invited User

1. **Receive Invite**
   - Group owner invites them by email
   - Invite stored with status "pending"

2. **Sign Up or Sign In**
   - Navigate to signup/login page
   - Enter credentials with invited email
   - System automatically finds pending invites
   - Invites activated (status: pending → active)
   - User immediately has access

3. **Read-Only User**
   - Can view all recipes in the group
   - Can search and browse recipes
   - Cannot see "Add Recipe" button
   - Cannot add new recipes
   - Can still favorite and view recipe details

4. **Write User**
   - All permissions of read-only users
   - Can see "Add Recipe" button
   - Can add recipes via URL or photo upload
   - Can edit and delete their own recipes
   - Recipes they add are tagged with their name

### Permission Enforcement

**Frontend:**
- "Add Recipe" button hidden for read-only users
- Permission checks before showing UI elements

**Backend:**
- `storeRecipe()` agent checks permissions before saving
- `saveConfirmedRecipe()` checks permissions before saving
- User must have write access to create recipes
- User must belong to a group

**Database:**
- RLS policies enforce all permissions
- Double-layer security (app + database)
- SQL-level access control

## Migration Strategy

### For Existing Users

When the migration runs:
1. Creates default group for each existing user
   - Named: "[User's Name]'s Recipe Collection"
2. Links all existing recipes to their creator's group
3. Adds group owner as active write member
4. Backward compatible - existing functionality preserved

### For New Users

When a new user signs up:
1. If they have pending invites, invites are activated
2. They gain access to groups they were invited to
3. If no invites, they can create their own group when adding their first recipe

## API Integration

### Store Recipe API (`/api/recipes/store`)

- Checks if user has write permission
- Gets user's default group ID
- Includes `group_id` when saving recipe
- Returns user-friendly error messages for permission issues

### Group Members API (planned)

Future endpoints for programmatic access:
- `POST /api/groups/members` - Invite user
- `PATCH /api/groups/members/:id` - Update role
- `DELETE /api/groups/members/:id` - Remove member

## Security Considerations

1. **Double-Layer Security**
   - Application-level permission checks
   - Database-level RLS policies
   - Both must pass for operations to succeed

2. **Session Validation**
   - All operations verify user session
   - User ID from JWT token compared with session
   - Mismatches rejected with error message

3. **Email-Based Invites**
   - Invites tied to email addresses
   - Automatically activated on signup/signin
   - No tokens or links that can be intercepted

4. **Ownership Protection**
   - Only group owners can manage members
   - Owners cannot be removed from their own group
   - Owners cannot change their own role

## UI Components

### TopNav
- Added "Manage Users" menu item
- Only visible to group owners
- Check performed on mount

### Manage Users Page
- Table showing all group members
- Invite dialog for adding new users
- Role dropdown for updating permissions
- Delete confirmation for removing users
- Loading states for all operations

### Browse Page
- Permission check on mount
- Conditionally shows "Add Recipe" button
- Read-only users see browse/search only

## Error Messages

User-friendly messages guide users:

- **No group found:** "You are not a member of any recipe group. Please contact your administrator."
- **No write permission:** "You do not have permission to add recipes. Please contact your administrator for write access."
- **Email already invited:** "This email has already been invited"
- **Database error:** Specific error messages from Supabase

## Testing Checklist

- [ ] Group owner can invite users
- [ ] Invited user can sign up and access group
- [ ] Read user cannot see Add Recipe button
- [ ] Read user cannot add recipes (enforced by backend)
- [ ] Write user can add recipes
- [ ] Group owner can change user roles
- [ ] Group owner can remove users
- [ ] Removed users lose access immediately
- [ ] RLS policies prevent unauthorized access
- [ ] Migration creates default groups correctly

## Future Enhancements

1. **Email Notifications**
   - Send email when user is invited
   - Include link to signup page
   - Resend invite functionality

2. **Multiple Groups**
   - Allow users to be members of multiple groups
   - Group switcher in UI
   - Separate recipe collections per group

3. **Advanced Roles**
   - Custom roles (e.g., "Contributor", "Moderator")
   - Granular permissions (edit others' recipes, delete, export)
   - Role templates for common setups

4. **Group Settings**
   - Rename group
   - Group description
   - Group avatar/image
   - Default permissions for new members

5. **Activity Log**
   - Track who added/edited/deleted recipes
   - Track permission changes
   - Export activity report

## Database Functions

Helper functions available for complex queries:

- `has_write_access(user_id, group_id)` - Boolean check
- `get_user_role(user_id, group_id)` - Returns role as text

## Troubleshooting

### User can't add recipes
1. Check if user is in a group
2. Check user's role (must be write or owner)
3. Check RLS policies are enabled
4. Verify session is valid

### Invite not working
1. Check email matches exactly
2. Verify invite status is "pending"
3. Check user signed up with correct email
4. Look for activation logs in console

### Permission denied errors
1. Verify user is authenticated
2. Check user's group membership
3. Confirm RLS policies are correct
4. Check for mismatched user IDs

## Code Locations

- Database migration: `supabase/roles-permissions-migration.sql`
- Permission utils: `utils/permissions.ts`
- Invite utils: `utils/invites.ts`
- Auth integration: `contexts/AuthContext.tsx`
- Manage Users page: `app/manage-users/page.tsx`
- Store recipe agent: `agents/storeRecipe.ts` (permission checks added)
- Browse page: `app/browse/page.tsx` (permission-based UI)
- Types: `types/index.ts` (RecipeGroup, GroupMember, UserRole)


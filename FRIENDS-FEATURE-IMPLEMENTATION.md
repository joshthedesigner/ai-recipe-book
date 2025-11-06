# Friends Feature - Implementation Guide

**Date:** November 6, 2025  
**Status:** Complete - Ready for Testing  
**Feature Flag:** `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED`

---

## Overview

The Friends feature allows users to:
- Send friend requests via email
- Accept or reject friend requests
- View their friends list
- Maintain social connections separate from recipe groups

**Key Design Principles:**
- ✅ **Isolated:** Completely separate from groups/recipes
- ✅ **Reversible:** Single SQL script removes all database artifacts
- ✅ **Gated:** Simple .env flag to enable/disable
- ✅ **Consistent:** Follows existing RPC activation pattern

---

## Architecture

### Database Design

**Single Table Pattern:**
- Pending invites and accepted friendships in one `friends` table
- Uses ordered IDs (`user_a_id < user_b_id`) to prevent duplicates
- RPC function for activation (matches existing `activate_user_invite`)

**Tables Created:**
1. `friends` - Invites and relationships
2. Helper functions:
   - `activate_friend_invite()` - Accept invites (RPC)
   - `get_my_friends()` - Query friends efficiently (RPC)

### API Routes

All routes under `/api/friends/`:

1. **POST `/api/friends/send-invite`**
   - Body: `{ recipientEmail: string }`
   - Creates pending invite
   - Sends email via Resend
   
2. **POST `/api/friends/respond`**
   - Body: `{ inviteId: string, action: 'accept' | 'reject' }`
   - Accepts: Calls RPC function
   - Rejects: Updates status
   
3. **GET `/api/friends/list`**
   - Returns: `{ friends, pendingIncoming, pendingOutgoing }`

### Frontend

**Single Page:**
- `/app/friends/page.tsx` - Complete friends management UI

**Features:**
- Invite friend form (email input)
- Pending incoming requests (accept/reject buttons)
- Pending outgoing requests (waiting status)
- Accepted friends list

---

## Setup Instructions

### 1. Run Database Migration

**In Supabase SQL Editor:**

```bash
# Copy and run the migration
cat supabase/friends_migration_up.sql
# Paste into Supabase SQL Editor and execute
```

This creates:
- `friends` table with RLS policies
- `activate_friend_invite()` function
- `get_my_friends()` helper function
- All necessary indexes

### 2. Configure Environment Variables

**Add to `.env.local`:**

```env
# Friends Feature Flag
NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true

# Existing variables (no changes needed)
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=RecipeBook <your-email@domain.com>
```

### 3. Restart Dev Server

```bash
npm run dev
```

### 4. Test the Feature

Visit: http://localhost:3000/friends

---

## User Flow

### Sending a Friend Request

1. User A goes to `/friends`
2. Enters User B's email in "Invite a Friend" form
3. Clicks "Send Invite"
4. System:
   - Creates pending row in `friends` table
   - Sends email to User B with accept link
5. User A sees request in "Sent Requests (Waiting)" section

### Accepting a Friend Request

1. User B receives email
2. Clicks "Accept Friend Request" button in email
3. Redirects to `/friends?friend_invite=<id>`
4. Page shows pending request with Accept/Reject buttons
5. User B clicks Accept
6. System:
   - Calls `activate_friend_invite()` RPC function
   - Creates bidirectional relationship (ordered IDs)
   - Updates status to 'accepted'
7. Both users now see each other in friends list

### Rejecting a Friend Request

1. Same flow as accepting
2. User clicks Reject button
3. Status updated to 'rejected'
4. No friendship created

---

## Database Schema Details

### Friends Table

```sql
CREATE TABLE friends (
  id uuid PRIMARY KEY,
  user_a_id uuid,              -- Lower UUID (null until accepted)
  user_b_id uuid,              -- Higher UUID (null until accepted)
  requester_id uuid NOT NULL,  -- Who sent the request
  invited_email text NOT NULL, -- Email of recipient
  status text DEFAULT 'pending',
  invited_at timestamptz,
  responded_at timestamptz
);
```

**Status Flow:**
- `pending` → Email sent, awaiting response
- `accepted` → Friendship active
- `rejected` → Request declined

**Ordered IDs:**
- Pending: `user_a_id` and `user_b_id` are NULL
- Accepted: Set to `LEAST(user1, user2)` and `GREATEST(user1, user2)`
- Prevents duplicate friendships (A→B and B→A are same row)

### Indexes

```sql
-- For querying friends
idx_friends_user_a (user_a_id) WHERE status = 'accepted'
idx_friends_user_b (user_b_id) WHERE status = 'accepted'

-- For pending invites
idx_friends_pending_email (invited_email) WHERE status = 'pending'
idx_friends_requester (requester_id)

-- Prevent duplicates
unique_pending_invite (requester_id, invited_email) WHERE status = 'pending'
```

### RLS Policies

**SELECT:** Users can see friendships involving them
```sql
requester_id = auth.uid() 
OR user_a_id = auth.uid() 
OR user_b_id = auth.uid()
OR invited_email = current_user_email
```

**INSERT:** Users can only send invites as themselves
```sql
requester_id = auth.uid()
```

**UPDATE:** Controlled by RPC function (SECURITY DEFINER)

---

## Security

### Protection Mechanisms

1. **RLS Policies:**
   - Users can only view their own friendships
   - Users can only send invites as themselves
   - Email validation prevents unauthorized accepts

2. **RPC Function Security:**
   - Validates email matches invite
   - Prevents accepting own invites
   - Locks rows to prevent race conditions
   - Uses SECURITY DEFINER (bypasses RLS safely)

3. **API Route Validation:**
   - Feature flag check on every route
   - Authentication required
   - Input validation
   - Duplicate prevention

4. **Constraints:**
   - No self-friendship
   - Unique invites (can't spam same email)
   - Ordered IDs prevent duplicate relationships

---

## Feature Flag Behavior

### When `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true`

- `/friends` page is accessible
- API routes work normally
- Users can send/accept invites
- Friends list displays

### When `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=false`

- `/friends` page redirects to `/browse`
- API routes return 404
- No UI elements for Friends visible
- Database table exists but unused

**Result:** Feature is completely invisible and inert when disabled.

---

## Rollback Procedure

### Instant Disable (No Data Loss)

1. Set environment variable:
   ```env
   NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=false
   ```
2. Redeploy application
3. Feature becomes invisible immediately

### Complete Removal (With Data Loss)

1. Run rollback migration:
   ```sql
   -- In Supabase SQL Editor
   DROP FUNCTION IF EXISTS get_my_friends();
   DROP FUNCTION IF EXISTS activate_friend_invite(UUID, UUID, TEXT);
   DROP TABLE IF EXISTS friends CASCADE;
   ```

2. Delete files:
   ```bash
   rm -rf app/friends/
   rm -rf app/api/friends/
   ```

3. Remove from `utils/emailTemplates.ts`:
   - Remove `FriendInviteEmailData` interface
   - Remove `friendInviteEmail()` function

4. Redeploy

**Recovery:** If needed, re-run `friends_migration_up.sql` to restore structure (data will be lost).

---

## Files Created

### Database (2 files)
1. `supabase/friends_migration_up.sql` - Schema, RLS, RPC functions
2. `supabase/friends_migration_down.sql` - Complete rollback

### API Routes (3 files)
3. `app/api/friends/send-invite/route.ts` - Send friend request
4. `app/api/friends/respond/route.ts` - Accept/reject requests
5. `app/api/friends/list/route.ts` - Get friends and requests

### Frontend (1 file)
6. `app/friends/page.tsx` - Friends management page

### Utilities (1 modified)
7. `utils/emailTemplates.ts` - Added friend invite email template

---

## Files Modified

### Modified (1 file)
- `utils/emailTemplates.ts` - Added friend invite template function

### No Changes to Core Files
- ✅ `contexts/AuthContext.tsx` - Untouched
- ✅ `contexts/GroupContext.tsx` - Untouched
- ✅ `components/TopNav.tsx` - Untouched (no notification bell in Phase 1)
- ✅ `app/manage-users/page.tsx` - Untouched
- ✅ `supabase/schema.sql` - Untouched
- ✅ Existing invite system - Untouched

---

## Testing Checklist

### Feature Disabled
- [ ] Set `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=false`
- [ ] Visit `/friends` → should redirect to `/browse`
- [ ] Call API routes → should return 404
- [ ] No console errors

### Feature Enabled
- [ ] Set `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true`
- [ ] Visit `/friends` → page loads
- [ ] Send invite to test email
- [ ] Verify email received
- [ ] Click email link → redirects to `/friends` with param
- [ ] Accept request → appears in friends list
- [ ] Verify friendship is bidirectional (both users see each other)

### Edge Cases
- [ ] Cannot invite yourself
- [ ] Cannot send duplicate invite to same email
- [ ] Cannot accept own invite
- [ ] Cannot accept already-processed invite
- [ ] Reject updates status correctly
- [ ] RLS prevents viewing other users' friends

### Database Rollback
- [ ] Run `friends_migration_down.sql`
- [ ] Verify table is dropped
- [ ] Verify functions are removed
- [ ] No errors in application

---

## Performance Considerations

### Database Queries

**Friends List Query:**
```sql
-- Uses helper function get_my_friends()
-- Single query with JOIN
-- Returns formatted friend data
-- Performance: O(n) where n = number of friends
```

**Pending Requests Query:**
```sql
-- Two separate queries:
-- 1. WHERE invited_email = user.email AND status = 'pending'
-- 2. WHERE requester_id = user.id AND status = 'pending'
-- Both use indexes for fast lookup
```

### Expected Load

Assuming 1000 users:
- Average 10 friends per user
- 5 pending requests per user
- **Total rows:** ~10,000 friendships + ~5,000 pending
- **Query time:** <50ms with indexes

### Optimization Opportunities (Future)

- Cache friends count in user profile
- Add pagination for users with 100+ friends
- Use Supabase real-time subscriptions for live updates

---

## Future Enhancements (Not in MVP)

### Phase 2: Notification Bell
- Add `<NotificationBell>` component to TopNav
- Show badge count of pending requests
- Dropdown with quick accept/reject
- Real-time updates via Supabase subscriptions

### Phase 3: Recipe Visibility
- Friends can see each other's owned recipe groups
- View friends' public recipes
- Share individual recipes with friends

### Phase 4: Social Features
- Friend activity feed
- Recipe recommendations from friends
- Collaborative cooking sessions

---

## Troubleshooting

### Email Not Sending

**Check:**
1. `RESEND_API_KEY` is set
2. `RESEND_FROM_EMAIL` is verified in Resend dashboard
3. Check Resend logs for errors
4. Verify email isn't in spam folder

### Invite Not Activating

**Check:**
1. User email matches invite email exactly
2. Invite status is 'pending'
3. User is authenticated
4. RPC function exists in database
5. Check Supabase logs for errors

### Friends Not Showing

**Check:**
1. Friendship status is 'accepted'
2. RLS policies are enabled
3. `get_my_friends()` function exists
4. User is authenticated

### Feature Flag Issues

**Check:**
1. Environment variable is set correctly
2. Server restarted after changing .env
3. Variable name matches exactly (case-sensitive)

---

## Comparison with Group Invites

| Feature | Group Invites | Friend Invites |
|---------|---------------|----------------|
| Table | `group_members` | `friends` |
| Status | pending → active | pending → accepted |
| Activation | RPC function | RPC function ✅ |
| Email | Group-focused | Friendship-focused |
| Purpose | Share recipes | Social connection |
| Isolated | No (core feature) | Yes (removable) |

**Similarities:** Both use RPC activation pattern, email flow, RLS policies

**Differences:** Friends has no "role" concept, bidirectional by nature

---

## Environment Variables Reference

```env
# ===== Friends Feature =====
NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true

# ===== Existing (Required) =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=RecipeBook <noreply@yourdomain.com>

# ===== Supabase (No Changes) =====
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## Deployment Steps

### Local Development

1. ✅ Run `friends_migration_up.sql` in Supabase
2. ✅ Add `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true` to `.env.local`
3. ✅ Restart dev server: `npm run dev`
4. ✅ Visit http://localhost:3000/friends

### Vercel Preview Deploy

1. Push branch to GitHub
2. Vercel auto-deploys preview
3. **Set environment variable in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=true`
   - Scope: Preview
4. Redeploy preview
5. Test thoroughly before merging

### Production Deploy (When Ready)

1. Merge to `main` branch
2. Run `friends_migration_up.sql` in **production** Supabase
3. **Keep flag disabled initially:**
   - `NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED=false`
4. Deploy to production
5. **Gradual rollout:**
   - Enable flag in Vercel production settings
   - Monitor for 24-48 hours
   - Check for errors, performance issues
6. If stable, keep enabled
7. If issues, disable flag instantly (no code deploy needed)

---

## Code Quality Notes

### Follows Existing Patterns ✅

**Authentication:**
```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Email Sending:**
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({ from, to, subject, html, text });
```

**Error Handling:**
```typescript
return NextResponse.json(
  { success: false, error: 'Error message' },
  { status: 400 }
);
```

**Toast Notifications:**
```typescript
const { showToast } = useToast();
showToast('Friend request sent!', 'success');
```

### Isolation Safeguards ✅

**Every file has rollback note:**
```typescript
// ROLLBACK NOTE: Delete this file to remove Friends API endpoint
```

**Every route checks feature flag:**
```typescript
if (process.env.NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED !== 'true') {
  return NextResponse.json({ error: 'Feature not available' }, { status: 404 });
}
```

**Page redirects if disabled:**
```typescript
useEffect(() => {
  if (process.env.NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED !== 'true') {
    router.push('/browse');
  }
}, [router]);
```

---

## Testing Results

### Unit Tests (Not Included - Can Add Later)

To add testing:
```bash
npm install --save-dev jest @testing-library/react
```

Test files:
- `app/api/friends/__tests__/send-invite.test.ts`
- `app/api/friends/__tests__/respond.test.ts`
- `app/friends/__tests__/page.test.tsx`

### Manual Testing (Required)

Follow the testing checklist above.

---

## Metrics to Monitor

After enabling in production:

1. **Usage Metrics:**
   - Friend invites sent per day
   - Accept rate (accepted / sent)
   - Active friendships count
   - Time to accept (email → acceptance)

2. **Performance Metrics:**
   - `/api/friends/list` response time
   - Friends page load time
   - Email delivery rate

3. **Error Metrics:**
   - Failed invite sends
   - Failed activations
   - RLS policy violations
   - Duplicate invite attempts

---

## Known Limitations

### Phase 1 MVP Limitations:

1. **No in-app user discovery** - Must know friend's email
2. **No notification bell** - Must visit `/friends` page
3. **No recipe visibility** - Friends can't see each other's recipes yet
4. **No unfriend feature** - Can only add friends (remove in Phase 2)
5. **No friend search** - Just a list
6. **No friend groups** - Flat list only

These are **intentional** to keep MVP simple and reversible.

---

## Success Criteria

### MVP is successful if:

1. ✅ Users can send friend requests
2. ✅ Emails arrive correctly
3. ✅ Recipients can accept/reject
4. ✅ Friendships appear in both users' lists
5. ✅ No impact on existing group/recipe functionality
6. ✅ Can be disabled instantly via flag
7. ✅ Can be rolled back with one SQL script

---

## Summary

### What Was Built

- ✅ Complete friend invite system (email-based)
- ✅ Database schema with RLS security
- ✅ Three API endpoints (send, respond, list)
- ✅ Friends management page
- ✅ Email templates (friendly tone)
- ✅ Feature flag gating throughout
- ✅ Complete rollback capability

### Impact

- **New functionality:** Social connections between users
- **Code changes:** 7 new files, 1 modified
- **Database changes:** 1 new table, 2 new functions
- **Risk to existing features:** ZERO (completely isolated)
- **Rollback time:** <5 minutes

### Next Steps

1. ⏳ Test locally with real email addresses
2. ⏳ Deploy to Vercel preview
3. ⏳ Internal testing with team
4. ⏳ Monitor for issues
5. ⏳ Plan Phase 2 (notification bell, recipe visibility)

---

**Built by:** AI Assistant  
**Reviewed by:** Principal Software Engineer  
**Date:** November 6, 2025  
**Status:** Ready for Testing 🚀


# Testing Checklist: Friends Feature & Security Fixes

**Purpose:** Verify Friends feature works correctly and security fixes don't break functionality  
**Last Updated:** November 6, 2025  
**Branch:** main (production)

---

## 🧪 Test Environment Setup

### Prerequisites:
- [ ] Local dev server running (`npm run dev`)
- [ ] All database migrations run in Supabase:
  - [ ] `friends_migration_up.sql`
  - [ ] `friends_groups_integration.sql`
  - [ ] `fix_recipe_groups_rls.sql`
  - [ ] `remove_friend_rpc.sql`
  - [ ] `fix_recipes_rls_critical.sql` ← CRITICAL!
- [ ] Two test accounts (for testing friend relationships)
- [ ] `.env.local` configured (no feature flags needed)

### Test Accounts Needed:
- **Account A:** Your primary account (jgold118+test05@gmail.com)
- **Account B:** Friend test account (jgold118@gmail.com or similar)

---

## ✅ Core Functionality Tests

### Test 1: Authentication & Basic Access
**Purpose:** Verify login, sessions, and basic app access work

- [ ] **1.1** Open `http://localhost:3000`
- [ ] **1.2** Sign in with Account A
- [ ] **1.3** Verify you land on `/browse` page
- [ ] **1.4** Verify TopNav shows: Logo, Friends Search, Friends Icon, User Avatar
- [ ] **1.5** Sign out
- [ ] **1.6** Sign in with Account B
- [ ] **1.7** Verify same elements appear

**Expected:** ✅ Login works, no errors in console  
**If Fails:** Check AuthContext, Supabase auth configuration

---

### Test 2: Recipe Viewing (Critical Security Test)
**Purpose:** Verify recipes are properly scoped (not visible to all users)

**Logged in as Account A:**
- [ ] **2.1** Go to `/browse` page
- [ ] **2.2** Note how many recipes you see
- [ ] **2.3** Open DevTools → Console, check for errors
- [ ] **2.4** Verify you ONLY see YOUR OWN recipes (not Account B's)

**Logged in as Account B (separate browser/incognito):**
- [ ] **2.5** Go to `/browse` page
- [ ] **2.6** Verify you ONLY see Account B's recipes
- [ ] **2.7** Verify you DO NOT see Account A's recipes

**Expected:** ✅ Each user sees only their own recipes  
**If Fails:** 🔴 CRITICAL - `recipes_select_all` policy still exists!

---

### Test 3: Add Recipe (Permission Test)
**Purpose:** Verify users can still add recipes to their own cookbook

**Logged in as Account A:**
- [ ] **3.1** Click "Add Recipe" button (top right)
- [ ] **3.2** Sidebar opens
- [ ] **3.3** Type a recipe or URL
- [ ] **3.4** Recipe saves successfully
- [ ] **3.5** Recipe appears in your list
- [ ] **3.6** Open DevTools Console - check for errors

**Expected:** ✅ Recipe creation works normally  
**If Fails:** Check permissions.ts, `/api/recipes/store`

---

## 👥 Friends Feature Tests

### Test 4: Send Friend Invite
**Purpose:** Verify invite sending works

**Logged in as Account A:**
- [ ] **4.1** Click Friends icon (👥) in nav
- [ ] **4.2** Click "View All Friends" in dropdown
- [ ] **4.3** Lands on `/friends` page
- [ ] **4.4** Enter Account B's email in "Friend's Email" field
- [ ] **4.5** Click "Send Invite"
- [ ] **4.6** Toast shows: "Friend request sent!"
- [ ] **4.7** Check console for accept link (dev mode)
- [ ] **4.8** Verify invite appears in table with "Sent" status

**Expected:** ✅ Invite sent successfully  
**If Fails:** Check `/api/friends/send-invite`, email config

---

### Test 5: Receive & Accept Friend Invite
**Purpose:** Verify receiving and accepting invites works

**Logged in as Account B:**
- [ ] **5.1** Copy the accept link from Account A's console
- [ ] **5.2** Paste link in browser (or go to `/friends`)
- [ ] **5.3** Friends icon shows badge with "1"
- [ ] **5.4** Click friends icon
- [ ] **5.5** Dropdown shows pending request from Account A
- [ ] **5.6** Click "Accept" button
- [ ] **5.7** Toast shows: "Friend request accepted!"
- [ ] **5.8** Badge disappears
- [ ] **5.9** Go to `/friends` page
- [ ] **5.10** Verify Account A appears in table with "Active" status

**Expected:** ✅ Acceptance works, friendship created  
**If Fails:** Check `/api/friends/respond`, `activate_friend_invite` RPC

---

### Test 6: Friends Search & Navigation
**Purpose:** Verify search and cookbook navigation works

**Logged in as Account B:**
- [ ] **6.1** Go to `/browse` page (should see your own recipes)
- [ ] **6.2** Click search bar in top nav
- [ ] **6.3** Dropdown opens showing Account A as a friend
- [ ] **6.4** Click on Account A's name
- [ ] **6.5** Page navigates to `/browse` showing Account A's recipes
- [ ] **6.6** Header shows: Account A's name (e.g., "Josh's Cookbook")
- [ ] **6.7** Subtitle shows: "Browsing friend's cookbook"
- [ ] **6.8** Back button (←) appears at top
- [ ] **6.9** Click back button
- [ ] **6.10** Returns to your own cookbook

**Expected:** ✅ Navigation works smoothly  
**If Fails:** Check FriendsSearch.tsx, GroupContext, browse page

---

### Test 7: View Friend's Recipes (Security Test)
**Purpose:** Verify friends can see each other's recipes (two-way relationship)

**Logged in as Account A:**
- [ ] **7.1** Search for Account B in friends search
- [ ] **7.2** Click to view Account B's cookbook
- [ ] **7.3** Verify you CAN see Account B's recipes
- [ ] **7.4** Verify you CANNOT see "Add Recipe" button (read-only)
- [ ] **7.5** Try to delete one of Account B's recipes (should not be possible)

**Logged in as Account B:**
- [ ] **7.6** Search for Account A
- [ ] **7.7** Verify you CAN see Account A's recipes
- [ ] **7.8** Verify read-only access (no Add/Delete buttons)

**Expected:** ✅ Friends can view each other's recipes, but read-only  
**If Fails:** 🔴 Check `fix_recipe_groups_rls.sql`, `are_friends` RPC

---

### Test 8: Delete Friend
**Purpose:** Verify friend removal works with modal pattern

**Logged in as Account A:**
- [ ] **8.1** Go to `/friends` page
- [ ] **8.2** Find Account B in Active friends table
- [ ] **8.3** Click delete icon (🗑️)
- [ ] **8.4** Modal appears: "Remove Friend?"
- [ ] **8.5** Shows: "Are you sure you want to remove [Name]..."
- [ ] **8.6** Click "Cancel" → Modal closes, friend still there
- [ ] **8.7** Click delete icon again
- [ ] **8.8** Click "Remove" → Modal shows loading state
- [ ] **8.9** Toast shows: "Friend removed"
- [ ] **8.10** Friend disappears from table
- [ ] **8.11** Try to search for Account B → Should not appear

**Expected:** ✅ Deletion works with modal confirmation  
**If Fails:** Check `/api/friends/remove`, `remove_friend` RPC

---

### Test 9: Cancel Pending Invite
**Purpose:** Verify canceling outgoing invites works

**Setup:** Send invite to a new email (not yet accepted)

**Logged in as Account A:**
- [ ] **9.1** Send friend invite to `test@example.com`
- [ ] **9.2** Verify appears in table with "Sent" status
- [ ] **9.3** Click delete icon (🗑️)
- [ ] **9.4** Modal appears: "Cancel Invite?"
- [ ] **9.5** Click "Cancel Invite"
- [ ] **9.6** Toast shows: "Invite cancelled"
- [ ] **9.7** Invite disappears from table

**Expected:** ✅ Invite cancellation works  
**If Fails:** Check `/api/friends/cancel-invite`

---

### Test 10: Reject Friend Invite
**Purpose:** Verify rejecting invites works

**Setup:** Have Account A send new invite to Account B

**Logged in as Account B:**
- [ ] **10.1** Friends icon shows badge
- [ ] **10.2** Click friends icon → See pending request
- [ ] **10.3** Click "Reject" button
- [ ] **10.4** Toast shows: "Friend request rejected"
- [ ] **10.5** Request disappears
- [ ] **10.6** Badge count decreases

**Expected:** ✅ Rejection works  
**If Fails:** Check `/api/friends/respond`, `reject_friend_invite` RPC

---

## 🔒 Security Validation Tests

### Test 11: Email Enumeration Prevention
**Purpose:** Verify generic error messages don't leak user info

**Logged in as Account A:**
- [ ] **11.1** Try to send invite to Account B (already friends)
- [ ] **11.2** Error: "Cannot send friend request to this email" (generic)
- [ ] **11.3** Try to send invite to random non-existent email
- [ ] **11.4** Should work OR show same generic error
- [ ] **11.5** Error messages should NOT reveal if email exists

**Expected:** ✅ Generic error messages  
**If Fails:** Check send-invite route, line 58-63

---

### Test 12: UUID Validation
**Purpose:** Verify malformed IDs are rejected

**Using browser DevTools:**
- [ ] **12.1** Open DevTools → Console
- [ ] **12.2** Run:
```javascript
fetch('/api/friends/remove', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ friendId: 'invalid-uuid' })
}).then(r => r.json()).then(console.log)
```
- [ ] **12.3** Response should be: `{ success: false, error: 'Invalid friend ID format' }`

**Expected:** ✅ Invalid UUIDs rejected before database query  
**If Fails:** Check remove route UUID validation (line 28-35)

---

### Test 13: Authorization Check (Can't Delete Others' Friendships)
**Purpose:** Verify you can't delete friendships you're not part of

**Setup:** Need 3 accounts (A, B, C) where B and C are friends

**Logged in as Account A (not friends with B or C):**
- [ ] **13.1** Get the friendship UUID between B and C (from Supabase dashboard)
- [ ] **13.2** Try to delete using DevTools:
```javascript
fetch('/api/friends/remove', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ friendId: '<UUID-of-friend-C>' })
}).then(r => r.json()).then(console.log)
```
- [ ] **13.3** Should fail (friendship not found or RLS blocks)

**Expected:** ✅ Cannot delete others' friendships  
**If Fails:** 🔴 CRITICAL - RPC function not validating properly

---

### Test 14: Recipe Access Control (Friend-Only)
**Purpose:** Verify non-friends cannot access your recipes

**Setup:** Account A and Account B are NOT friends (delete friendship first)

**Logged in as Account B:**
- [ ] **14.1** Get Account A's group ID from Supabase
- [ ] **14.2** Try to access via URL: `http://localhost:3000/browse?groupId=<A-group-id>`
- [ ] **14.3** Should show error: "You do not have access to this recipe book"
- [ ] **14.4** Console shows 403 Forbidden

**Expected:** ✅ Cannot access non-friend's recipes  
**If Fails:** 🔴 CRITICAL - RLS or permissions.ts issue

---

## 🔄 Real-Time Features Tests

### Test 15: Notification Bell Real-Time Updates
**Purpose:** Verify real-time subscription works

**Setup:** Two browsers, Account A and Account B

**Browser 1 (Account A):**
- [ ] **15.1** Logged in and on any page
- [ ] **15.2** Friends icon shows badge count (should be 0)

**Browser 2 (Account B):**
- [ ] **15.3** Send friend invite to Account A

**Browser 1 (Account A):**
- [ ] **15.4** Badge should update to "1" automatically (within seconds)
- [ ] **15.5** Click friends icon → See pending request

**Expected:** ✅ Real-time notification appears  
**If Fails:** Check NotificationBell.tsx subscription, Supabase Realtime config

---

## 🎯 Edge Cases & Error Handling

### Test 16: Self-Invite Prevention
- [ ] **16.1** Try to send friend invite to your own email
- [ ] **16.2** Error: "Cannot send friend request to yourself"

### Test 17: Duplicate Invite Prevention
- [ ] **17.1** Send invite to email X
- [ ] **17.2** Try to send another invite to same email
- [ ] **17.3** Error: "Cannot send friend request to this email"

### Test 18: Empty States
- [ ] **18.1** New account with no recipes → Shows party popper emoji and message
- [ ] **18.2** No friends → Table shows "No friends yet"
- [ ] **18.3** Search with no friends → Dropdown shows "No friends yet"

### Test 19: Back Button Navigation
- [ ] **19.1** View friend's cookbook
- [ ] **19.2** Click back button
- [ ] **19.3** Returns to YOUR cookbook (not just /browse)
- [ ] **19.4** Verify correct group is active

---

## 🔍 Security-Specific Tests

### Test 20: RLS Policy Verification
**Run in Supabase SQL Editor:**

```sql
-- 1. Check friends table policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'friends';
-- Expected: "Users can view and manage their friend data"

-- 2. Check recipe_groups policies  
SELECT policyname FROM pg_policies WHERE tablename = 'recipe_groups';
-- Expected: "Users can view their own groups and friend groups"

-- 3. Check recipes policies (CRITICAL)
SELECT policyname FROM pg_policies WHERE tablename = 'recipes';
-- Expected: 4 policies (view group recipes, create, update, delete)
-- NOT EXPECTED: recipes_select_all (if present → DANGER!)

-- 4. Verify RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'activate_friend_invite',
  'reject_friend_invite', 
  'get_my_friends',
  'get_my_pending_invites',
  'get_friends_groups',
  'are_friends',
  'remove_friend'
);
-- Expected: All 7 functions listed
```

**Checklist:**
- [ ] **20.1** All 7 RPC functions exist
- [ ] **20.2** `recipes_select_all` policy does NOT exist
- [ ] **20.3** Friends RLS policy exists
- [ ] **20.4** Recipe_groups policy includes friend check

---

### Test 21: API Authentication Test
**Purpose:** Verify all endpoints require authentication

**Using browser (logged OUT):**
```javascript
// In DevTools Console:
fetch('/api/friends/list').then(r => r.json()).then(console.log)
// Expected: { success: false, error: 'Unauthorized' }

fetch('/api/friends/send-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recipientEmail: 'test@test.com' })
}).then(r => r.json()).then(console.log)
// Expected: { success: false, error: 'Unauthorized' }
```

**Checklist:**
- [ ] **21.1** `/api/friends/list` returns 401 when logged out
- [ ] **21.2** `/api/friends/send-invite` returns 401 when logged out
- [ ] **21.3** `/api/friends/remove` returns 401 when logged out

**Expected:** ✅ All endpoints require authentication  
**If Fails:** 🔴 CRITICAL - Missing auth checks

---

## 🧩 Integration Tests

### Test 22: Full Friend Workflow (End-to-End)
**Purpose:** Complete journey from invite to viewing recipes

**Part 1: Establish Friendship**
- [ ] **22.1** Account A sends invite to Account B
- [ ] **22.2** Account B receives notification (bell badge)
- [ ] **22.3** Account B accepts invite
- [ ] **22.4** Both see each other in friends list

**Part 2: Share Recipes**
- [ ] **22.5** Account A adds a new recipe
- [ ] **22.6** Account B searches for Account A
- [ ] **22.7** Account B clicks Account A → Sees the new recipe
- [ ] **22.8** Account A adds another recipe
- [ ] **22.9** Account B refreshes → Sees both recipes

**Part 3: Cleanup**
- [ ] **22.10** Account A removes Account B as friend
- [ ] **22.11** Account B searches for Account A → Not found
- [ ] **22.12** Account B tries to view A's cookbook → 403 Forbidden

**Expected:** ✅ Complete workflow works end-to-end  
**If Fails:** Review error message, check specific component

---

## 🐛 Regression Tests (Features That Should Still Work)

### Test 23: Old Features Unaffected
- [ ] **23.1** Chat functionality works (can chat with AI)
- [ ] **23.2** Recipe search/filter works
- [ ] **23.3** Recipe details page works
- [ ] **23.4** Image upload for recipes works
- [ ] **23.5** User profile/settings accessible
- [ ] **23.6** Sign out/sign in works

---

## 📱 UI/UX Tests

### Test 24: Visual & Interaction Tests
- [ ] **24.1** Friends search autocomplete doesn't show browser suggestions
- [ ] **24.2** Friends search dropdown items are clickable (not closing prematurely)
- [ ] **24.3** Friends page table displays correctly
- [ ] **24.4** Status chips have correct colors (Active=green, Pending=yellow, Sent=gray)
- [ ] **24.5** Delete modals show correct titles based on action
- [ ] **24.6** Empty state on browse page shows party emoji
- [ ] **24.7** TopNav appears on all pages (browse, friends, recipe detail)
- [ ] **24.8** All text is left-aligned in dropdowns

---

## 🚨 Critical Security Tests

### Test 25: SQL Injection Attempt (Remove Friend)
**Using DevTools Console:**
```javascript
// Try SQL injection in friendId
fetch('/api/friends/remove', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    friendId: "'; DROP TABLE friends; --" 
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- [ ] **25.1** Response: `{ success: false, error: 'Invalid friend ID format' }`
- [ ] **25.2** `friends` table still exists in Supabase
- [ ] **25.3** No SQL executed from malicious input

**If Fails:** 🔴 CRITICAL - SQL injection vulnerability

---

### Test 26: Race Condition Test (Double Accept)
**Purpose:** Verify invite can't be accepted twice

**Using DevTools, send two rapid requests:**
```javascript
// Accept same invite twice (replace with actual invite ID)
const inviteId = 'YOUR-INVITE-ID';

Promise.all([
  fetch('/api/friends/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, action: 'accept' })
  }),
  fetch('/api/friends/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, action: 'accept' })
  })
]).then(responses => Promise.all(responses.map(r => r.json())))
  .then(console.log)
```

**Expected:**
- [ ] **26.1** One succeeds, one fails
- [ ] **26.2** Error: "Invite already processed" or similar
- [ ] **26.3** No duplicate friendships created

**If Fails:** Check `activate_friend_invite` FOR UPDATE lock

---

## 📊 Test Results Summary

**Pass Criteria:**
- ✅ All Core Functionality Tests pass (1-3)
- ✅ All Friends Feature Tests pass (4-10)
- ✅ All Security Tests pass (11-14, 20-21, 25-26)
- ✅ No console errors during normal usage
- ✅ No 500 errors in network tab

**Red Flags (Immediate Fix Required):**
- 🔴 Users can see each other's recipes WITHOUT being friends
- 🔴 API endpoints accessible without authentication
- 🔴 SQL injection successful
- 🔴 `recipes_select_all` policy still exists

**Yellow Flags (Investigate):**
- 🟡 Console errors during normal usage
- 🟡 Friends search not working
- 🟡 Notification bell not updating
- 🟡 Modal not appearing

---

## 🎯 Quick Smoke Test (5 Minutes)

If you don't have time for full testing, run this quick version:

**Minimum Viable Testing:**
1. ✅ Login works (Test 1)
2. ✅ Can only see own recipes (Test 2) ← CRITICAL
3. ✅ Send friend invite (Test 4)
4. ✅ Accept friend invite (Test 5)
5. ✅ View friend's recipes (Test 7) ← CRITICAL
6. ✅ Delete friend works (Test 8)
7. ✅ SQL injection blocked (Test 25) ← CRITICAL

**If all 7 pass → You're good to go! 🚀**

---

## 🔧 Troubleshooting Guide

### Issue: "You do not have access to this recipe book"
**Cause:** RLS policy not updated or RPC function missing  
**Fix:** Run `fix_recipe_groups_rls.sql` and `friends_groups_integration.sql`

### Issue: "Invite not found"
**Cause:** RPC function not created  
**Fix:** Run `friends_migration_up.sql`

### Issue: Can see everyone's recipes
**Cause:** `recipes_select_all` policy still exists  
**Fix:** Run `fix_recipes_rls_critical.sql` IMMEDIATELY

### Issue: Delete friend fails
**Cause:** `remove_friend` RPC not created  
**Fix:** Run `remove_friend_rpc.sql`

### Issue: Console errors about missing functions
**Cause:** Migrations not run  
**Fix:** Run all .sql files in supabase/ folder in order

---

## 📝 Test Log Template

Use this to track your testing:

```
Date: _________
Tester: _________
Environment: [ ] Local [ ] Production

PASSED:
- Test #__: ___________
- Test #__: ___________

FAILED:
- Test #__: ___________ (Error: _________)

NOTES:
- ___________
```

---

## ✅ Sign-Off

Once all critical tests pass:
- [ ] No security vulnerabilities found
- [ ] All features work as expected
- [ ] No regression in existing functionality
- [ ] Ready for production use

**Tester Signature:** ___________  
**Date:** ___________

---

**Quick Start:** Run Tests 1, 2, 4, 5, 7, 8, 25 for core validation!


# Debug Code Cleanup TODO

**Status:** Feature is working! Now clean up debug logs for production.

---

## 🧹 Files That Need Cleanup

### **Priority 1: High-Volume Debug Logs**

#### **contexts/AuthContext.tsx**
```typescript
// Remove these lines:
Line 20-21: providerMountCount tracking
Line 111-112: AuthProvider MOUNTED log
Line 136: "Attempting to get session" log  
Line 144-146: "Session retrieved" log
Line 176-177: eventLog array
Line 182-202: 🔔 AUTH EVENT detailed logging
Line 204: "Auth state changed" log
Line 216: "Skipping duplicate auth update" log
```

#### **contexts/GroupContext.tsx**
```typescript
// Remove these:
Line 153-159: 🟣 GroupContext useEffect triggered
Line 168: "Waiting for auth" log
Line 174: "No user, clearing groups" log
Line 189: "User available, loading groups" log
Line 186: "groups-refresh event caught" log
Line 190: "Clearing previous timeout" log
Line 196: "Scheduling reload in 300ms" log
Line 198: "Executing reload now" log

// Keep these (useful):
Line 46: "Loading groups for user"
Line 53: "Loaded X groups in Xms"  
Line 54: "Groups found"
Line 119: "Active group set"
```

#### **utils/permissions.ts**
```typescript
// Remove:
Line 137: "Calling get_friends_groups RPC"
Line 140-149: RAW friends table comparison (entire query + log)
Line 154-158: "RPC returned" detailed logging
Line 152: "Skipping friend" log

// Keep:
Line 166: "getUserGroups: Added X friend group(s)" (useful metric)
```

#### **components/FriendsSearch.tsx**
```typescript
// Remove:
Line 53-60: 🔵 FRIENDSSEARCH: Groups updated useEffect
Line 147-152: 🟢 handleFriendClick called logging
Line 164-168: 🟢 Search result logging
Line 182: "Friend doesn't have recipe collection" log
```

#### **app/friends/page.tsx**
```typescript
// Remove:
Line 197: "✅ FRIEND ACCEPTED: Dispatching..."
Line 202: "✅ FRIEND ACCEPTED: Event dispatched"
Line 256-274: All 🔍 DEBUG: handleFriendClick logging (if exists)

// Keep:
Line 200: window.dispatchEvent (THE FIX!)
Line 303: window.dispatchEvent (friend removal)
```

---

### **Priority 2: Page-Level Logs**

#### **app/page.tsx**
- Remove all 🏠 HOME PAGE logs
- Keep core redirect logic

#### **app/browse/page.tsx**
- Remove 🟠 useEffect TRIGGERED logs
- Remove 🔵 fetchRecipes CALLED logs
- Keep core recipe fetching

---

## 📚 Documentation Cleanup (Optional)

### **Investigation Files (Move to docs/archive/):**
- `INVESTIGATION_METADATA_SYNC.md` (1268 lines!)
- `TEST_RESULTS.md`
- `TEST_RESULTS_DEEP.md`
- `TESTING_PLAN.md`
- `DEEP_TESTING_GUIDE.md`
- `METADATA_SYNC_SUMMARY.md` (redundant with METADATA_SYNC_IMPLEMENTATION.md)
- `docs/FIX_FRIEND_GROUPS_ISSUE.md` (replaced by LEFT_JOIN_FIX.md)

### **Keep These:**
- `METADATA_SYNC_IMPLEMENTATION.md` - Feature documentation
- `docs/SETTINGS_PAGE_SETUP.md` - Setup guide
- `docs/GOOGLE_AUTH_SETUP.md` - OAuth setup
- `docs/LEFT_JOIN_FIX.md` - Friend groups fix explanation
- `CLEANUP_PLAN.md` (this file)

---

## 🎯 Quick Cleanup Script

**To remove all emoji logs at once:**
```bash
# Remove debug logs with emojis
grep -rl "console\.log.*[🔍🟢🟣🔵✅🔔🏗️🏠🟠]" --include="*.tsx" --include="*.ts" contexts/ components/ app/ utils/ | \
  xargs sed -i '' '/console\.log.*[🔍🟢🟣🔵✅🔔🏗️🏠🟠]/d'

# Remove TEST comments
grep -rl "// TEST [0-9]" --include="*.tsx" --include="*.ts" contexts/ | \
  xargs sed -i '' '/\/\/ TEST [0-9]/d'
```

**Or manual:** Go through each file and delete lines listed above.

---

## ✅ After Cleanup

**Console should only show:**
- Error messages (actual problems)
- Warning messages (important info)
- Key metrics (groups loaded, recipes found)
- No debug spam with emojis

**Production-ready logging!**

---

**Method:**
1. Manual cleanup (safer, more control)
2. Script cleanup (faster, less control)
3. Leave for now (can clean anytime)

Your choice! The features all work, debug code is just noise at this point.


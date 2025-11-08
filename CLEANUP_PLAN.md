# Code Cleanup Plan

**Status:** Friend click bug is fixed and working!  
**Next:** Remove debug code and clean up investigation files

---

## 🧹 Files to Clean

### **1. contexts/AuthContext.tsx**

**Remove:**
- Lines 20-21: `providerMountCount` tracking
- Lines 125-127: Mount logging (`🏗️ AuthProvider MOUNTED`)
- Lines 75-79: `shouldUpdateAuth: Critical change detected` logging
- Lines 101-107: `shouldUpdateAuth: Metadata changed` logging
- Lines 207-216: `🔔 AUTH EVENT` detailed logging

**Keep:**
- Core auth functionality
- Feature flag for metadata sync
- Circuit breaker
- Error handling

**Impact:** Removes ~30 lines of debug code

---

### **2. contexts/GroupContext.tsx**

**Remove:**
- Lines 153-159: `🟣 GroupContext useEffect triggered` logging
- Lines 168: "Waiting for auth" log
- Lines 174: "No user, clearing groups" log
- Lines 189: "User available, loading groups" log
- Lines 186-202: All `🔔 GroupContext` event logs
- Lines 198: "Executing reload now" log

**Keep:**
- Lines 46, 53-54, 119: Basic operation logs (optional - useful for debugging)
- Core groups loading logic
- Event listener with debouncing

**Impact:** Removes ~15 lines of debug code

---

### **3. components/FriendsSearch.tsx**

**Remove:**
- Lines 53-60: `🔵 FRIENDSSEARCH: Groups updated` useEffect
- Lines 147-152: `🟢 FRIENDSSEARCH: handleFriendClick called!` logging
- Lines 164-168: `🟢 FRIENDSSEARCH: Search result` logging
- Line 182: "Friend doesn't have a recipe collection yet" log

**Keep:**
- Core search functionality
- Graceful handling of friends without groups

**Impact:** Removes ~20 lines of debug code

---

### **4. app/friends/page.tsx**

**Remove:**
- Lines 197, 202: `✅ FRIEND ACCEPTED` logging
- Lines 256-274: All `🔍 DEBUG: handleFriendClick` logging (if exists)

**Keep:**
- Event dispatch: `window.dispatchEvent(new Event('groups-refresh'))`
- Core functionality

**Impact:** Removes ~20 lines of debug code

---

### **5. utils/permissions.ts**

**Remove:**
- Lines 137: "Calling get_friends_groups RPC" log
- Lines 140-149: Raw friends table comparison query (entire block)
- Lines 141-158: "RPC returned" detailed logging
- Line 152: "Skipping friend" log
- Line 161: "RPC error" log (keep as error, not console.log)

**Keep:**
- Line 159: `getUserGroups: Added X friend group(s)` (useful metric)
- Core permission logic
- Graceful null handling

**Impact:** Removes ~20 lines of debug code

---

### **6. app/page.tsx**

**Remove:**
- All `🏠 HOME PAGE` logs
- All `🟠 useEffect TRIGGERED` logs

**Keep:**
- Core redirect logic

---

### **7. app/browse/page.tsx**

**Remove:**
- `🟠 useEffect TRIGGERED` logs
- `🔵 fetchRecipes CALLED` logs

**Keep:**
- Core recipe fetching

---

## 📚 Documentation Files to Review

### **Keep (Useful Reference):**
- ✅ `METADATA_SYNC_IMPLEMENTATION.md` - Explains metadata sync feature
- ✅ `docs/SETTINGS_PAGE_SETUP.md` - Setup instructions
- ✅ `docs/GOOGLE_AUTH_SETUP.md` - OAuth setup
- ✅ `docs/LEFT_JOIN_FIX.md` - Explains friend groups fix
- ✅ `GOOGLE_AUTH_IMPLEMENTATION.md` - Quick reference

### **Archive or Delete (Investigation Only):**
- ❓ `INVESTIGATION_METADATA_SYNC.md` - Deep dive (4300 lines!)
- ❓ `TEST_RESULTS.md` - Raw test data
- ❓ `TEST_RESULTS_DEEP.md` - More test data
- ❓ `DEEP_TESTING_GUIDE.md` - Testing instructions
- ❓ `TESTING_PLAN.md` - Test methodology
- ❓ `METADATA_SYNC_SUMMARY.md` - Might be redundant
- ❓ `docs/FIX_FRIEND_GROUPS_ISSUE.md` - Replaced by LEFT_JOIN_FIX.md

---

## 📊 Cleanup Summary

**Code files:** 7 files  
**Debug lines to remove:** ~125 lines  
**Investigation docs:** 7 files (~2000+ lines combined)

**After cleanup:**
- ✅ Production code is clean
- ✅ No debug spam in console
- ✅ Useful docs remain
- ✅ Investigation history archived

---

## 🎯 Recommended Approach

### **Phase 1: Remove Debug Logging** (Do now)
- Clean production code
- Remove console.log spam
- Keep core functionality

### **Phase 2: Clean Docs** (Optional)
- Move investigation docs to `docs/archive/`
- Keep essential docs
- Or leave as-is (history)

---

**Want me to:**
- **A:** Remove all debug logging (Phase 1)
- **B:** Just remove the most verbose logs
- **C:** Leave it all (debug logs can be useful)
- **D:** Clean everything (code + docs)


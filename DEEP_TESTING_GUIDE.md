# Deep Testing Guide - Building to 90% Confidence

**Session:** Continued investigation  
**Goal:** Uncover any hidden issues before implementing metadata sync  
**Strategy:** Three targeted tests to answer critical unknowns

---

## Tests Implemented

### ✅ Test 7: Event Analysis
**Question:** Why does Supabase fire 7+ duplicate SIGNED_IN events?

**What we're logging:**
```javascript
🔔 AUTH EVENT {
  eventType: "SIGNED_IN",
  eventNumber: 1,  // Which SIGNED_IN is this? (#1, #2, #3...)
  totalEvents: 1,  // How many total events so far?
  gapFromPrevious: "0ms",  // How long since last event?
  hasSession: true,
  userId: "abc123",
  userName: "Josh Gold",
  tokenPrefix: "eyJhbGc...",
  sameTokenAsPrevious: false  // Is it the SAME token?
}
```

**What to look for:**
- [ ] Are all 7 events truly identical (same token)?
- [ ] Are they simultaneous (0ms gap) or sequential (100ms+ gaps)?
- [ ] Do they have different event numbers (SIGNED_IN #1, #2, #3...)?
- [ ] Does anything change between events?

**Key questions this answers:**
- Are the 7+ events a Supabase bug or our integration issue?
- Can we further optimize which events to handle?
- Is there a pattern we can exploit?

---

### ✅ Test 8: Provider Mount Count
**Question:** Is AuthProvider mounting multiple times (causing issues)?

**What we're logging:**
```javascript
🏗️ AuthProvider MOUNTED (total mounts in session: 1)
🏗️ AuthProvider UNMOUNTING
```

**What to look for:**
- [ ] Mount count should be 1 (or 2 with React Strict Mode)
- [ ] Should mount once on app start
- [ ] Should NOT mount on every navigation
- [ ] Should NOT unmount/remount during normal use

**Expected:**
```
Initial page load:
🏗️ AuthProvider MOUNTED (total mounts: 1)
🏗️ AuthProvider MOUNTED (total mounts: 2)  ← React Strict Mode

Then stable (no more mounts until full page refresh)
```

**Bad signs:**
```
🏗️ AuthProvider MOUNTED (total mounts: 3)
🏗️ AuthProvider MOUNTED (total mounts: 4)
// ... keeps increasing during navigation
```

**Key questions this answers:**
- Is something causing the provider to remount?
- Could provider remounting cause duplicate subscriptions?
- Is the "Attempting to get session x2" from remounting or Strict Mode?

---

### ✅ Test 9 (Token): Access Token Tracking
**Question:** Does access token change when it shouldn't?

**What we're logging:**
```javascript
✅ shouldUpdateAuth: WILL UPDATE {
  userIdChanged: false,
  tokenChanged: true,  // ← Key metric
  oldToken: "eyJhbGc...",
  newToken: "eyJhbGd...",
}
```

**What to look for:**
- [ ] Does token change during login? (YES - expected)
- [ ] Does token change during navigation? (NO - should be stable)
- [ ] Does token change every 50+ minutes? (YES - refresh, expected)
- [ ] Would token change if we updated metadata? (UNKNOWN - critical!)

**Key questions this answers:**
- Is token refresh coupled with other operations?
- Could metadata updates trigger token refresh?
- Is our token tracking too sensitive?

---

## How to Run the Tests

### Step 1: Refresh Your Browser
```
The server should hot-reload automatically
Open console (F12)
Clear console
```

### Step 2: Fresh Login Test
```
1. Sign out (if logged in)
2. Sign back in
3. Watch the console logs carefully
```

### Step 3: Navigation Test
```
1. Browse around (Browse → Friends → Browse)
2. Watch for any mount/unmount logs
3. Should NOT see new mounts during navigation
```

### Step 4: Sit and Wait (Token Refresh Test)
```
1. Stay logged in for 50-60 minutes
2. Watch console
3. Should see token refresh event
4. Log if tokenChanged: true
```

---

## What We're Looking For

### Test 7: Event Analysis Results

**Scenario A: Events are Truly Identical (Most Likely)**
```javascript
🔔 AUTH EVENT { eventType: "SIGNED_IN", eventNumber: 1, tokenPrefix: "eyJhbGc1234..." }
🔔 AUTH EVENT { eventType: "SIGNED_IN", eventNumber: 2, tokenPrefix: "eyJhbGc1234...", sameTokenAsPrevious: true }
🔔 AUTH EVENT { eventType: "SIGNED_IN", eventNumber: 3, tokenPrefix: "eyJhbGc1234...", sameTokenAsPrevious: true }
// ... 7 total
```

**Conclusion:** Supabase bug or quirk, our filter is correct

---

**Scenario B: Events are Subtly Different**
```javascript
🔔 AUTH EVENT { eventType: "SIGNED_IN", eventNumber: 1, tokenPrefix: "eyJhbGc1234..." }
🔔 AUTH EVENT { eventType: "SIGNED_IN", eventNumber: 2, tokenPrefix: "eyJhbGc5999...", sameTokenAsPrevious: false }
// Tokens are different!
```

**Conclusion:** These might be legitimate separate events, filter might be wrong

---

**Scenario C: Events Fire Simultaneously**
```javascript
🔔 AUTH EVENT { eventType: "SIGNED_IN", gapFromPrevious: "0ms" }
🔔 AUTH EVENT { eventType: "SIGNED_IN", gapFromPrevious: "1ms" }
🔔 AUTH EVENT { eventType: "SIGNED_IN", gapFromPrevious: "0ms" }
```

**Conclusion:** Race condition, might need debouncing

---

### Test 8: Mount Count Results

**Scenario A: Mounts Once (Expected)**
```javascript
🏗️ AuthProvider MOUNTED (total mounts: 1)
🏗️ AuthProvider MOUNTED (total mounts: 2)  ← Strict Mode
// Then stable, no more mounts
```

**Conclusion:** Healthy, provider is stable

---

**Scenario B: Mounts Multiple Times (Problem)**
```javascript
🏗️ AuthProvider MOUNTED (total mounts: 1)
🏗️ AuthProvider MOUNTED (total mounts: 2)
🏗️ AuthProvider UNMOUNTING
🏗️ AuthProvider MOUNTED (total mounts: 3)  ← During navigation!
```

**Conclusion:** Something is remounting the provider, causing duplicate subscriptions

---

### Test 9: Token Change Results

**Scenario A: Token Stable (Expected)**
```javascript
// During normal navigation - no updates
// Token stays the same for ~1 hour
```

**Conclusion:** Token tracking is not oversensitive

---

**Scenario B: Token Changes Frequently (Problem)**
```javascript
✅ shouldUpdateAuth: WILL UPDATE {
  userIdChanged: false,
  tokenChanged: true,  ← Changing when it shouldn't
}
// Happens during navigation or frequently
```

**Conclusion:** Something is causing token churn, need to investigate

---

## Critical Data Points to Collect

### From Test 7 (Event Analysis):
1. **Total SIGNED_IN events during one login:** ___ (we think 7+)
2. **Are all tokens identical?** YES / NO / VARIES
3. **Time gaps between events:** Simultaneous (0ms) / Sequential (100ms+) / Mixed
4. **Any patterns in event order?** Describe

### From Test 8 (Mount Count):
1. **Initial mount count:** ___ (should be 1-2)
2. **Mounts during navigation:** YES / NO
3. **Ever see UNMOUNTING?** YES / NO / WHEN
4. **Final mount count after 5 min:** ___ (should stay at 2)

### From Test 9 (Token Tracking):
1. **Token changes during login:** YES (expected)
2. **Token changes during navigation:** YES / NO
3. **Token stays stable for how long:** ___ minutes
4. **Any unexpected token changes:** YES / NO

---

## Confidence Matrix

| Test | If Pass | If Fail | Confidence Gain |
|------|---------|---------|-----------------|
| Test 7: Events identical | +15% | -10% | Confirms Supabase behavior |
| Test 8: Single mount | +10% | -20% | Provider stability |
| Test 9: Token stable | +10% | -15% | No hidden triggers |
| **Total Possible** | **+35%** | | **90%+ achievable** |

**Current confidence:** 70%  
**After tests:** 90-105% (if all pass)  
**If issues found:** 50-60% (but we know what to fix)

---

## What Happens After Testing

### If All Tests Pass (Expected):
```
✅ Events are identical duplicates (Supabase quirk)
✅ Provider mounts once (stable)
✅ Tokens are stable (no hidden coupling)

→ Confidence: 95%+
→ Action: Implement metadata sync with atomic storage
→ Risk: LOW (well understood)
```

### If We Find Issues:
```
⚠️ Events are different (need better filtering)
⚠️ Provider remounts (need to fix that first)
⚠️ Tokens change unexpectedly (need to understand why)

→ Confidence: 60%
→ Action: Fix discovered issues first
→ Risk: MEDIUM (more unknowns)
```

---

## Ready to Observe

**The tests are now active!**

**Next steps:**
1. Let hot reload finish
2. Clear browser console
3. Sign out
4. Sign back in
5. Copy all the logs

**Look for:**
- 🔔 AUTH EVENT logs (Test 7)
- 🏗️ MOUNTED logs (Test 8)  
- ✅ shouldUpdateAuth logs (Test 9)

**Report back the key data points and I'll analyze them!** 🔬

---

*These tests are designed to push your confidence from 70% to 90%+*


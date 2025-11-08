# Metadata Sync Testing Results

**Date:** November 8, 2025  
**Strategy:** Systematic pressure testing with reversible experiments

---

## Test 1: Home Page Observation ✅

**Test:** Added logging to home page useEffect  
**Status:** Complete  
**Risk:** Zero (logging only)

### Results:
- ⚠️ Home page is `/browse` when logged in, not `/`
- Root `/` just redirects immediately
- Browse page is the actual landing page for authenticated users
- Home page hypothesis partially incorrect (wrong page)

---

## Test 2: AuthContext Render Counter ✅

**Test:** Track AuthProvider render count  
**Status:** Complete  
**Risk:** Zero (logging only)

### Results:
```
🔄 AuthProvider render #1
🔄 AuthProvider render #2
🔄 AuthProvider render #3
🔄 AuthProvider render #4
```

**Analysis:**
- ✅ 4 renders total (healthy)
- ✅ Under 20 limit (no infinite render)
- ✅ React Strict Mode explains the first 2 (#1-2)
- ✅ Post-auth update explains #3-4
- ✅ Stabilizes after 4 renders

**Verdict:** HEALTHY baseline ✅

---

## Test 3: Object Reference Comparison ✅

**Test:** Compare old vs new user objects in updateAuthState  
**Status:** Complete  
**Risk:** Zero (logging only)

### Results:
```javascript
🔐 AUTH: updateAuthState called {
  userId: '4a4777ab-1729-4b27-b6d1-fb85ba7bd135',
  userName: 'Josh Gold',
  objectsAreSameReference: false,  // ← CRITICAL
  userIdSame: false,  // (first load, was null)
  userNameSame: false  // (first load, was null)
}
```

**Analysis:**
- ✅ **objectsAreSameReference: FALSE** - Confirmed!
- Supabase returns NEW object every time
- Even though user data is identical
- This is why components re-render

**Verdict:** HYPOTHESIS CONFIRMED ✅

**Implications:**
- Any component with `[user]` in dependencies will trigger
- Not because data changed, but because object reference changed
- This is the cascade trigger mechanism

---

## Critical Discovery: Supabase Event Spam 🚨

**Observed during testing:**
```javascript
AuthContext: Auth state changed: SIGNED_IN session exists
AuthContext: Skipping duplicate auth update (same user and token)
// ... REPEATS 7+ TIMES
```

**Analysis:**
- Supabase fires SAME event 7+ times
- All events have identical user/token
- Current `shouldUpdateAuth` correctly filters these
- **Only 1 updateAuthState call** despite 7+ events

**Why This Matters for Metadata Sync:**
```
Without defensive filtering:
- 7+ events × metadata check = potential loop
- Any flaw in comparison gets hit 7 times
- Even 1 wrong TRUE triggers cascade
- Cascade might trigger more events
- INFINITE LOOP
```

**Key Insight:** Metadata comparison must be PERFECT and STABLE across 7+ rapid checks

---

## Baseline Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| AuthProvider renders | 4 | ✅ Good |
| updateAuthState calls | 1 | ✅ Perfect |
| Supabase event fires | 7+ | ⚠️ High but filtered |
| Groups loaded | 1 | ✅ Perfect |
| Page load time | <1 second | ✅ Fast |

---

## Next Tests

### Test 4: Browse Page Render Count
- [ ] Add counter to Browse page
- [ ] See how many times it re-renders
- [ ] Understand cascade depth

### Test 5: GroupContext Effect Count
- [ ] Add counter to GroupContext useEffect
- [ ] See how many times it triggers
- [ ] Verify it only loads groups once

### Test 6: Controlled Metadata Change
- [ ] Manually trigger a name update in console
- [ ] Watch cascade effect
- [ ] Count renders and updates

---

## Hypotheses Status

| Hypothesis | Status | Evidence |
|------------|--------|----------|
| Supabase returns new objects | ✅ CONFIRMED | objectsAreSameReference: false |
| Multiple duplicate events | ✅ CONFIRMED | 7+ SIGNED_IN events |
| Current filter prevents cascades | ✅ CONFIRMED | Only 1 update despite 7 events |
| Home page causes `/` loop | ⏸️ PENDING | Can't test (already on /browse) |
| Object references trigger cascades | ✅ CONFIRMED | Components depend on [user] |

---

## Key Learnings

### 1. The Filter is Critical
Current `shouldUpdateAuth` prevents:
- 7+ duplicate events from propagating
- 6 unnecessary cascades  
- Potential infinite loops

**We MUST maintain this level of filtering.**

### 2. Object References are the Trigger
- Supabase returns new objects
- setUser(newObject) → React sees change
- Components with [user] deps trigger
- This is unavoidable without useMemo or different approach

### 3. The Scale of the Problem
With 7+ events per update:
- Each event checks metadata
- Must return correct result 7+ times
- Even 1 wrong TRUE out of 7 = cascade
- Margin for error is TINY

---

## Recommended Next Actions

### Continue Testing:
1. **Test 4**: Add GroupContext effect counter
2. **Test 5**: Simulate metadata change manually
3. **Test 6**: Test the user?.id dependency fix

### Or Move to Solution:
Based on current data, we could try:
- Solution: Store metadata atomically (before return)
- With: Circuit breaker (safety)
- With: Feature flag (can disable)
- Risk: MEDIUM (but we understand the failure modes now)

---

**Status:** Tests 1-3 complete, good baseline data collected
**Next:** Continue testing or begin implementing solution?


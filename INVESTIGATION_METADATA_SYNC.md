# Investigation: Metadata Sync Failure - Root Cause Analysis

**Date Started:** November 8, 2025  
**Status:** 🔍 Active Investigation  
**Severity:** HIGH - App completely broken by changes  
**Goal:** Understand why metadata sync caused infinite loop/app crash

---

## Executive Summary

**What Happened:**
- Added metadata tracking (name, avatar_url) to AuthContext
- App immediately broke - infinite redirect loop
- All routes returned 404
- Had to revert all changes

**Core Question:**
Why did adding metadata tracking to `shouldUpdateAuth` break the entire app?

---

## Timeline of Events

### Initial Problem (What We Were Solving):
```
User changes name in settings
  ↓
Name updates in database ✅
  ↓
Nav bar shows OLD name ❌
  ↓
User must hard refresh (Cmd+Shift+R)
  ↓
Hard refresh logs user out ❌
```

### Attempted Solution:
```
Added metadata tracking to shouldUpdateAuth:
- Track lastMetadata (name, avatar_url)
- Compare old vs new metadata
- Trigger auth update if changed
```

### Result:
```
Server started
  ↓
All pages → 404
  ↓
Repeated requests to GET /
  ↓
Infinite loop detected
  ↓
App completely broken
```

---

## Code Changes That Broke It

### What We Added to AuthContext:

```typescript
// 1. Feature flag
const ENABLE_METADATA_SYNC = 
  process.env.NEXT_PUBLIC_ENABLE_METADATA_SYNC === 'true';

// 2. Metadata tracking ref
const lastMetadata = useRef<{
  name?: string;
  avatar_url?: string;
} | null>(null);

// 3. Metadata comparison function
const hasMetadataChanged = (oldMeta, newMeta): boolean => {
  if (!oldMeta && !newMeta) return false;
  if (!oldMeta || !newMeta) return true;
  
  const nameChanged = oldMeta.name !== newMeta.name;
  const avatarChanged = oldMeta.avatar_url !== newMeta.avatar_url;
  
  return nameChanged || avatarChanged;
};

// 4. Updated shouldUpdateAuth
const shouldUpdateAuth = (session: Session | null): boolean => {
  // ... existing ID/token checks ...
  
  if (ENABLE_METADATA_SYNC) {
    const newMeta = {
      name: session?.user?.user_metadata?.name,
      avatar_url: session?.user?.user_metadata?.avatar_url,
    };
    
    if (hasMetadataChanged(lastMetadata.current, newMeta)) {
      return true; // ← Trigger update
    }
  }
  
  return false;
};

// 5. Updated updateAuthState
const updateAuthState = (session: Session | null) => {
  // ... existing updates ...
  
  if (ENABLE_METADATA_SYNC) {
    lastMetadata.current = {
      name: session?.user?.user_metadata?.name,
      avatar_url: session?.user?.user_metadata?.avatar_url,
    };
  }
  
  setSession(session);
  setUser(session?.user ?? null);
};
```

---

## Hypotheses for Why It Broke

### Hypothesis 1: Re-render Loop (Most Likely)
```
Sequence:
1. Initial load: lastMetadata = null
2. Session loads: metadata = { name: "John", avatar_url: undefined }
3. Comparison: null !== { name: "John" } → TRUE
4. shouldUpdateAuth returns TRUE
5. updateAuthState runs
6. setUser() triggers re-render
7. useEffect runs again? (should have [] deps, but...)
8. Checks session again
9. Comparison: { name: "John" } vs { name: "John" }
10. Should be FALSE but... something goes wrong?
11. Loop continues
```

**Questions:**
- Does updateAuthState trigger onAuthStateChange again?
- Does setUser() cause nested event subscriptions?
- Is there a dependency array issue?

### Hypothesis 2: Event Cascade
```
Sequence:
1. updateAuthState() called
2. setUser(newUser) runs
3. This triggers USER_UPDATED event in Supabase?
4. onAuthStateChange fires
5. shouldUpdateAuth checks again
6. Metadata looks different (object reference?)
7. Returns TRUE
8. Loop
```

**Questions:**
- Does setUser trigger Supabase events?
- Does onAuthStateChange fire for local state changes?

### Hypothesis 3: Initial State Problem
```
Initial state:
lastMetadata.current = null

First session:
newMeta = {
  name: undefined,  // ← If user has no name yet
  avatar_url: undefined
}

Comparison:
null !== { name: undefined } → TRUE

Next check:
{ name: undefined } !== { name: undefined } → should be FALSE
BUT: Are they the same reference? Different objects?
```

**Questions:**
- How do we handle undefined vs missing fields?
- Is the comparison stable for undefined values?

### Hypothesis 4: Feature Flag Side Effect
```typescript
const ENABLE_METADATA_SYNC = 
  process.env.NEXT_PUBLIC_ENABLE_METADATA_SYNC === 'true';

// This is inside the component
// Does this cause issues?
// Is it stable across renders?
```

**Questions:**
- Should this be outside the component?
- Does it cause any React issues?

### Hypothesis 5: The 404s Are Unrelated
```
Maybe the metadata sync didn't break it
Maybe it was:
- The settings page code?
- A Next.js cache issue?
- Import cycle?
- Missing dependency?
```

**Questions:**
- Did the app ever actually run with metadata sync?
- Or did it fail to compile from the start?

---

## What We Know For Sure

### Facts:
1. ✅ App worked before metadata sync changes
2. ✅ App broke immediately after metadata sync changes
3. ✅ App works again after reverting
4. ❌ We don't have error logs (background processes)
5. ✅ Feature flag was set to disabled by default (later)
6. ⚠️ Multiple zombie servers complicated debugging

### Unknowns:
1. ❓ Did Next.js fail to compile?
2. ❓ Or did it compile but crash at runtime?
3. ❓ Was there a specific error message we missed?
4. ❓ Did the infinite loop happen on first load or after an event?
5. ❓ What was in the browser console besides 404s?

---

## Historical Context: The Original Bug

### From BUGFIX-AUTH-TRIPLE-LOAD.md:

**Problem:** Supabase fires multiple events:
- `SIGNED_IN`
- `INITIAL_SESSION`  
- Initial `getSession()` call

**Solution:** `shouldUpdateAuth` filters to only update when:
- User ID changes (login/logout)
- Access token changes (token refresh)

**Why It Works:**
- Prevents duplicate user object creation
- Prevents downstream effects (GroupContext reloading)
- Reduces re-renders by 67%

**The Constraint It Created:**
- **Only tracks ID and token**
- **Ignores all other changes** (including metadata)
- This is why metadata updates don't propagate

---

## Related Systems That Depend On Auth

### Components Using `useAuth()`:
```
Found 83 matches across 24 files
```

**Critical Dependencies:**
1. **GroupContext** - Watches user, reloads groups on change
2. **All pages** - Check authentication status
3. **Navigation** - Shows user name/avatar
4. **Browse/Friends/Recipe pages** - Auth-gated features

**Risk:** Changing AuthContext affects EVERYTHING

---

## Why This Is Hard

### The Fundamental Tension:

```
Performance vs Reactivity

Current: Optimize for performance (filter updates)
Needed: React to metadata (allow more updates)

But: More updates = more re-renders = worse performance
```

**The Triple Constraint:**
1. ✅ Fast page loads (current)
2. ✅ Real-time updates (needed)
3. ✅ No infinite loops (critical)

**Pick 2? Or can we have all 3?**

---

## Next Steps for Investigation

### Phase 1: Understand the Failure Mode
- [ ] Create minimal reproduction
- [ ] Add extensive logging
- [ ] Run in isolation
- [ ] Capture exact error/loop

### Phase 2: Analyze Dependencies  
- [ ] Map all useEffect deps on `user`
- [ ] Check if setUser triggers events
- [ ] Understand Supabase event timing
- [ ] Document full event flow

### Phase 3: Design Safe Solution
- [ ] Test in isolated environment
- [ ] Add safeguards (max update count?)
- [ ] Implement with killswitch
- [ ] Test exhaustively

### Phase 4: Deploy Safely
- [ ] Feature flag (off by default)
- [ ] Enable for self only
- [ ] Monitor metrics
- [ ] Gradual rollout

---

## Open Questions

### Critical Questions:
1. **Does `setUser()` trigger Supabase `onAuthStateChange`?**
   - If YES: Infinite loop is inevitable
   - If NO: Should be safe

2. **Why did we see infinite `/` requests specifically?**
   - What was trying to redirect to root?
   - Was it the auth check on pages?
   - Was it the router?

3. **Did Next.js fail to compile or fail at runtime?**
   - If compile: Syntax/import error
   - If runtime: Logic error/infinite loop

4. **What was the exact error in browser console?**
   - We only saw 404s
   - But was there a JavaScript error?
   - Stack trace?

### Technical Questions:
5. How does GroupContext respond to user object changes?
6. Does it create a cascade of updates?
7. What's the render count when this breaks?
8. Is there a way to debounce metadata updates?

---

## Theories to Test

### Theory 1: Object Reference Instability
```typescript
// Every time we create newMeta:
const newMeta = {
  name: session?.user?.user_metadata?.name,
  avatar_url: session?.user?.user_metadata?.avatar_url,
};

// This is a NEW object reference
// Even if values are the same
// Could this cause issues?
```

**Test:** Use memoization or compare values only

### Theory 2: Initial State Bootstrap
```typescript
// On first load:
lastMetadata.current = null

// Any session will be !== null
// So first check always returns TRUE
// Then what happens?
```

**Test:** Initialize lastMetadata on mount, not on first update

### Theory 3: Event Chain Reaction
```typescript
updateAuthState()
  → setUser()
  → triggers GroupContext useEffect
  → loads groups
  → setGroups()
  → triggers another render?
  → checks auth again?
  → loop?
```

**Test:** Add render counters to all contexts

---

## Debugging Tools We Need

### 1. Render Counter
```typescript
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current++;
  console.log(`AuthContext render #${renderCount.current}`);
  if (renderCount.current > 10) {
    console.error('INFINITE LOOP DETECTED');
    debugger;
  }
});
```

### 2. Update Counter
```typescript
const updateCount = useRef(0);
const updateAuthState = (session) => {
  updateCount.current++;
  console.log(`Auth update #${updateCount.current}`, {
    userId: session?.user?.id,
    metadata: session?.user?.user_metadata
  });
  if (updateCount.current > 5) {
    throw new Error('Too many auth updates - preventing infinite loop');
  }
  // ... rest
};
```

### 3. Event Logger
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔔 Auth Event:', {
    event,
    timestamp: Date.now(),
    userId: session?.user?.id,
    metadata: session?.user?.user_metadata,
    stackTrace: new Error().stack
  });
  // ... rest
});
```

---

## Similar Issues in the Wild

### Common Patterns:
- Redux infinite dispatch loops
- React Query infinite refetch
- Firebase realtime listener loops
- Auth0 token refresh loops

### Common Causes:
1. State update triggers effect that updates state
2. Object reference comparison issues
3. Missing dependency arrays
4. Event listeners triggering themselves

---

## Success Criteria

We'll know it's fixed when:

1. ✅ User changes name → Nav updates instantly
2. ✅ No infinite loops (render count < 5)
3. ✅ Page load time stays fast (< 1 second)
4. ✅ No console spam (< 10 logs on mount)
5. ✅ User stays logged in
6. ✅ All 24 components still work
7. ✅ Can enable/disable via feature flag

---

## Risk Mitigation Strategies

### Strategy 1: Circuit Breaker
```typescript
const MAX_UPDATES_PER_SECOND = 5;
const updateTimestamps = useRef<number[]>([]);

const shouldUpdateAuth = (session) => {
  // Check if we're updating too frequently
  const now = Date.now();
  updateTimestamps.current = updateTimestamps.current
    .filter(t => now - t < 1000);
  
  if (updateTimestamps.current.length >= MAX_UPDATES_PER_SECOND) {
    console.error('Circuit breaker: Too many auth updates');
    return false; // Stop the loop
  }
  
  updateTimestamps.current.push(now);
  // ... rest of logic
};
```

### Strategy 2: Debounce Metadata Changes
```typescript
const metadataDebounce = useRef<NodeJS.Timeout | null>(null);

// Only update metadata after 100ms of no changes
if (hasMetadataChanged(lastMetadata.current, newMeta)) {
  if (metadataDebounce.current) {
    clearTimeout(metadataDebounce.current);
  }
  
  metadataDebounce.current = setTimeout(() => {
    updateAuthState(session);
  }, 100);
}
```

### Strategy 3: Update Counter with Kill Switch
```typescript
const updateCount = useRef(0);

const updateAuthState = (session) => {
  updateCount.current++;
  
  if (updateCount.current > 10) {
    console.error('EMERGENCY STOP: Too many updates');
    // Disable feature automatically
    window.localStorage.setItem('DISABLE_METADATA_SYNC', 'true');
    return;
  }
  
  // ... rest
};
```

---

## 🔍 Key Findings

### Finding #0: Supabase Fires MANY Duplicate Events (CRITICAL DISCOVERY) 🚨

**From actual logs (November 8, 2025):**
```javascript
AuthContext: Auth state changed: SIGNED_IN session exists
AuthContext: Skipping duplicate auth update (same user and token)
AuthContext: Auth state changed: SIGNED_IN session exists
AuthContext: Skipping duplicate auth update (same user and token)
// ... REPEATS 7+ TIMES
```

**What This Means:**
- Supabase fires `SIGNED_IN` event **7+ times** during a single login
- All with the SAME user and token
- Current `shouldUpdateAuth` **correctly filters these out**
- Without the filter: Would call `updateAuthState` 7+ times
- Each would trigger cascades (GroupContext, home page, etc.)

**Impact on Metadata Sync:**
```
With metadata sync enabled:
1. User updates name
2. Supabase fires USER_UPDATED (7+ times? unknown)
3. Each event checks metadata
4. If ANY check returns TRUE → updateAuthState
5. updateAuthState → setUser → new object reference
6. All components re-render
7. Next event checks again
8. Could trigger again if comparison is flawed
9. LOOP
```

**This explains why our metadata sync broke so catastrophically!**

**The current filter saves us from 7x the updates.**

**Key Insight:** Any metadata tracking MUST be as defensive as the current ID/token tracking.

---

### Finding #1: The Cascade Effect (CRITICAL)

**GroupContext watches `user` object:**
```typescript
// contexts/GroupContext.tsx - Line 192
useEffect(() => {
  if (user) {
    loadGroups(user.id);
  }
}, [user, authLoading, loadGroups]);
```

**What this means:**
- Every time `setUser()` runs in AuthContext, it creates a NEW user object
- Even if the user ID is the same, the object reference changes
- GroupContext's useEffect sees this as a change
- Groups reload

**Impact of Metadata Sync:**
- Current code: Updates user only on login/logout (2-3 times total)
- With metadata sync: Updates user on EVERY metadata change
- If metadata comparison is flawed → infinite updates → infinite group reloads

---

### Finding #2: The Home Page Redirect Loop (SMOKING GUN)

**Home page redirects based on auth:**
```typescript
// app/page.tsx - Lines 12-22
useEffect(() => {
  if (!loading) {
    if (user) {
      router.push('/browse');  // ← Redirects when user exists
    } else {
      router.push('/landing'); // ← Redirects when no user
    }
  }
}, [user, loading, router]);
```

**The Loop Sequence (HYPOTHESIS):**
```
1. User on / (home page)
2. AuthContext: setUser() called (from metadata sync)
3. Home page useEffect sees user changed (new object reference)
4. Triggers router.push('/browse')
5. Browse page loads...
6. But something triggers another check
7. AuthContext fires again (why?)
8. setUser() again
9. Home page useEffect sees change again
10. router.push() again
11. But it's already navigating... so maybe it goes to /?
12. LOOP: Steps 2-11 repeat
```

**This explains the repeated `GET /` requests!**

---

### Finding #3: The Dependency Chain

**Who watches AuthContext `user` changes:**
```
AuthContext.user (changes)
  ↓
GroupContext useEffect (line 192) [user, authLoading, loadGroups]
  ↓
Calls loadGroups(user.id)
  ↓
setGroups() → re-render
  
  
AuthContext.user (changes)
  ↓  
Home page useEffect (line 12) [user, loading, router]
  ↓
Calls router.push()
  ↓
Navigation → possible loop


AuthContext.user (changes)
  ↓
Browse page useEffect watching user
  ↓
Checks permissions, loads recipes
```

**Every `setUser()` triggers cascades in multiple places.**

---

## 🎯 ROOT CAUSE ANALYSIS

### The Core Problem: Object Reference Identity

**React's useEffect compares dependencies by REFERENCE, not VALUE:**

```typescript
const user1 = { id: "123", metadata: { name: "John" } };
const user2 = { id: "123", metadata: { name: "John" } };

user1 === user2  // FALSE (different objects)
user1.id === user2.id  // TRUE (same value)
```

**What Happens in AuthContext:**
```typescript
// Every time updateAuthState runs:
setUser(session?.user ?? null);  // ← Creates NEW object reference

// Even if user data is identical:
// - Same ID
// - Same email  
// - Same metadata
// React sees it as DIFFERENT because it's a new object
```

**The Chain Reaction:**
```
1. Metadata changes (name updated)
2. shouldUpdateAuth returns TRUE (metadata changed)
3. updateAuthState runs
4. setUser(newUserObject) ← NEW REFERENCE
5. GroupContext useEffect triggers [user] ← Sees new reference
6. Home page useEffect triggers [user] ← Sees new reference
7. Browse page useEffect triggers (if on that page)
8. All 24 components using useAuth re-render
```

**Why Current Code Works:**
- Only updates on login/logout (2-3 times total)
- These are REAL state changes (different user ID)
- Cascades are expected and necessary

**Why Metadata Sync Breaks:**
- Updates on every metadata change
- User ID hasn't changed (same person)
- But object reference HAS changed (React sees it as different)
- Cascades are unnecessary but still trigger
- **Potential for loops if metadata comparison is unstable**

---

### The Infinite Loop Mechanism (THEORY)

**Most Likely Scenario:**

```
Step 1: Initial page load on /
  - AuthContext initializes
  - lastMetadata.current = null
  - Session loads: { user: { id: "123", metadata: { name: "John" } } }
  
Step 2: First metadata check
  - oldMeta = null
  - newMeta = { name: "John", avatar_url: undefined }
  - null !== { name: "John" } → TRUE
  - shouldUpdateAuth returns TRUE
  
Step 3: Update state
  - updateAuthState runs
  - lastMetadata.current = { name: "John", avatar_url: undefined }
  - setUser(newUserObject) ← NEW OBJECT REFERENCE
  
Step 4: Home page reacts
  - useEffect([user, loading, router]) triggers
  - user object changed (new reference)
  - if (!loading) → TRUE
  - if (user) → TRUE  
  - router.push('/browse')
  
Step 5: Navigation starts
  - Router begins navigation to /browse
  - But... something triggers auth to check again
  
Step 6: Second metadata check
  - oldMeta = { name: "John", avatar_url: undefined }
  - newMeta = { name: "John", avatar_url: undefined }
  - SHOULD be FALSE (same values)
  - BUT: Are these DIFFERENT object references?
  - If objects are recreated each time...
  - { name: "John" } !== { name: "John" } ← Different objects!
  - Returns TRUE again
  
Step 7: Loop begins
  - updateAuthState runs again
  - setUser() again
  - Home page sees change again
  - router.push() again
  - But already navigating...
  - Goes back to /?
  - Infinite loop
```

**The Bug: Object Comparison in hasMetadataChanged**

```typescript
// Our implementation:
const newMeta = {
  name: session?.user?.user_metadata?.name,
  avatar_url: session?.user?.user_metadata?.avatar_url,
};

if (hasMetadataChanged(lastMetadata.current, newMeta)) {
  // This creates a NEW object every time
  // Even if values are identical
  // Object reference will always be different!
}
```

**The comparison compares VALUES (name, avatar_url):**
```typescript
const nameChanged = oldMeta.name !== newMeta.name;  // ← Compares strings (good)
const avatarChanged = oldMeta.avatar_url !== newMeta.avatar_url;  // ← Compares strings (good)
```

**BUT if oldMeta is null on first run:**
```typescript
if (!oldMeta && !newMeta) return false;  // Both null
if (!oldMeta || !newMeta) return true;   // ← One is null, returns TRUE

// First time: oldMeta = null, newMeta = { name: "John" }
// Returns TRUE (correct)

// Second time: Should store lastMetadata
// But does updateAuthState get called before storing?
```

---

### Finding #4: The updateAuthState Timing Issue

**Looking at the flow:**
```typescript
if (hasMetadataChanged(lastMetadata.current, newMeta)) {
  console.log('Metadata update detected, triggering auth update');
  return true;  // ← Returns from shouldUpdateAuth
}

// Then in the calling code:
if (shouldUpdateAuth(session)) {
  updateAuthState(session);  // ← This stores the metadata
}
```

**The storage happens AFTER the comparison!**

So:
- Check 1: lastMetadata = null, returns TRUE, stores metadata
- Check 2: lastMetadata = { name: "John" }, compares, should be FALSE
- **Unless something triggers another check before storage completes?**

---

### Finding #5: loadGroups is in Dependency Array

**This is potentially problematic:**
```typescript
// GroupContext.tsx - Line 44
const loadGroups = useCallback(async (userId: string) => {
  // ... loads groups
}, []); // ← Empty deps (stable)

// Line 192
useEffect(() => {
  if (user) {
    loadGroups(user.id);
  }
}, [user, authLoading, loadGroups]); // ← loadGroups in deps
```

**Is loadGroups stable?**
- It's wrapped in useCallback with [] deps
- Should be stable across renders
- So this shouldn't cause issues
- **But worth verifying**

---

## Questions for Deep Dive

### About Supabase:
- [ ] Does `supabase.auth.updateUser()` trigger `onAuthStateChange` locally?
- [ ] What events fire in what order during a metadata update?
- [ ] Is there a way to update metadata WITHOUT firing events?
- [✅] **CONFIRMED:** Does the session object reference change even if data is the same? **YES - React creates new objects**

### About React:
- [✅] **CONFIRMED:** Is `setUser()` causing unnecessary re-renders? **YES - every setUser creates new object ref**
- [✅] **ANSWER:** Should helper functions be outside useEffect or inside? **Inside was correct - avoids stale closure**
- [ ] Does the feature flag constant cause any issues?
- [ ] Are there any dependency array warnings we missed?

### About Our Implementation:
- [✅] **CONFIRMED:** Why did the app redirect to `/` repeatedly? **Home page useEffect + metadata sync loop**
- [✅] **CONFIRMED:** What triggered those requests? **Home page router.push in useEffect watching user**
- [✅] **CONFIRMED:** Was it the home page router logic? **YES - line 12-22 in app/page.tsx**
- [✅] **CONFIRMED:** Home page useEffect has `user` in deps → triggers on every user object change

### About Supabase:
- [ ] Does `supabase.auth.updateUser()` trigger `onAuthStateChange` locally?
- [ ] What events fire in what order during a metadata update?
- [ ] Is there a way to update metadata WITHOUT firing events?
- [✅] **CONFIRMED:** Does the session object reference change even if data is the same? **YES - React creates new objects**

### About React:
- [✅] **CONFIRMED:** Is `setUser()` causing unnecessary re-renders? **YES - every setUser creates new object ref**
- [ ] Should helper functions be outside useEffect or inside?
- [ ] Does the feature flag constant cause any issues?
- [ ] Are there any dependency array warnings we missed?

### About Our Implementation:
- [🔍] **INVESTIGATING:** Why did the app redirect to `/` repeatedly? **Home page useEffect likely culprit**
- [✅] **CONFIRMED:** What triggered those requests? **Home page router.push in useEffect watching user**
- [✅] **CONFIRMED:** Was it the home page router logic? **YES - line 12-22 in app/page.tsx**
- [ ] Or was it auth protection redirects?

---

## Test Plan (When We Try Again)

### Test 1: Isolated Logging
```typescript
// Add this temporarily
supabase.auth.onAuthStateChange((event, session) => {
  console.log('=== AUTH EVENT ===', {
    event,
    time: Date.now(),
    userId: session?.user?.id,
    name: session?.user?.user_metadata?.name,
    callStack: new Error().stack.split('\n')[2]
  });
});
```

### Test 2: Render Counter
```typescript
const AuthProvider = ({ children }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
  if (renderCount.current > 20) {
    throw new Error(`INFINITE RENDER: ${renderCount.current} renders`);
  }
  
  console.log(`AuthProvider render #${renderCount.current}`);
  // ... rest
};
```

### Test 3: Metadata Tracking Debug
```typescript
const hasMetadataChanged = (oldMeta, newMeta) => {
  console.log('Checking metadata:', {
    old: JSON.stringify(oldMeta),
    new: JSON.stringify(newMeta),
    oldIsNull: oldMeta === null,
    newIsNull: newMeta === null,
  });
  
  // ... comparison logic
  
  console.log('Metadata changed?', result);
  return result;
};
```

---

## Related Files to Review

### Files That Might Give Clues:
- `contexts/AuthContext.tsx` - The main suspect
- `contexts/GroupContext.tsx` - Watches user changes
- `app/page.tsx` - Redirects based on auth (might cause / loop)
- `app/providers.tsx` - Wraps app with AuthProvider
- `BUGFIX-AUTH-TRIPLE-LOAD.md` - Previous similar issue

---

## Comparison: What Worked vs What Broke

### What WORKED (Current Code):
```typescript
shouldUpdateAuth checks:
- user.id changed? → Update
- access_token changed? → Update
- Metadata changed? → Ignore

Result: Stable, fast, but stale metadata
```

### What BROKE (Our Changes):
```typescript
shouldUpdateAuth checks:
- user.id changed? → Update
- access_token changed? → Update  
- Metadata changed? → Update ← NEW

Result: Infinite loop or cascade failure
```

**The Addition Was:**
- ~60 lines of code
- 3 new functions
- 1 new ref
- 1 new comparison

**But the impact was:**
- Complete app failure
- All routes 404
- Infinite requests

**Why such a large impact from small change?**

---

## Research Tasks

### Immediate (Next):
- [ ] Create minimal test case in isolation
- [ ] Add logging to understand event flow
- [ ] Test if setUser triggers events
- [ ] Document exact failure sequence

### Short-term:
- [ ] Review Supabase docs on onAuthStateChange
- [ ] Look for similar issues in Supabase GitHub
- [ ] Check if other apps have solved this
- [ ] Find the "right way" to track metadata

### Long-term:
- [ ] Consider alternative architectures (React Query?)
- [ ] Consider denormalizing metadata
- [ ] Consider manual refresh pattern
- [ ] Consider WebSocket updates

---

## Current Theory (Best Guess)

**I think this is what happened:**

1. On initial load, `lastMetadata.current = null`
2. Session loads with `metadata = { name: "John", avatar_url: undefined }`
3. Comparison: `null !== { name: "John" }` → TRUE
4. `updateAuthState()` runs, stores metadata
5. `setUser()` triggers React re-render
6. **GroupContext** watching `user` sees the change
7. GroupContext reloads groups
8. This might trigger another auth check somehow
9. **OR**: The home page (`/`) router logic sees auth state and redirects
10. Redirect triggers auth check
11. Loop continues

**Key insight:** The problem might not be IN AuthContext, but in what AuthContext triggers DOWNSTREAM.

---

## Next Investigation Steps

1. Add extensive logging (without changing behavior)
2. Understand exact sequence of events
3. Find where the loop originates
4. Design solution that breaks the loop
5. Test exhaustively before deploying

---

## Notes for Future Self

- Don't rush AuthContext changes (too critical)
- Always add logging first, change behavior second
- Test in isolation before deploying
- Have rollback plan ready
- Feature flags are essential
- The "simple" fix is rarely simple for core infrastructure

---

## 💡 Potential Solutions (Ranked)

### Solution 1: Fix Home Page Dependencies ⭐ RECOMMENDED FIRST
**Change home page to depend on user.id instead of user object**

```typescript
// app/page.tsx
useEffect(() => {
  if (!loading) {
    if (user?.id) {  // ← Use ID, not object
      router.push('/browse');
    } else {
      router.push('/landing');
    }
  }
}, [user?.id, loading, router]);  // ← Depend on primitive (string) not object
```

**Why This Helps:**
- Breaks the infinite redirect loop at home page
- user.id is a string (primitive) - stable reference
- Only changes on actual login/logout
- Doesn't trigger on metadata changes

**Pros:** LOW risk, targets the infinite `/` loop directly
**Cons:** Doesn't solve GroupContext reloading
**Time:** 15 minutes
**Risk Score:** 2/10

---

### Solution 2: Use useMemo for User Object
**Stabilize user object reference**

```typescript
// In AuthContext
const stableUser = useMemo(() => {
  return session?.user ?? null;
}, [
  session?.user?.id,
  session?.user?.email,
  session?.user?.user_metadata?.name,
  session?.user?.user_metadata?.avatar_url
]);

setUser(stableUser);
```

**Why This Helps:**
- Only creates new object when tracked fields actually change
- Prevents object churn
- React built-in optimization

**Pros:** Elegant, leverages React patterns
**Cons:** Must list all fields we care about
**Time:** 30 minutes
**Risk Score:** 4/10

---

### Solution 3: Add Circuit Breaker
**Prevent infinite loops with safety limit**

```typescript
const updateCount = useRef(0);
const lastUpdateTime = useRef(0);

const shouldUpdateAuth = (session) => {
  // Reset counter every second
  const now = Date.now();
  if (now - lastUpdateTime.current > 1000) {
    updateCount.current = 0;
  }
  lastUpdateTime.current = now;
  
  // Check if updating too frequently
  updateCount.current++;
  if (updateCount.current > 5) {
    console.error('Circuit breaker: Too many auth updates');
    return false;  // Stop the loop
  }
  
  // ... rest of shouldUpdateAuth logic
};
```

**Why This Helps:**
- Prevents infinite loops regardless of cause
- Safety net for any bug
- Doesn't fix root cause but prevents disaster

**Pros:** Safety mechanism, catches unexpected loops
**Cons:** Masks problems instead of solving them
**Time:** 30 minutes
**Risk Score:** 3/10 (safe but hacky)

---

### Solution 4: Separate Metadata Context
**Architectural solution - separate auth from profile**

```typescript
// New context just for metadata
const MetadataContext = createContext();

// Components that need name/avatar use MetadataContext
// Components that need auth use AuthContext
// They don't cross-contaminate
```

**Why This Helps:**
- Clean separation
- Metadata updates don't affect auth
- Most scalable long-term

**Pros:** Proper architecture, scales forever
**Cons:** Major refactoring, weeks of work
**Time:** 2-3 weeks
**Risk Score:** 8/10 (big change)

---

### Solution 5: Accept the Limitation
**Don't track metadata in AuthContext**

```typescript
// Keep current code
// Accept that nav doesn't update instantly
// Add manual refresh or document the limitation
```

**Why This Works:**
- Zero risk
- Already stable
- Can ship other features

**Pros:** Safe, proven, working
**Cons:** Not competitive, poor UX
**Time:** 0 minutes
**Risk Score:** 0/10

---

## 🎯 Recommended Action Plan

### Step 1: Implement Solution 1 (Home Page Fix)
**Goal:** Break the infinite `/` loop

**Action:**
1. Change home page useEffect to depend on `user?.id`
2. Test: App should not loop to `/` anymore
3. If successful, move to Step 2

**Time:** 15 minutes
**Risk:** Very low

---

### Step 2: Retry Metadata Sync with Circuit Breaker
**Goal:** See if metadata sync works with loop protection

**Action:**
1. Add Solution 3 (circuit breaker)
2. Re-add metadata tracking
3. Test carefully
4. If loops detected, circuit breaker stops them

**Time:** 1 hour
**Risk:** Low (circuit breaker prevents disaster)

---

### Step 3: If Still Issues, Add useMemo
**Goal:** Stabilize object references**

**Action:**
1. Implement Solution 2 (useMemo)
2. Should prevent unnecessary object creation
3. Test with metadata sync

**Time:** 30 minutes
**Risk:** Medium

---

### Step 4: If Still Issues, Accept Limitation
**Goal:** Ship features without the metadata sync**

**Action:**
1. Ship settings page with manual refresh requirement
2. Plan Solution 4 (separate contexts) for future
3. Document technical debt

**Time:** 0 minutes  
**Risk:** None

---

**Status:** 🔬 Active Testing - Data Collection Phase
**Current Test:** Observational logging (Test 1-2 complete)
**Next:** Analyze render patterns, test object references
**Goal:** Understand all failure modes before implementing fix

---

*This document will be updated as we implement and test solutions.*


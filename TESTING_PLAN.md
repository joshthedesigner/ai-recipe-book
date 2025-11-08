# Metadata Sync Testing Plan - Pressure Test Hypotheses

**Goal:** Confirm root cause with reversible experiments before implementing fixes  
**Strategy:** Add logging only, no behavior changes, easy to revert

---

## Test 1: Confirm Home Page is the Culprit

### Hypothesis:
Home page's `useEffect([user, loading, router])` triggers on every user object change, causing redirect loop.

### Test:
**Add logging to home page (NO behavior change)**

```typescript
// app/page.tsx
useEffect(() => {
  console.log('🏠 HOME PAGE EFFECT TRIGGERED', {
    hasUser: !!user,
    userId: user?.id,
    loading,
    timestamp: Date.now(),
    userObjectRef: user, // See the object
  });
  
  if (!loading) {
    if (user) {
      console.log('🏠 HOME PAGE: Redirecting to /browse');
      router.push('/browse');
    } else {
      console.log('🏠 HOME PAGE: Redirecting to /landing');
      router.push('/landing');
    }
  }
}, [user, loading, router]);
```

### Expected Result:
- If our hypothesis is correct: This will log on EVERY setUser() call
- We'll see how many times it triggers

### How to Revert:
```bash
# Just remove the console.logs
# Or: git checkout app/page.tsx
```

**Risk:** ZERO (only adds logging)

---

## Test 2: Count AuthContext Updates

### Hypothesis:
Metadata sync causes too many `setUser()` calls

### Test:
**Add counter to AuthContext (NO behavior change)**

```typescript
// contexts/AuthContext.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const updateCounter = useRef(0);
  const renderCounter = useRef(0);
  
  // Track renders
  renderCounter.current++;
  console.log(`🔄 AuthProvider render #${renderCounter.current}`);
  
  // In updateAuthState function:
  const updateAuthState = (session: Session | null) => {
    updateCounter.current++;
    console.log(`🔐 updateAuthState call #${updateCounter.current}`, {
      userId: session?.user?.id,
      hasUser: !!session?.user,
      timestamp: Date.now(),
    });
    
    lastUserId.current = session?.user?.id ?? null;
    lastAccessToken.current = session?.access_token ?? null;
    setUser(session?.user ?? null);
  };
  
  // ... rest stays the same
}
```

### Expected Result:
- Current (no metadata sync): 2-3 updates on page load
- With metadata sync: Would see many more

### How to Revert:
```bash
git checkout contexts/AuthContext.tsx
```

**Risk:** ZERO (only adds logging)

---

## Test 3: Track User Object References

### Hypothesis:
Every `setUser()` creates a different object reference, even if data is same

### Test:
**Log object references**

```typescript
// contexts/AuthContext.tsx
const updateAuthState = (session: Session | null) => {
  const newUser = session?.user ?? null;
  const oldUserRef = user;  // Current user in state
  
  console.log('👤 USER OBJECT COMPARISON', {
    sameReference: oldUserRef === newUser,
    sameId: oldUserRef?.id === newUser?.id,
    sameName: oldUserRef?.user_metadata?.name === newUser?.user_metadata?.name,
    oldRef: oldUserRef,
    newRef: newUser,
  });
  
  lastUserId.current = session?.user?.id ?? null;
  lastAccessToken.current = session?.access_token ?? null;
  setUser(newUser);
};
```

### Expected Result:
- sameReference: FALSE (confirms new objects)
- sameId: TRUE (same user)
- sameName: TRUE (same data)

### How to Revert:
```bash
git checkout contexts/AuthContext.tsx
```

**Risk:** ZERO (only adds logging)

---

## Test 4: GroupContext Reaction Test

### Hypothesis:
GroupContext reloads on every user object change

### Test:
**Add counter to GroupContext**

```typescript
// contexts/GroupContext.tsx
export function GroupProvider({ children }: { children: ReactNode }) {
  const effectTriggerCount = useRef(0);
  
  useEffect(() => {
    effectTriggerCount.current++;
    console.log(`🔄 GroupContext effect trigger #${effectTriggerCount.current}`, {
      hasUser: !!user,
      userId: user?.id,
      authLoading,
      timestamp: Date.now(),
    });
    
    // ... rest of existing code
  }, [user, authLoading, loadGroups]);
}
```

### Expected Result:
- Current: 1 trigger on page load
- With metadata sync: Would trigger on every metadata change

### How to Revert:
```bash
git checkout contexts/GroupContext.tsx
```

**Risk:** ZERO (only adds logging)

---

## Test 5: Simulate Metadata Sync (Controlled)

### Hypothesis:
Adding metadata tracking will cause the issues we documented

### Test:
**Add metadata tracking BUT with feature flag OFF by default**

```typescript
// contexts/AuthContext.tsx
const ENABLE_METADATA_SYNC = false;  // ← Hardcoded FALSE for testing

// ... add all the metadata tracking code ...

// But it won't run because flag is false
```

Then:
1. Test app works normally (flag false)
2. Set flag to true in browser console
3. Watch what happens
4. Can immediately set back to false if breaks

### Test in Browser Console:
```javascript
// Enable it
localStorage.setItem('forceMetadataSync', 'true');
location.reload();

// If it breaks, disable it
localStorage.setItem('forceMetadataSync', 'false');
location.reload();
```

### How to Revert:
```bash
git checkout contexts/AuthContext.tsx
```

**Risk:** LOW (feature flagged, can toggle off)

---

## Test 6: Test user?.id Fix (Safe Experiment)

### Hypothesis:
Changing dependencies from `user` to `user?.id` prevents cascade

### Test:
**Just change home page first (most isolated)**

```typescript
// app/page.tsx - ONLY change this file
useEffect(() => {
  if (!loading) {
    if (user?.id) {  // ← Changed
      router.push('/browse');
    } else {
      router.push('/landing');
    }
  }
}, [user?.id, loading, router]);  // ← Changed
```

### Expected Result:
- Home page shouldn't trigger on metadata changes
- Should only trigger on login/logout (user.id changes)

### Test Steps:
1. Make this ONE change
2. Start app
3. Try to break it (navigate around, refresh)
4. If stable, we confirmed home page was the issue
5. If still breaks, something else is wrong

### How to Revert:
```bash
git checkout app/page.tsx
# Just one file, instant revert
```

**Risk:** VERY LOW (one file, simple change)

---

## Recommended Test Order

### Round 1: Observation Only (30 min)
```
✅ Test 1: Add home page logging
✅ Test 2: Add AuthContext counters
✅ Test 3: Track object references
✅ Test 4: Add GroupContext counter

Run app, navigate around, look at console
Gather data without changing behavior
```

### Round 2: Controlled Test (15 min)
```
✅ Test 6: Change home page to user?.id
See if app stays stable
If yes: We confirmed the fix!
If no: More investigation needed
```

### Round 3: Full Test (if Round 2 works)
```
✅ Add metadata sync with circuit breaker
✅ Test with feature flag
✅ Monitor carefully
```

---

## Success Criteria

### We'll know our analysis is correct if:

**After Test 1 (Home page logging):**
- [ ] Console shows home page effect triggering multiple times
- [ ] Triggers even when user ID hasn't changed
- [ ] Correlates with any loops/issues

**After Test 6 (user?.id fix):**
- [ ] Home page effect only triggers on login/logout
- [ ] No infinite redirects
- [ ] App stays stable

**If both pass:**
- ✅ Root cause confirmed
- ✅ Solution validated
- ✅ Safe to proceed with full implementation

---

## Rollback Speed

| Test | Revert Time | Method |
|------|-------------|---------|
| Test 1-4 (logging) | 5 seconds | Delete console.logs |
| Test 5 (flagged) | 2 seconds | Toggle flag false |
| Test 6 (user?.id) | 10 seconds | git checkout app/page.tsx |

**All tests are instantly reversible!**

---

## What to Watch For

### Good Signs:
- ✅ Console logs appear as expected
- ✅ Counters show reasonable numbers (< 5)
- ✅ App stays stable
- ✅ No infinite loops

### Bad Signs:
- ❌ Console spam (hundreds of logs)
- ❌ Counters exceed 20
- ❌ App freezes
- ❌ 404 loops return

---

**Want to start with Test 1?** We'll just add logging to the home page to see if it's really triggering the loop. Totally safe, easily reversible! 🧪


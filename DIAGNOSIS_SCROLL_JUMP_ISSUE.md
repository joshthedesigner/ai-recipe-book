# Diagnosis: Scroll Jump Issue - Still Occurring After Initial Fix

## Problem
Scroll position preservation was implemented, but the recipe list still jumps when adding a new recipe.

## Current Implementation

### Flow When Recipe is Added:
1. User adds recipe in sidebar → `handleConfirmRecipe` in RecipeSidebar
2. Recipe saved to database
3. `onRecipeAdded()` callback called
4. `handleRecipeAdded()` in browse/page.tsx:
   - Saves scroll position: `scrollPositionRef.current = window.scrollY`
   - Calls `fetchRecipes(true, true)` (silent, no cache)
5. `fetchRecipes` runs asynchronously:
   - Makes API call
   - Sets state: `setRecipes`, `setFilteredRecipes`, `setTotalRecipeCount`, etc.
6. `filteredRecipes` changes → triggers useEffect
7. useEffect:
   - Sets `displayedRecipes`
   - Restores scroll: `requestAnimationFrame(() => window.scrollTo(...))`

## Root Cause Analysis

### Issue 1: Timing - Single RAF is Too Early
- `requestAnimationFrame` ensures DOM has been updated by React
- BUT images haven't loaded yet (async)
- Layout hasn't stabilized yet
- Browser might not have completed full layout calculation

### Issue 2: Images Loading After Scroll Restoration
- Recipe cards contain images
- Images load asynchronously after DOM renders
- When images load, cards expand, page height increases
- Scroll position becomes incorrect (relative to content that shifted)

### Issue 3: Grid Layout Recalculation
- Material-UI Grid recalculates layout on render
- New recipe added at top pushes all cards down
- Grid layout happens after scroll restoration
- Causes visual jump

### Issue 4: Scroll Position Saved While Sidebar Open
- When sidebar is open, `window.scrollY` might be 0 or stale
- User might not even be viewing the browse page
- Scroll position saved might not reflect actual viewport position

## Evidence

### Current Code:
```typescript
// Save scroll position
scrollPositionRef.current = window.scrollY;

// Restore scroll position (in useEffect)
if (scrollPositionRef.current !== null) {
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollPositionRef.current!);
    scrollPositionRef.current = null;
  });
}
```

### Problem:
- Single `requestAnimationFrame` runs immediately after React render
- Images start loading after this
- Layout shifts when images load
- Scroll position becomes incorrect

## Recommended Solution

### Option 1: Double RAF (Simple, Effective)
Use nested `requestAnimationFrame` to delay scroll restoration until after browser layout is complete:

```typescript
if (scrollPositionRef.current !== null) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current!);
      scrollPositionRef.current = null;
    });
  });
}
```

**Why this works:**
- First RAF: React has updated DOM
- Second RAF: Browser has completed layout calculation
- Images might still load, but layout is more stable

**Pros:** Simple, minimal code change
**Cons:** Doesn't fully address image loading

### Option 2: Double RAF + Small Delay (Better)
Add a small timeout to allow images to start loading:

```typescript
if (scrollPositionRef.current !== null) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current!);
        scrollPositionRef.current = null;
      }, 50); // Small delay for images to start loading
    });
  });
}
```

**Pros:** Allows images to start loading before restoration
**Cons:** Adds 50ms delay (might be noticeable)

### Option 3: Maintain Scroll Relative to Reference Element (Complex, Best)
Instead of absolute scroll position, maintain position relative to a reference recipe:

1. Before update: Find first visible recipe card
2. Store its ID and its position relative to viewport
3. After update: Find same recipe card
4. Scroll so it's in the same relative position

**Pros:** Works even with layout shifts
**Cons:** Complex, requires DOM queries

## Recommended Approach

**Start with Option 1 (Double RAF)** - it's simple and likely fixes most cases.

If that doesn't fully solve it, move to Option 2 (add small delay).

Only use Option 3 if the problem persists (unlikely).

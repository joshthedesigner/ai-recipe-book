# Navigation Resize Issue Diagnosis

## Problem
When navigating from "Your Recipes" to another nav item, the navigation items move around because "Your Recipes" resizes. This doesn't happen with other nav items.

## Root Cause Analysis

### Current Implementation (`components/DesktopNav.tsx`)

**"Your Recipes" Button (lines 153-189):**
```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
    fontWeight: (pathname === '/browse' && activeGroup?.isOwn) ? 600 : 400,  // ⚠️ CHANGES
  }}
>
  Your Recipes
</Typography>
```

**"Feed" Button (lines 193-229):**
```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    color: pathname === '/feed' ? 'text.primary' : 'text.secondary',
    fontWeight: pathname === '/feed' ? 600 : 400,  // ⚠️ CHANGES
  }}
>
  Feed
</Typography>
```

**"Friends" Button (lines 234-290):**
```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    color: pathname === '/friends' ? 'text.primary' : 'text.secondary',
    fontWeight: pathname === '/friends' ? 600 : 400,  // ⚠️ CHANGES
  }}
>
  Friends
</Typography>
```

### The Issue

All nav items change `fontWeight` from `400` (regular) to `600` (semi-bold) when active. However, **"Your Recipes"** is likely experiencing more noticeable resize because:

1. **Text Length**: "Your Recipes" is longer (13 characters) than "Feed" (4) or "Friends" (7), so the width change is more noticeable
2. **Conditional Logic**: "Your Recipes" has a more complex condition `(pathname === '/browse' && activeGroup?.isOwn)` which might cause it to toggle more frequently
3. **Layout Impact**: When "Your Recipes" is active and bold, it takes more horizontal space. When you navigate away, it shrinks back to regular weight, causing other nav items to shift left

### Why Other Items Don't Seem to Have This Issue

- **"Feed"** (4 chars): Shorter text = less noticeable width change
- **"Friends"** (7 chars): Medium length, but might have badge that provides visual anchor
- **"Your Recipes"** (13 chars): Longest text = most noticeable width change

## Proposed Fixes

### Option 1: Fixed Width (Recommended)
Reserve space for the bold text even when inactive by using a fixed or minimum width:

```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
    fontWeight: (pathname === '/browse' && activeGroup?.isOwn) ? 600 : 400,
    minWidth: 'fit-content', // Or specific width like '110px'
    display: 'inline-block',
  }}
>
  Your Recipes
</Typography>
```

**Better approach - use invisible bold text to reserve space:**
```tsx
<Box sx={{ position: 'relative', display: 'inline-block' }}>
  {/* Invisible bold text to reserve space */}
  <Typography
    variant="body2"
    sx={{
      fontSize: '14px',
      fontWeight: 600,
      visibility: 'hidden',
      height: 0,
      overflow: 'hidden',
    }}
  >
    Your Recipes
  </Typography>
  {/* Actual visible text */}
  <Typography
    variant="body2"
    sx={{
      fontSize: '14px',
      color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
      fontWeight: (pathname === '/browse' && activeGroup?.isOwn) ? 600 : 400,
      position: 'absolute',
      top: 0,
      left: 0,
    }}
  >
    Your Recipes
  </Typography>
</Box>
```

### Option 2: Consistent Font Weight
Keep font weight consistent and use other visual indicators for active state:

```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
    fontWeight: 600, // Always bold
    // Or use 400 for all, and rely on color + underline indicator
  }}
>
  Your Recipes
</Typography>
```

### Option 3: CSS Text Shadow Trick
Use text-shadow to simulate bold without changing width (less reliable):

```tsx
<Typography
  variant="body2"
  sx={{
    fontSize: '14px',
    fontWeight: 400, // Always regular
    color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
    textShadow: (pathname === '/browse' && activeGroup?.isOwn) 
      ? '0.5px 0 0 currentColor' 
      : 'none', // Simulate bold with shadow
  }}
>
  Your Recipes
</Typography>
```

### Option 4: Apply Fix to All Nav Items
For consistency, apply the same fix to all navigation items (Feed, Friends, Your Recipes):

```tsx
// Create a reusable component or helper
const NavText = ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => (
  <Box sx={{ position: 'relative', display: 'inline-block' }}>
    <Typography
      variant="body2"
      sx={{
        fontSize: '14px',
        fontWeight: 600,
        visibility: 'hidden',
        height: 0,
      }}
    >
      {children}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontSize: '14px',
        color: isActive ? 'text.primary' : 'text.secondary',
        fontWeight: isActive ? 600 : 400,
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </Typography>
  </Box>
);
```

## Recommendation

**Use Option 1 (Fixed Width with Invisible Bold Text)** - This is the most reliable solution that:
- ✅ Prevents layout shift
- ✅ Maintains visual design (bold when active)
- ✅ Works consistently across all screen sizes
- ✅ Doesn't require changing the visual design

Apply this fix to all nav items for consistency, not just "Your Recipes".


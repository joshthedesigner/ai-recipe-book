# Dish Matching Analysis

## Current Implementation

### How Dish Matching Works

1. **Title Check**: Checks if cuisine name appears in title (worth 3 points)
   - Example: "Japanese Sake Steamed Clams" → checks for "japanese" in title

2. **Dish Matching**:
   - Checks if dish names from config appear in the **combined text** (title + ingredients + steps)
   - Dish in title: 5 points each
   - Dish elsewhere: 2 points each
   - Example: "shawarma" in title → 5 points for Middle Eastern

3. **Ingredient Matching**:
   - Checks if ingredients from config appear in combined text
   - Each match: 1 point
   - Example: cumin, turmeric, coriander → each = 1 point

### The Problem with "Shawarma Pargiyot"

**Current Scoring:**
- **Middle Eastern**: 
  - "shawarma" in title = 5 points
  - cumin (1) + coriander (1) + cardamom (1) = 3 points
  - **Total: 8 points**

- **Indian**:
  - cumin (1) + turmeric (1) + coriander (1) + cardamom (1) + cinnamon (1) + cloves (1) + ginger (1) = 7 points
  - **Total: 7 points**

**Expected**: Middle Eastern should win (8 > 7)
**Actual**: Still showing as Indian

## Possible Issues

### Issue 1: Dish Matching Not Working
The dish "shawarma" might not be matching correctly. Let me check:
- Is "shawarma" in the Middle Eastern dishes list? ✅ Yes (line 312)
- Is the matching case-sensitive? Should be lowercase
- Is it matching the full word or substring?

### Issue 2: Title Check Logic
The title check for cuisine name only looks for exact cuisine name:
- "middle eastern" in title? No
- But "shawarma" is a Middle Eastern dish - should that count as a strong signal?

### Issue 3: Ingredient Overlap
Many cuisines share spices:
- Indian: cumin, turmeric, coriander, cardamom, cinnamon, cloves, ginger
- Middle Eastern: cumin, coriander, cardamom (but also tahini, sumac, za'atar)
- The shared spices are causing false positives

## Better Approach: Dish-First Detection

### Option 1: Dish Name Override
If a dish name appears in the title, that cuisine should win regardless of ingredient matches.

**Logic:**
```typescript
// First, check for dish matches in title
const dishInTitle = config.dishes.find(dish => 
  titleLower.includes(dish.toLowerCase())
);

if (dishInTitle) {
  // This cuisine has a dish in the title - very strong signal
  // Should override ingredient-based matches
  return { cuisine: config.name, score: 100 }; // Very high score
}
```

### Option 2: Weighted Scoring
Give dish matches in title an extremely high weight (like 10-20 points) so they always win.

### Option 3: Two-Pass Detection
1. **Pass 1**: Check for dish names in title - if found, return that cuisine immediately
2. **Pass 2**: If no dish match, fall back to ingredient-based detection

## Recommended Solution

**Dish-First Detection with Override:**

```typescript
// First pass: Check for dish names in title (strongest signal)
for (const config of CUISINE_CONFIGS) {
  const dishInTitle = config.dishes.find(dish => 
    titleLower.includes(dish.toLowerCase())
  );
  
  if (dishInTitle) {
    // Dish name in title = automatic match for that cuisine
    return { tags: [config.name], needsReview: false };
  }
}

// Second pass: If no dish match, use ingredient-based detection
// (existing logic)
```

This ensures:
- "Shawarma Pargiyot" → "shawarma" in title → Middle Eastern wins immediately
- "Japanese Sake Steamed Clams" → "sake" might match, but "japanese" in title also helps
- "Spaghetti Carbonara" → "spaghetti" or "carbonara" in title → Italian wins

## Why Current Approach Fails

The current approach still uses total scoring, which means:
- Even with 5 points for dish in title, if another cuisine has 7+ ingredient matches, it can still win
- Shared spices (cumin, turmeric, etc.) appear in many cuisines
- The scoring system doesn't prioritize dish names enough

## Next Steps

1. Implement dish-first detection (if dish in title, return that cuisine immediately)
2. Keep ingredient-based detection as fallback
3. Test with "Shawarma Pargiyot" to verify it works


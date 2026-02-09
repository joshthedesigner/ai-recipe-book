# Cuisine Detection Bug Analysis

## Problem
A Korean recipe was incorrectly tagged as: `korean`, `chinese`, and `indian`

## Root Cause

The `detectCuisines()` function adds tags for **ALL** cuisines that meet the minimum match threshold. Many cuisines share common ingredients, causing false positives.

### Example: Korean Recipe

**Korean ingredients:**
- gochujang, gochugaru, kimchi, soy sauce, garlic, ginger, sesame oil

**Matches:**
1. **Korean**: gochujang (1) + gochugaru (1) + kimchi (1) = 3 matches ✓ (correct)
2. **Chinese**: soy sauce (1) + garlic (1) + ginger (1) + sesame oil (1) = 4 matches ✗ (false positive)
3. **Indian**: garlic (1) + ginger (1) = 2 matches ✗ (false positive)

### The Problem

The current logic:
```typescript
if (totalMatches >= minMatches) {
  detectedTags.push(config.name); // Adds ALL matching cuisines
}
```

This means if multiple cuisines share common ingredients, they all get tagged.

## Solution Options

### Option 1: Return Only Best Match (Recommended)
Only tag the cuisine with the **highest score**, not all that meet the threshold.

**Pros:**
- Prevents multiple cuisine tags
- More accurate
- Simpler logic

**Cons:**
- Might miss fusion dishes (but those are edge cases)

### Option 2: Require Unique Ingredients
Only count ingredients that are **unique** to that cuisine, not shared ones.

**Pros:**
- More precise
- Handles fusion better

**Cons:**
- Complex to implement
- Need to define "unique" ingredients

### Option 3: Increase Threshold
Require more matches (e.g., 3-4 instead of 2).

**Pros:**
- Simple change

**Cons:**
- Might miss legitimate matches
- Doesn't solve the core problem

## Recommended Fix: Option 1

Change `detectCuisines()` to return only the best match:

```typescript
// Find best match instead of all matches
let bestMatch: { cuisine: string; score: number } | null = null;

for (const config of CUISINE_CONFIGS) {
  const totalMatches = ingredientMatches + dishMatches;
  
  if (totalMatches >= minMatches) {
    if (!bestMatch || totalMatches > bestMatch.score) {
      bestMatch = { cuisine: config.name, score: totalMatches };
    }
  }
}

if (bestMatch) {
  detectedTags.push(bestMatch.cuisine);
}
```

This ensures only ONE cuisine tag is added, the one with the highest confidence.


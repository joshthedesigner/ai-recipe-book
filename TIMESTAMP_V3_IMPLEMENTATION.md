# Timestamp Matching V3 - Implementation Complete

## Overview

V3 is a clean rebuild based on the proven old system logic, with key improvements:
- **Exact match reuse** - Allows reusing segments for exact matches (score = 1.0)
- **Relaxed constraints for later steps** - Last 25% of steps get 2x more lenient backward jump allowance
- **Better interpolation** - Uses section header timestamps as anchors when available
- **Header matching** - Matches section headers independently, used as anchors for step interpolation
- **Lower thresholds for later steps** - Adaptive thresholds that decrease for later steps

## Architecture

### Core Components

1. **`matcher.ts`** - Core matching logic
   - Text normalization (synonyms, filler words, numbers)
   - Similarity calculation (Jaccard + key phrase boost)
   - Adaptive thresholds
   - Exact match reuse support

2. **`stepMatching.ts`** - Step timestamp matching
   - Sequential matching with improvements
   - Relaxed temporal constraints for later steps
   - Section-aware interpolation
   - Uses header timestamps as anchors

3. **`headerMatching.ts`** - Header timestamp matching
   - Matches section headers independently
   - No "used segments" tracking (headers are unique)
   - More lenient chronological constraints

4. **`index.ts`** - Main entry point
   - Orchestrates header matching → step matching
   - Returns unified result

## Key Improvements Over Old System

### 1. Exact Match Reuse
```typescript
// Old: Once a segment is used, it can't be reused
// V3: Exact matches (score = 1.0) can reuse segments
if (match.matchType === 'exact') {
  // Don't mark segment as used - allow reuse
}
```

### 2. Relaxed Constraints for Later Steps
```typescript
// Old: Fixed 5 second backward jump limit
// V3: Last 25% of steps get 10 second limit (2x more lenient)
const isLaterStep = index / steps.length > 0.75;
const maxBackwardJump = isLaterStep ? 10 : 5;
```

### 3. Better Interpolation
```typescript
// Old: Only interpolates between matched steps
// V3: Uses section header timestamps as anchors
if (sectionInfo?.headerTimestamp !== undefined) {
  // Use header as anchor for interpolation
}
```

### 4. Header Matching
```typescript
// New: Matches headers independently
// Headers are more distinctive, easier to match
// Used as anchors for step interpolation
```

## Usage

### Enable V3
Add to `.env.local`:
```
USE_TIMESTAMP_MATCHING_V3=true
```

### Fallback Chain
1. V3 (if enabled)
2. V2 (Steps-First, if enabled)
3. V1 (New system, if enabled)
4. Old system (default)

## Expected Results

### For Flat Recipes
- All steps get timestamps (improved old system)
- Later steps match better (relaxed constraints)
- More accurate (better thresholds)

### For Sectioned Recipes
- Headers get timestamps (new feature)
- Steps still get timestamps (improved old system)
- Better interpolation (uses header anchors)

## Testing

To test V3:
1. Set `USE_TIMESTAMP_MATCHING_V3=true` in `.env.local`
2. Restart dev server
3. Extract a recipe from YouTube video
4. Check console logs for V3 system messages
5. Verify timestamps on steps and headers

## Files Created

- `utils/timestampMatchingV3/types.ts` - Type definitions
- `utils/timestampMatchingV3/matcher.ts` - Core matching logic
- `utils/timestampMatchingV3/stepMatching.ts` - Step matching with improvements
- `utils/timestampMatchingV3/headerMatching.ts` - Header matching
- `utils/timestampMatchingV3/index.ts` - Main entry point

## Files Modified

- `utils/videoExtractor.ts` - Added V3 integration with fallback chain



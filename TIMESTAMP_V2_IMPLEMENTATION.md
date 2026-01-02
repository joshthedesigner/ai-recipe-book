# Steps-First Timestamp Matching V2 - Implementation Summary

## Overview

This document describes the new **Steps-First Timestamp Matching System (V2)** that eliminates the circular dependency problem by matching steps first, then deriving section boundaries and header timestamps from the matched steps.

## Architecture

### Core Principle: Steps → Boundaries → Headers

Unlike the old system (Headers → Boundaries → Steps), V2:
1. Matches ALL steps first without boundary constraints
2. Groups matched steps by section (using recipe structure)
3. Derives boundaries from actual step timestamps
4. Assigns headers = min(step timestamps in section)

### Module Structure

```
utils/timestampMatchingV2/
├── types.ts          # Type definitions
├── config.ts         # Configuration and thresholds
├── preprocessing.ts  # Text normalization, synonyms, filler removal
├── matching.ts       # Phase 1: Step matching (no boundaries)
├── boundaries.ts     # Phase 2: Boundary derivation & header assignment
├── refinement.ts     # Phase 3: Interpolation, outlier detection, validation
└── index.ts          # Main entry point
```

## Implementation Phases

### Phase 1: Step Matching (No Boundaries)

**File:** `matching.ts`

**What it does:**
- Matches each step to transcript segments using text similarity
- Uses adaptive thresholds (0.5/0.7/0.8 based on step length)
- Applies temporal smoothness (rejects >5s backward jumps)
- No boundary constraints - steps can match anywhere

**Key Functions:**
- `matchSteps()` - Main matching function
- `matchStep()` - Match single step
- `calculateSimilarity()` - Text similarity scoring
- `getAdaptiveThreshold()` - Dynamic threshold based on step length

**Output:** `StepMatchingResult` with matched/unmatched steps

---

### Phase 2: Boundary Derivation

**File:** `boundaries.ts`

**What it does:**
- Groups matched steps by section (using recipe structure)
- Calculates boundaries from actual step timestamps:
  - Lower bound = min(step timestamps in section)
  - Upper bound = min(step timestamps in next section)
- Assigns header timestamp = min(step timestamps in section)
- Validates headers are after previous section's last step

**Key Functions:**
- `deriveBoundaries()` - Main boundary derivation
- Builds `SectionWithBoundaries[]` with derived metadata

**Output:** `BoundaryDerivationResult` with sections, boundaries, and violations

---

### Phase 3: Refinement

**File:** `refinement.ts`

**What it does:**
- **Interpolation:** Fills gaps between matched steps (linear interpolation)
- **Outlier Detection:** Finds steps that match outside their section boundaries
- **Chronological Validation:** Detects steps out of order

**Key Functions:**
- `interpolateMissingSteps()` - Fill gaps between matched steps
- `refineOutliers()` - Detect and flag cross-boundary matches
- `validateChronologicalOrder()` - Check for ordering violations

**Output:** Refined matches with interpolated steps

---

### Phase 4: Integration

**File:** `videoExtractor.ts`

**What it does:**
- Integrates V2 system with feature flag `USE_STEPS_FIRST_MATCHING`
- Falls back to V1 or old system if V2 fails
- Updates both step timestamps and section timestamps

**Feature Flag Priority:**
1. `USE_STEPS_FIRST_MATCHING=true` → V2 (Steps-First)
2. `USE_NEW_TIMESTAMP_MATCHING=true` → V1 (Old new system)
3. Neither → Old production system

## Key Improvements Over Old System

### ✅ Eliminates Circular Dependency
- **Old:** Headers → Boundaries → Steps (headers might be wrong)
- **New:** Steps → Boundaries → Headers (steps are more reliable)

### ✅ Headers Always Have Timestamps (when steps match)
- Header = min(step timestamps in section)
- If any step matches, header gets timestamp
- No more missing header timestamps

### ✅ More Accurate Boundaries
- Derived from actual step locations, not header guesses
- Boundaries reflect reality

### ✅ Better Text Matching
- Adaptive thresholds (short steps get lower threshold)
- Synonym mapping (pan/skillet, stir/mix, etc.)
- Filler word removal
- Temporal smoothness validation

### ✅ Interpolation for Missing Steps
- Fills gaps between matched steps
- Reduces undefined timestamps

## Testing

**Test Script:** `scripts/test-timestamp-v2.ts`

Run with:
```bash
npx tsx scripts/test-timestamp-v2.ts
```

**Test Cases:**
1. Flat recipe (no sections) - 5 steps
2. Sectioned recipe - 2 sections, 5 steps total

**Current Results:**
- ✅ 100% match rate on test cases
- ✅ 0 chronological violations
- ✅ Headers correctly assigned from step timestamps

## Usage

### Enable V2 System

Add to `.env.local`:
```
USE_STEPS_FIRST_MATCHING=true
```

### Disable (Use Old System)

Remove or set to false:
```
USE_STEPS_FIRST_MATCHING=false
```

## Known Limitations

1. **Cross-Boundary Matches in Phase 1**
   - Steps matched without boundaries might match outside their section
   - Phase 4 refinement detects but doesn't fix (yet)

2. **Outlier Re-matching Not Implemented**
   - Outliers are detected but not re-matched within boundaries
   - Future enhancement

3. **No Semantic Matching Yet**
   - Currently only text-based matching
   - Embeddings/LLM matching can be added later

4. **Section Grouping Assumes Recipe Structure**
   - Relies on recipe having correct section structure
   - If structure is wrong, grouping will be wrong

## Next Steps

1. **Test on Real Videos**
   - Test with actual YouTube recipe videos
   - Compare results to old system
   - Measure improvement

2. **Handle Outliers**
   - Re-match outliers within boundaries
   - Or adjust boundaries to accommodate outliers

3. **Add Semantic Matching**
   - Integrate embeddings for paraphrasing
   - Use LLM for complex cases

4. **Improve Interpolation**
   - Better heuristics for gap filling
   - Consider video context

5. **Performance Optimization**
   - Batch processing for large videos
   - Caching for repeated segments

## Files Created

- `utils/timestampMatchingV2/types.ts`
- `utils/timestampMatchingV2/config.ts`
- `utils/timestampMatchingV2/preprocessing.ts`
- `utils/timestampMatchingV2/matching.ts`
- `utils/timestampMatchingV2/boundaries.ts`
- `utils/timestampMatchingV2/refinement.ts`
- `utils/timestampMatchingV2/index.ts`
- `scripts/test-timestamp-v2.ts`

## Integration Points

- `utils/videoExtractor.ts` - Lines 14-21 (feature flags), 1319-1363 (main integration), 1525-1590 (scraped recipe integration)

## Branch

Created on: `feature/timestamp-steps-first-rebuild`


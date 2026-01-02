# YouTube Recipe Timestamp Implementation

## Overview

This document details the implementation of timestamp mapping for YouTube recipe videos, including the challenges encountered and solutions attempted. The goal is to map recipe steps and section headers to specific timestamps in video transcripts, enabling users to jump to relevant parts of the video.

### Latest Updates (Nov 20, 2025)

- Implemented **Phase 1 quick wins** while still running the legacy production pipeline (feature-flagged off in prod):
  - Adaptive similarity thresholds based on step length
  - Expanded text normalization (cooking synonym map + filler word removal)
  - Temporal smoothness guardrails to prevent large backward jumps
  - Post-matching interpolation to fill gaps between matched steps
- These improvements live in `TimestampMatcher` and `mapTimestampsToSteps` but still exhibit inconsistencies, especially when transcripts are noisy or sections lack clean boundaries.
- Pain points that remain: browser/dev-server instability during large rebuilds, lack of deterministic testing harness, and ongoing manual validation burden.

## Architecture

### Core Components

1. **TimestampMatcher Class** (`utils/videoExtractor.ts`)
   - Reusable matching engine with confidence scoring
   - Supports constraints (min/max timestamp, exclude indices)
   - Handles text normalization, fuzzy matching, and key phrase detection

2. **mapTimestampsToSteps** (`utils/videoExtractor.ts`)
   - Maps flat list of recipe steps to transcript segments
   - Returns sparse array of timestamps (undefined for unmatched steps)
   - Tracks used indices to prevent duplicate matches

3. **mapTimestampsToSections** (`utils/videoExtractor.ts`)
   - Maps section headers to transcript segments
   - Establishes boundaries for step matching
   - Ensures chronological order (headers after previous section's last step)

4. **sortStepsWithinSections** (`utils/videoExtractor.ts`)
   - Matches section steps to flat steps array
   - Applies boundary constraints to prevent cross-boundary matches
   - Sorts steps chronologically within each section

### Data Flow

```
YouTube Video URL
    ↓
Extract Captions/Transcript (with timestamps)
    ↓
Extract Recipe Structure (sections, steps)
    ↓
Map Section Headers → Timestamps (establishes boundaries)
    ↓
Map Flat Steps → Timestamps (initial matching)
    ↓
Sort Steps Within Sections (with boundary constraints)
    ↓
Store in Database (step_timestamps JSONB column)
```

## Challenges and Solutions

### Challenge 1: Sparse Array Serialization Issue

**Problem:**
- Initial implementation used sparse arrays (`number[]`) with `undefined` values
- When serialized to JSON/JSONB, `undefined` values were lost
- This caused index misalignment: step at index 5 might get timestamp from index 3

**Attempted Solution:**
- Convert sparse arrays to dense arrays with `null` values
- Updated types to `(number | null)[]`
- Modified all filtering logic to check `t != null`

**Result:**
- User reported it didn't work and requested revert to production
- Reverted all changes

**Root Cause:**
- The issue was actually in the matching logic, not serialization
- Sparse arrays work fine in JSONB (undefined becomes null automatically)
- The real problem was steps not matching correctly

**Current State:**
- Using sparse arrays (undefined values)
- JSONB handles undefined → null conversion automatically
- UI filters out null/undefined values

---

### Challenge 2: Section Header Timestamps at End of Video

**Problem:**
- Section headers were showing timestamps at the end of the video instead of the beginning
- This happened when section titles appeared multiple times in the transcript
- `findBestMatch()` returned the first match found, not necessarily the earliest

**Attempted Solution:**
- Created `findAllMatches()` helper function
- Modified `mapTimestampsToSections()` to collect all matches and select the earliest
- Applied to both initial matching and forward search logic

**Result:**
- User requested to revert this change
- Reverted to production version

**Root Cause:**
- The fix was correct in principle but may have introduced other issues
- User preferred to keep existing behavior

**Current State:**
- Using original `findBestMatch()` approach
- Section headers use first match found
- Chronological validation ensures headers are after previous section

---

### Challenge 3: Inconsistent Timestamp Mapping

**Problem:**
- Some flat recipes had header timestamps but no step timestamps
- Others had step timestamps but no header timestamps
- Text matching between section steps and flat steps was fragile

**Diagnosis:**
- `sortStepsWithinSections` was failing to match section steps to flat steps
- Minor text differences (punctuation, whitespace) caused matches to fail
- Section timestamps were mapped independently, so they could succeed even if step matching failed

**Solution Implemented:**
- Enhanced text normalization (remove punctuation, normalize whitespace)
- Added `calculateSimilarity()` function for fuzzy matching
- Implemented fuzzy matching fallback (similarity >= 0.85)
- Added position-based fallback as last resort
- Added extensive diagnostic logging

**Result:**
- Improved matching accuracy
- But introduced new problem: chronological ordering issues

---

### Challenge 4: Chronological Ordering Worsened

**Problem:**
- After implementing robust text matching, chronological ordering became "even worse than before"
- Steps were being assigned timestamps out of order
- Large time gaps appeared between steps within sections

**Root Cause:**
- Fuzzy and position-based matching didn't enforce chronological constraints
- Steps could match to any flat step, regardless of timestamp order
- Sorting happened after matching, but wrong matches were already made

**Attempted Solution 1: Chronological Constraints During Matching**
- Added `lastTimestampInSection` tracking
- Enforced that all matches must be >= `lastTimestampInSection`
- Applied to exact, fuzzy, and position-based matching

**Result:**
- Still had issues - constraints were too strict
- Blocked valid matches that were slightly out of order
- User reported ordering was still worse

**Attempted Solution 2: Remove Constraints, Sort After Matching**
- Removed chronological constraints from matching
- Match all steps correctly by text first
- Sort by timestamp after matching

**Result:**
- Better text matching, but still had boundary issues
- Steps could match outside their section boundaries

**Current State:**
- Using boundary constraints instead of chronological constraints
- Steps must match within section boundaries (header → next header)
- Sorting happens after matching to ensure chronological order

---

### Challenge 5: Section Headers Before Previous Section's Last Step

**Problem:**
- Section headers sometimes appeared before the last step of the previous section
- This violated chronological order expectations
- Headers were matched independently of step timestamps

**Root Cause:**
- Section headers are matched first (before step timestamps are assigned)
- Headers use `lastTimestamp` (previous section header) as constraint
- But step timestamps are assigned later, so headers don't know where previous section's steps end

**Solution Implemented:**
- In `mapTimestampsToSections`, if a header would be before previous section, adjust it:
  ```typescript
  if (lastTimestamp !== null && finalTimestamp < lastTimestamp) {
    finalTimestamp = lastTimestamp + 1;
  }
  ```
- This ensures headers are always after previous section's header

**Limitation:**
- Doesn't account for previous section's last step timestamp
- Only ensures header is after previous header, not previous section's steps

**Current State:**
- Headers are adjusted to be after previous header
- Still possible for header to be before previous section's last step if steps extend beyond header

---

### Challenge 6: Large Time Gaps Within Sections

**Problem:**
- Some sections had massive time gaps between steps
- Second-to-last step and last step had huge time difference
- Next section's header was correctly before the last step, indicating the last step was matched incorrectly

**Root Cause:**
- Steps were matching outside their section boundaries
- A step in section N could match to a timestamp in section N+1
- After sorting, this created large gaps

**Solution Implemented: Boundary Constraints**
- Calculate section boundaries from header timestamps
- Filter candidate matches to only those within boundaries
- Lower bound: current section header (or 0 if missing)
- Upper bound: next section header (or Infinity if last section)

**Result:**
- Prevented cross-boundary matches
- But introduced new problem: missing timestamps

---

### Challenge 7: Missing Timestamps When Headers Are Missing

**Problem:**
- Certain timestamps were just missing
- Steps in sections without header timestamps couldn't match
- Boundary constraints were too strict when headers were missing

**Root Cause:**
- When section header timestamp is missing, code defaulted to `0`
- Boundary filter: `timestamp >= 0 && timestamp < nextSectionHeader`
- If steps had timestamps starting at, say, 120s, but next section header was at 60s, steps were filtered out
- Or if all sections had missing headers, boundaries were [0, Infinity] which should work, but something else was wrong

**Solution Implemented: Conditional Boundary Enforcement**
- Only enforce lower bound if section header timestamp exists
- Always enforce upper bound (prevents cross-boundary matches)
- If header is missing, allow matching anywhere before next section

```typescript
const hasHeaderTimestamp = section.timestamp != null && section.timestamp > 0;
const lowerBound = hasHeaderTimestamp ? section.timestamp! : 0;
const upperBound = nextSection?.timestamp ?? Infinity;

// Filter: only enforce lower bound if header exists
if (hasHeaderTimestamp && timestamp < lowerBound) return false;
// Always enforce upper bound
if (timestamp >= upperBound) return false;
```

**Result:**
- Steps can now match even when headers are missing
- Cross-boundary matches still prevented
- Should fix missing timestamp issue

---

### Challenge 8: Adaptive Thresholds, Normalization & Interpolation (Phase 1 Quick Wins)

**Problem:**
- Legacy matcher required exact-ish text overlap, causing short steps to be rejected and long steps to accept mediocre matches.
- Transcript noise ("now", "okay", etc.) frequently confused similarity scoring.
- Missing steps between two matched timestamps created large gaps that looked like failures.

**Solutions Implemented (Nov 20, 2025):**
1. **Adaptive thresholds** – 0.5 for short steps (<10 words), 0.7 for medium, 0.8 for long steps (>20 words).
2. **Synonym & filler handling** – mapped common cooking verbs (stir/mix, pan/skillet, sauté/fry) and stripped filler words before scoring.
3. **Temporal smoothness validation** – reject large backward jumps (>5 seconds) during matching.
4. **Interpolation pass** – when step *n–1* and *n+1* have timestamps within a 2‑minute gap, estimate step *n* via linear interpolation.

**Result:**
- Higher match counts in synthetic testing, fewer totally blank sections.
- Still inconsistent in real videos because upstream extraction and boundary accuracy remain limiting factors.
- Improvements are temporarily disabled in prod while we stabilize and add better diagnostics.

---

## Current Implementation Status

### What Works

✅ **Flat Recipe Timestamps**
- Steps in flat recipes (no sections) get timestamps correctly
- Matching uses confidence scoring and fuzzy matching

✅ **Section Header Timestamps**
- Headers are matched to transcript segments
- Chronological order is maintained (headers after previous headers)

✅ **Boundary Constraints**
- Steps are constrained to their section boundaries
- Prevents cross-boundary matches (steps from section N matching in section N+1)

✅ **Text Matching**
- Robust normalization (punctuation removal, whitespace normalization)
- Fuzzy matching with similarity scoring
- Position-based fallback for unmatched steps

### Known Issues

⚠️ **Header Before Previous Section's Last Step**
- Headers are adjusted to be after previous header, but not necessarily after previous section's last step
- This can happen if previous section's steps extend beyond its header timestamp

⚠️ **Missing Header Timestamps**
- If section title doesn't appear in transcript, header has no timestamp
- Steps can still match (fixed), but header won't have timestamp
- This is acceptable behavior, but not ideal

⚠️ **Chronological Ordering Within Sections**
- Steps are sorted after matching, but if initial matching is wrong, sorting won't fix it
- Boundary constraints help, but not perfect

⚠️ **Quick-Win Heuristics Still Unproven**
- Adaptive thresholds + interpolation reduce missing data but can also surface low-confidence matches.
- Need automated evaluation to quantify improvements before enabling in production.

### Remaining Challenges

1. **Inferring Missing Header Timestamps**
   - Could use minimum timestamp of section's steps as header timestamp
   - Would require two-phase matching: match steps first, then infer headers

2. **Better Boundary Calculation**
   - Currently uses header timestamps only
   - Could use step timestamps to refine boundaries
   - Would require iterative refinement

3. **Handling Overlapping Sections**
   - If sections overlap in transcript, boundaries might be incorrect
   - Need better detection and handling of overlaps

## Key Learnings

1. **Boundaries > Chronological Constraints**
   - Using section boundaries as constraints is more reliable than enforcing chronological order during matching
   - Boundaries prevent cross-boundary matches, which is the main issue

2. **Match First, Sort Later**
   - Better to match all steps correctly by text, then sort by timestamp
   - Chronological constraints during matching can block valid matches

3. **Graceful Degradation**
   - If header timestamp is missing, don't enforce lower bound
   - Still enforce upper bound to prevent cross-boundary matches
   - Better to have some timestamps than none

4. **Text Matching is Fragile**
   - Minor differences (punctuation, whitespace) can break exact matches
   - Fuzzy matching and normalization are essential
   - Position-based fallback is necessary for edge cases

5. **Diagnostic Logging is Critical**
   - Extensive logging helped diagnose issues
   - Shows matching process, boundaries, and failures
   - Essential for debugging in production

## Future Improvements

1. **Two-Phase Matching**
   - Phase 1: Match all steps without boundaries
   - Phase 2: Use matched step timestamps to infer section boundaries
   - Phase 3: Re-match with refined boundaries

2. **Confidence-Based Matching**
   - Use confidence scores to prefer better matches
   - Reject low-confidence matches and try alternatives
   - Could improve accuracy

3. **Iterative Refinement**
   - Start with approximate matches
   - Refine boundaries based on matched steps
   - Re-match with better boundaries
   - Repeat until convergence

4. **Better Header Inference**
   - If header doesn't match, use minimum timestamp of section's steps
   - Or use previous section's last step + 1
   - Ensures headers are always present

5. **Validation and Correction**
   - Detect violations (header before previous step, large gaps)
   - Auto-correct where possible
   - Flag uncertain cases for manual review
6. **Stability & Observability**
   - Single-command scripts to repro timestamp runs without Next.js dev server.
   - Capture before/after metrics (match rate, avg confidence, interpolations) for each change.

## Code Structure

### Main Functions

- `TimestampMatcher.match()` - Core matching engine with constraints
- `mapTimestampsToSteps()` - Map flat steps to timestamps
- `mapTimestampsToSections()` - Map section headers to timestamps
- `sortStepsWithinSections()` - Match and sort steps within sections with boundary constraints

### Key Data Structures

- `MatchResult` - Match with confidence score and type
- `MatchConstraints` - Min/max timestamp, exclude indices
- `ExtractedRecipe` - Recipe with optional `stepTimestamps` and `sections`

### Database Schema

```sql
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS step_timestamps JSONB DEFAULT NULL;

CREATE INDEX idx_recipes_step_timestamps_gin 
ON recipes USING GIN (step_timestamps);
```

## Testing Recommendations

1. **Test with Various Recipe Structures**
   - Flat recipes (no sections)
   - Sectioned recipes (with headers)
   - Mixed (some sections with headers, some without)

2. **Test Edge Cases**
   - Missing header timestamps
   - Overlapping sections
   - Steps that don't match transcript
   - Very long videos (>1 hour)

3. **Validate Chronological Order**
   - Headers should be after previous headers
   - Steps should be within section boundaries
   - Steps should be in chronological order within sections

4. **Check Diagnostic Logs**
   - Review logs for matching failures
   - Check boundary calculations
   - Verify confidence scores

## Conclusion

The timestamp implementation has evolved through multiple iterations, addressing challenges with text matching, chronological ordering, boundary constraints, and missing timestamps. The current implementation uses boundary constraints to prevent cross-boundary matches while allowing flexibility when headers are missing. While not perfect, it provides a solid foundation that can be improved iteratively based on real-world usage and feedback.


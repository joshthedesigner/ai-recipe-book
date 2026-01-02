# Timestamp Consistency Diagnosis & Improvement Plan

## Current System Overview

The production timestamp matching system uses a simple text-matching approach:

1. **Text Normalization**: Lowercase, remove punctuation, normalize numbers (e.g., "two" → "2")
2. **Similarity Scoring**: Character overlap, substring matching, word overlap
3. **Key Phrase Boosting**: Cooking terms (add, mix, heat, cook, stir, etc.) get score boost
4. **Threshold**: Requires 0.7 confidence (70%) to match
5. **One-time Use**: Each transcript segment can only be matched once (tracked via `usedIndices`)

## Current Limitations & Root Causes of Inconsistency

### 1. **Text Matching Limitations**

**Problem**: Recipe steps are often paraphrased or restructured from spoken transcript
- **Example**: Step says "Add 2 tablespoons of olive oil" but transcript says "we're going to add about two tablespoons of olive oil to the pan"
- **Impact**: Exact/substring matches fail, fuzzy matching threshold too high (0.7)

**Root Cause**:
- No semantic understanding (can't handle paraphrasing)
- Simple character/word overlap is brittle
- Normalization loses context (punctuation, emphasis)

### 2. **Transcript Segment Granularity**

**Problem**: Transcript segments are variable-length chunks (often 5-10 seconds)
- **Example**: One segment might say "first we'll add the onions then we need to sauté them until they're soft"
- **Impact**: Steps get matched to wrong part of segment (beginning vs end), or multiple steps match same segment

**Root Cause**:
- Using `startMs` of segment as timestamp for entire segment
- No sub-segment matching (can't pinpoint exact moment within segment)
- Segments contain multiple actions but we only assign one timestamp

### 3. **Sequential Order Assumptions**

**Problem**: System assumes steps occur in same order as recipe, but video narration can:
- Jump back ("make sure you...")
- Mention things out of order
- Skip/reference previous steps

**Root Cause**:
- No chronological validation during matching
- `usedIndices` prevents backtracking but doesn't validate order
- No penalty for out-of-order matches

### 4. **Section Boundary Enforcement Issues**

**Problem**: When recipes have sections, step matching is constrained by section boundaries
- **Example**: Section header timestamp is off → all steps in section get wrong boundaries
- **Impact**: Steps from Section A might match to Section B segments if boundaries are wrong

**Root Cause**:
- Section timestamps themselves are matched (can be wrong)
- Steps forced to match within boundaries even if correct match is outside
- No validation that section boundaries make sense

### 5. **Missing Step Handling**

**Problem**: Steps that don't match any segment get `undefined` timestamp
- **Impact**: No timestamp shown, user can't jump to that step
- **Example**: Step is "Let rest for 10 minutes" but transcript says "now we let it rest" - might not match

**Root Cause**:
- No fallback strategy for unmatched steps
- No interpolation between known timestamps
- No position-based estimation

### 6. **Confidence Threshold Too High**

**Problem**: 0.7 (70%) threshold is strict
- **Impact**: Many valid matches rejected, leading to missing timestamps
- **Example**: 65% similarity match (due to filler words) rejected even though it's correct

**Root Cause**:
- Fixed threshold doesn't adapt to step complexity
- Short steps (3-4 words) need different threshold than long steps (20+ words)
- No contextual consideration (is this the best available match?)

### 7. **No Temporal Context**

**Problem**: System doesn't consider where previous matches occurred
- **Impact**: Matches can jump around timeline inconsistently
- **Example**: Step 1 matches at 120s, Step 2 matches at 45s (before Step 1), Step 3 matches at 200s

**Root Cause**:
- No chronological validation in `mapTimestampsToSteps()`
- Sorting happens AFTER matching (too late to prevent bad matches)
- No temporal smoothness checking

### 8. **Ambiguous Steps**

**Problem**: Some steps are too generic ("Mix ingredients", "Cook until done")
- **Impact**: Matches to multiple segments with equal confidence → picks first one (might be wrong)
- **Example**: "Add salt" appears multiple times in video → matches first occurrence even if later steps need different salt addition

**Root Cause**:
- No disambiguation based on context
- No consideration of step position in recipe sequence
- Simple "first match wins" logic

## Specific Technical Issues

### Issue 1: Similarity Calculation is Primitive
```typescript
// Current: Character overlap
const longerSet = new Set(longer.split(''));
const shorterSet = new Set(shorter.split(''));
// ... counts character matches
```
**Problem**: Doesn't understand word order, meaning, or context

### Issue 2: No Semantic Understanding
- Can't match "sauté onions" with "cook the onions in the pan"
- Can't match "mix together" with "combine the ingredients"
- Can't handle synonyms ("pan" vs "skillet", "stir" vs "mix")

### Issue 3: Segment Reuse Prevention is Too Strict
```typescript
const usedIndices = new Set<number>();
// Once a segment is used, it's never considered again
```
**Problem**: Valid matches rejected if segment already used, even if it's the best match

### Issue 4: No Sub-segment Timestamp Refinement
```typescript
timestamp: Math.floor(bestMatch.segment.startMs / 1000)
// Always uses segment START, not actual step occurrence
```
**Problem**: Step might occur at 5:23 but segment starts at 5:20 → timestamp off by 3 seconds

### Issue 5: Section Boundary Logic is Fragile
```typescript
if (hasHeaderTimestamp && timestamp < lowerBound) return false;
```
**Problem**: If section header timestamp is wrong, all steps in section get constrained to wrong region

## Proposed Improvement Plan (Non-Breaking)

### Phase 1: Enhance Text Matching (Keep Current System)
**Goal**: Improve consistency without changing architecture

1. **Adaptive Thresholds**
   - Short steps (< 10 words): Lower threshold to 0.5
   - Medium steps (10-20 words): Keep 0.7
   - Long steps (> 20 words): Raise to 0.8
   - **Benefit**: More nuanced matching without semantic complexity

2. **Better Normalization**
   - Keep common cooking synonyms: "pan"="skillet", "stir"="mix", "cook"="prepare"
   - Remove filler words: "now", "okay", "so", "well", "you know"
   - Preserve numbers and measurements more carefully
   - **Benefit**: Better text alignment without API calls

3. **Word Order Consideration**
   - Add penalty for word order mismatches
   - Example: "add salt and pepper" vs "add pepper and salt" should score lower
   - **Benefit**: More accurate matching for ordered actions

4. **Temporal Smoothness Check**
   - After initial matching, validate chronological order
   - If Step N timestamp < Step N-1 timestamp, try to find better match
   - Allow small backward jumps (< 5 seconds) but flag large ones
   - **Benefit**: Prevents timeline jumps

### Phase 2: Improve Unmatched Step Handling
**Goal**: Fill gaps without breaking existing matches

1. **Interpolation for Missing Steps**
   - If Step N-1 and Step N+1 have timestamps, interpolate Step N
   - Use linear interpolation: `(prev + next) / 2`
   - Only if gap is reasonable (< 2 minutes between steps)
   - **Benefit**: Reduces undefined timestamps

2. **Position-Based Fallback (Careful)**
   - For unmatched steps, estimate based on step index and video length
   - Only use if no interpolation possible
   - Formula: `estimatedTime = (stepIndex / totalSteps) * videoLength`
   - **Benefit**: Last resort to avoid missing timestamps

3. **Best Effort Matching**
   - Lower threshold to 0.4 for unmatched steps
   - Consider matches with lower confidence if nothing better available
   - **Benefit**: Reduces undefined timestamps

### Phase 3: Refine Section Boundaries
**Goal**: Make section-based matching more robust

1. **Section Header Validation**
   - If section header timestamp seems off (before previous section's last step), adjust
   - Validate header timestamps make chronological sense
   - **Benefit**: Prevents cascading boundary errors

2. **Boundary Relaxation**
   - If step can't find match within boundaries but has high-confidence match outside, consider it
   - Only if match is close to boundary (< 30 seconds outside)
   - **Benefit**: Handles section timestamp inaccuracies

3. **Cross-Section Validation**
   - After all sections matched, validate overall chronology
   - Flag sections that seem out of order
   - **Benefit**: Catches boundary issues post-hoc

### Phase 4: Post-Processing Improvements
**Goal**: Clean up matches after initial assignment

1. **Chronological Enforcement**
   - Sort all matched steps by timestamp
   - For steps that violate order, try to find alternative matches
   - Only adjust if alternative exists with similar confidence
   - **Benefit**: Ensures timeline consistency

2. **Timestamp Smoothing**
   - Detect large jumps between consecutive steps (> 2 minutes)
   - If jump seems unreasonable, investigate if intermediate segment exists
   - **Benefit**: Catches missed matches

3. **Confidence Reporting**
   - Track confidence for each match
   - Log low-confidence matches for debugging
   - **Benefit**: Visibility into quality

## Implementation Priority

### High Priority (Quick Wins)
1. ✅ Adaptive thresholds based on step length
2. ✅ Better text normalization (synonyms, filler word removal)
3. ✅ Temporal smoothness validation
4. ✅ Interpolation for missing steps

### Medium Priority (More Impact)
1. ✅ Word order consideration in similarity
2. ✅ Section boundary relaxation
3. ✅ Chronological enforcement post-processing
4. ✅ Best effort matching for unmatched steps

### Low Priority (Nice to Have)
1. Position-based fallback (use sparingly)
2. Section header validation
3. Timestamp smoothing
4. Confidence reporting/logging

## Success Metrics

### Current State (Baseline)
- Match rate: ~60-70% of steps get timestamps (estimated)
- Chronological violations: ~10-15% of recipes have out-of-order steps
- Missing timestamps: ~30-40% of steps have undefined timestamps

### Target State (After Improvements)
- Match rate: >85% of steps get timestamps
- Chronological violations: <5% of recipes
- Missing timestamps: <15% of steps

## Constraints & Limitations

### Must NOT Change
- ✅ Recipe extraction/instructions (working well per user)
- ✅ Overall architecture (keep TimestampMatcher class)
- ✅ API contracts (still returns `number[]` with undefined for missing)
- ✅ Existing successful matches (don't regress)

### Can Change
- ✅ Matching algorithms and thresholds
- ✅ Post-processing and validation
- ✅ Normalization logic
- ✅ Fallback strategies

## Risk Assessment

### Low Risk
- Text normalization improvements (just improves matching)
- Adaptive thresholds (still conservative)
- Interpolation (only for unmatched steps)

### Medium Risk
- Temporal smoothness checks (might reject valid matches if too strict)
- Boundary relaxation (might cause cross-boundary issues if too loose)
- Chronological enforcement (might break good matches if validation too aggressive)

### Mitigation
- Make all improvements opt-in or behind feature flags
- Add extensive logging to compare old vs new behavior
- Validate on test set of known-good recipes before deploying

## Next Steps

1. **Measure Current State**: Add logging to track match rates, confidence scores, chronological violations
2. **Implement Phase 1**: Start with adaptive thresholds and better normalization
3. **Test & Validate**: Compare results on sample recipes
4. **Iterate**: Refine based on results before moving to Phase 2



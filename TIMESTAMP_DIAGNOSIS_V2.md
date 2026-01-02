# Timestamp Matching V2 - Diagnosis & Improvements

## Current Issues Reported

1. **First half of steps/sections look decent** ✅
2. **Last section timestamps are off** ❌
3. **Ingredients stop having timestamps until last section** ❌
4. **Last section is just off** ❌

## Root Causes

### Issue 1: Sequential Matching Exhausts Good Segments
- **Problem**: Steps are matched sequentially. Early steps consume the best transcript segments, leaving later steps with fewer/unused segments.
- **Impact**: Later steps fail to match because:
  - All good segments are already "used"
  - Remaining segments have lower similarity scores
  - Temporal constraints reject matches that jump backward

### Issue 2: Temporal Smoothness Too Strict for Later Steps
- **Problem**: The backward jump check (max 10-20 seconds) rejects valid matches if a later step matches an earlier segment.
- **Impact**: Later steps that should match earlier segments (e.g., "add salt" mentioned again) get rejected.

### Issue 3: Position-Based Fallback Doesn't Account for Section Boundaries
- **Problem**: When calculating position-based timestamps, the system doesn't consider:
  - Section boundaries (ingredients vs instructions)
  - Natural breaks in the video
  - That later sections might need different distribution
- **Impact**: Timestamps for later steps are calculated incorrectly, especially in last section.

### Issue 4: No Forward-Looking Strategy
- **Problem**: System matches greedily (best match for current step) without considering future steps.
- **Impact**: Early steps take segments that later steps need more.

## Proposed Solutions

### Solution 1: Two-Pass Matching Strategy
1. **Pass 1**: Find all potential matches for all steps (without marking segments as used)
2. **Pass 2**: Assign matches optimally, considering:
   - Match quality
   - Temporal smoothness
   - Ensuring every step gets a match

### Solution 2: Relax Temporal Constraints for Later Steps
- Allow larger backward jumps if:
  - Step is in the last 25% of steps
  - Match quality is high (>= 0.8)
  - No better forward match exists

### Solution 3: Improve Position-Based Fallback
- Use section-aware distribution:
  - Distribute timestamps within each section's time range
  - Use matched steps within section as anchors
  - Fall back to global distribution only if section has no matches

### Solution 4: Segment Reuse Strategy
- Allow segment reuse if:
  - Match quality is very high (>= 0.95)
  - No unused segment has better match
  - Step is in later half of recipe

## Implementation Priority

1. **High Priority**: Solution 3 (Position-based fallback improvements)
2. **High Priority**: Solution 2 (Relax temporal constraints)
3. **Medium Priority**: Solution 4 (Better segment reuse)
4. **Low Priority**: Solution 1 (Two-pass matching - more complex)



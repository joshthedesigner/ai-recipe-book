/**
 * Refinement Pass (Phase 3)
 * 
 * Handles interpolation, outlier detection, and chronological validation
 */

import { MatchedStep, UnmatchedStep, BoundaryDerivationResult, MatchingConfig } from './types';
import { getConfig } from './config';
import { matchSteps } from './matching';
import { TranscriptSegment } from '@/utils/youtubeHelpers';

/**
 * Interpolate missing steps between matched steps
 */
export function interpolateMissingSteps(
  unmatchedSteps: UnmatchedStep[],
  matchedSteps: MatchedStep[],
  config = getConfig()
): MatchedStep[] {
  const interpolated: MatchedStep[] = [];
  const matchedByIndex = new Map(matchedSteps.map(m => [m.stepIndex, m]));

  unmatchedSteps.forEach(unmatched => {
    // Find previous and next matched steps
    let prevMatch: MatchedStep | null = null;
    let nextMatch: MatchedStep | null = null;

    // Search backward
    for (let i = unmatched.stepIndex - 1; i >= 0; i--) {
      const match = matchedByIndex.get(i);
      if (match) {
        prevMatch = match;
        break;
      }
    }

    // Search forward
    for (let i = unmatched.stepIndex + 1; i < matchedByIndex.size + unmatchedSteps.length; i++) {
      const match = matchedByIndex.get(i);
      if (match) {
        nextMatch = match;
        break;
      }
    }

    // Interpolate if both exist and gap is reasonable
    if (prevMatch && nextMatch) {
      const timeGap = nextMatch.timestamp - prevMatch.timestamp;
      const stepGap = nextMatch.stepIndex - prevMatch.stepIndex;

      if (timeGap > 0 && timeGap < config.maxGapForInterpolation && stepGap > 0) {
        const positionInGap = (unmatched.stepIndex - prevMatch.stepIndex) / stepGap;
        const interpolatedTimestamp = Math.round(prevMatch.timestamp + (timeGap * positionInGap));

        interpolated.push({
          stepIndex: unmatched.stepIndex,
          stepText: unmatched.stepText,
          timestamp: interpolatedTimestamp,
          confidence: 0.3, // Low confidence for interpolated
          matchType: 'position',
          segmentIndex: -1, // No actual segment match
          sectionIndex: unmatched.sectionIndex,
        });
      }
    }
  });

  return interpolated;
}

/**
 * Detect and re-match outliers (steps that match outside their section boundaries)
 */
export function refineOutliers(
  matchedSteps: MatchedStep[],
  boundaryResult: BoundaryDerivationResult,
  transcriptSegments: TranscriptSegment[],
  config = getConfig()
): { refined: MatchedStep[]; outliers: MatchedStep[] } {
  const refined: MatchedStep[] = [];
  const outliers: MatchedStep[] = [];

  matchedSteps.forEach(step => {
    // Find which section this step belongs to
    let section: typeof boundaryResult.sections[0] | undefined;
    for (const sec of boundaryResult.sections) {
      if (sec.stepIndices.includes(step.stepIndex)) {
        section = sec;
        break;
      }
    }

    if (!section) {
      // Step doesn't belong to any section (flat recipe), keep it
      refined.push(step);
      return;
    }

    // Check if step is within boundaries
    if (step.timestamp >= section.lowerBound && step.timestamp < section.upperBound) {
      refined.push(step);
    } else {
      // Outlier - try to find better match within boundaries
      outliers.push(step);
      
      // TODO: Re-match within boundaries (could call matchStep with constraints)
      // For now, we'll keep the outlier but flag it
      refined.push(step);
    }
  });

  return { refined, outliers };
}

/**
 * Assign position-based timestamps to unmatched steps
 * 
 * This is a fallback for steps that couldn't be matched or interpolated.
 * Uses section boundaries when available, otherwise distributes evenly.
 */
export function assignPositionBasedTimestamps(
  allSteps: string[],
  matchedSteps: MatchedStep[],
  videoLength: number,
  config = getConfig(),
  sectionsWithBoundaries?: Array<{ stepIndices: number[]; lowerBound: number; upperBound: number }> // Optional section info
): MatchedStep[] {
  const matchedByIndex = new Map(matchedSteps.map(m => [m.stepIndex, m]));
  const positionBased: MatchedStep[] = [];

  // Find the first and last matched steps to establish bounds
  let firstMatchedTimestamp: number | null = null;
  let lastMatchedTimestamp: number | null = null;
  let firstMatchedIndex: number | null = null;
  let lastMatchedIndex: number | null = null;

  matchedSteps.forEach(step => {
    if (firstMatchedTimestamp === null || step.timestamp < firstMatchedTimestamp) {
      firstMatchedTimestamp = step.timestamp;
      firstMatchedIndex = step.stepIndex;
    }
    if (lastMatchedTimestamp === null || step.timestamp > lastMatchedTimestamp) {
      lastMatchedTimestamp = step.timestamp;
      lastMatchedIndex = step.stepIndex;
    }
  });

  // Assign timestamps to unmatched steps
  for (let i = 0; i < allSteps.length; i++) {
    if (matchedByIndex.has(i)) {
      continue; // Already matched
    }

    let timestamp: number;

    // Try to use section boundaries if available
    if (sectionsWithBoundaries) {
      // Find which section this step belongs to
      let stepSection: typeof sectionsWithBoundaries[0] | undefined;
      for (const section of sectionsWithBoundaries) {
        if (section.stepIndices.includes(i)) {
          stepSection = section;
          break;
        }
      }

      if (stepSection) {
        // Use section boundaries
        const sectionLower = stepSection.lowerBound;
        const sectionUpper = Math.min(stepSection.upperBound, videoLength);
        const sectionStepIndices = stepSection.stepIndices;
        const stepPositionInSection = sectionStepIndices.indexOf(i);
        const totalStepsInSection = sectionStepIndices.length;

        // Find matched steps within this section
        const sectionMatchedSteps = matchedSteps.filter(s => 
          sectionStepIndices.includes(s.stepIndex)
        ).sort((a, b) => a.stepIndex - b.stepIndex);

        if (sectionMatchedSteps.length > 0) {
          // Use matched steps within section as anchors
          const firstSectionMatch = sectionMatchedSteps[0];
          const lastSectionMatch = sectionMatchedSteps[sectionMatchedSteps.length - 1];
          
          if (i < firstSectionMatch.stepIndex) {
            // Before first match in section
            const position = firstSectionMatch.stepIndex > sectionStepIndices[0]
              ? (i - sectionStepIndices[0]) / (firstSectionMatch.stepIndex - sectionStepIndices[0])
              : 0;
            timestamp = Math.round(sectionLower + (firstSectionMatch.timestamp - sectionLower) * position);
          } else if (i > lastSectionMatch.stepIndex) {
            // After last match in section
            const position = sectionStepIndices[sectionStepIndices.length - 1] > lastSectionMatch.stepIndex
              ? (i - lastSectionMatch.stepIndex) / (sectionStepIndices[sectionStepIndices.length - 1] - lastSectionMatch.stepIndex)
              : 0;
            timestamp = Math.round(lastSectionMatch.timestamp + (sectionUpper - lastSectionMatch.timestamp) * position);
          } else {
            // Between matches in section - interpolate
            const range = lastSectionMatch.timestamp - firstSectionMatch.timestamp;
            const stepRange = lastSectionMatch.stepIndex - firstSectionMatch.stepIndex;
            if (stepRange > 0) {
              const position = (i - firstSectionMatch.stepIndex) / stepRange;
              timestamp = Math.round(firstSectionMatch.timestamp + range * position);
            } else {
              timestamp = firstSectionMatch.timestamp;
            }
          }
        } else {
          // No matches in section - distribute evenly within section boundaries
          const position = totalStepsInSection > 1 
            ? stepPositionInSection / (totalStepsInSection - 1) 
            : 0;
          timestamp = Math.round(sectionLower + (sectionUpper - sectionLower) * position);
        }
      } else {
        // Step doesn't belong to any section - use global distribution
        if (firstMatchedTimestamp !== null && lastMatchedTimestamp !== null && 
            firstMatchedIndex !== null && lastMatchedIndex !== null) {
          const matchedRange = lastMatchedTimestamp - firstMatchedTimestamp;
          const stepRange = lastMatchedIndex - firstMatchedIndex;
          
          if (i < firstMatchedIndex && firstMatchedIndex > 0) {
            const position = i / firstMatchedIndex;
            timestamp = Math.round(firstMatchedTimestamp * position);
          } else if (i > lastMatchedIndex && lastMatchedIndex < allSteps.length - 1) {
            const remainingSteps = allSteps.length - lastMatchedIndex - 1;
            const position = remainingSteps > 0 ? (i - lastMatchedIndex) / remainingSteps : 0;
            const remainingTime = videoLength - lastMatchedTimestamp;
            timestamp = Math.round(lastMatchedTimestamp + (remainingTime * position));
          } else if (stepRange > 0) {
            const position = (i - firstMatchedIndex) / stepRange;
            timestamp = Math.round(firstMatchedTimestamp + (matchedRange * position));
          } else {
            timestamp = firstMatchedTimestamp;
          }
        } else {
          const position = allSteps.length > 1 ? i / (allSteps.length - 1) : 0;
          timestamp = Math.round(videoLength * position);
        }
      }
    } else {
      // No sections - use global distribution
      if (firstMatchedTimestamp !== null && lastMatchedTimestamp !== null && 
          firstMatchedIndex !== null && lastMatchedIndex !== null) {
        const matchedRange = lastMatchedTimestamp - firstMatchedTimestamp;
        const stepRange = lastMatchedIndex - firstMatchedIndex;
        
        if (i < firstMatchedIndex && firstMatchedIndex > 0) {
          const position = i / firstMatchedIndex;
          timestamp = Math.round(firstMatchedTimestamp * position);
        } else if (i > lastMatchedIndex && lastMatchedIndex < allSteps.length - 1) {
          const remainingSteps = allSteps.length - lastMatchedIndex - 1;
          const position = remainingSteps > 0 ? (i - lastMatchedIndex) / remainingSteps : 0;
          const remainingTime = videoLength - lastMatchedTimestamp;
          timestamp = Math.round(lastMatchedTimestamp + (remainingTime * position));
        } else if (stepRange > 0) {
          const position = (i - firstMatchedIndex) / stepRange;
          timestamp = Math.round(firstMatchedTimestamp + (matchedRange * position));
        } else {
          timestamp = firstMatchedTimestamp;
        }
      } else {
        const position = allSteps.length > 1 ? i / (allSteps.length - 1) : 0;
        timestamp = Math.round(videoLength * position);
      }
    }

    // Ensure timestamp is within valid range
    timestamp = Math.max(0, Math.min(timestamp, videoLength));

    positionBased.push({
      stepIndex: i,
      stepText: allSteps[i],
      timestamp,
      confidence: 0.2, // Very low confidence for position-based
      matchType: 'position',
      segmentIndex: -1,
    });
  }

  return positionBased;
}

/**
 * Validate and correct chronological order
 */
export function validateChronologicalOrder(
  matchedSteps: MatchedStep[],
  boundaryResult: BoundaryDerivationResult
): { violations: number; corrected: MatchedStep[] } {
  const sorted = [...matchedSteps].sort((a, b) => a.stepIndex - b.stepIndex);
  let violations = 0;
  const corrected: MatchedStep[] = [...sorted]; // Start with all steps

  // Detect violations (steps out of chronological order)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.timestamp < prev.timestamp) {
      violations++;
      // For now, we'll keep the match but flag it
      // In future, could try to find alternative match or adjust
    }
  }

  return { violations, corrected };
}


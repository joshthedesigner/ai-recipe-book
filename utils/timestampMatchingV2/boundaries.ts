/**
 * Boundary Derivation (Phase 2)
 * 
 * Groups matched steps by section and derives boundaries from actual step timestamps.
 * Assigns header timestamps based on section step timestamps.
 */

import { RecipeSection } from '@/types';
import { MatchedStep, UnmatchedStep, SectionWithBoundaries, BoundaryDerivationResult } from './types';
import { getConfig } from './config';

/**
 * Group steps by section and derive boundaries
 */
export function deriveBoundaries(
  matchedSteps: MatchedStep[],
  unmatchedSteps: UnmatchedStep[],
  sections: RecipeSection[] | undefined,
  flatSteps: string[],
  config = getConfig()
): BoundaryDerivationResult {
  // If no sections, treat as flat recipe
  if (!sections || sections.length === 0) {
    const stepTimestamps: (number | undefined)[] = new Array(flatSteps.length);
    matchedSteps.forEach(m => {
      stepTimestamps[m.stepIndex] = m.timestamp;
    });

    return {
      sections: [],
      flatSteps,
      stepTimestamps,
      violations: {
        headerBeforePreviousStep: 0,
        crossBoundaryMatches: 0,
        largeGaps: 0,
      },
    };
  }

  // Build map of step index to section index
  const stepToSection: Map<number, number> = new Map();
  let flatStepIndex = 0;

  sections.forEach((section, sectionIdx) => {
    if (section.steps) {
      section.steps.forEach(() => {
        stepToSection.set(flatStepIndex, sectionIdx);
        flatStepIndex++;
      });
    }
  });

  // Group matched steps by section
  const stepsBySection: Map<number, MatchedStep[]> = new Map();
  matchedSteps.forEach(step => {
    const sectionIdx = stepToSection.get(step.stepIndex);
    if (sectionIdx !== undefined) {
      if (!stepsBySection.has(sectionIdx)) {
        stepsBySection.set(sectionIdx, []);
      }
      stepsBySection.get(sectionIdx)!.push(step);
    }
  });

  // Build sections with boundaries
  const sectionsWithBoundaries: SectionWithBoundaries[] = [];
  let lastSectionMaxTimestamp = -1;

  sections.forEach((section, sectionIdx) => {
    const sectionSteps = stepsBySection.get(sectionIdx) || [];
    const sectionStepIndices = section.steps
      ? Array.from({ length: section.steps.length }, (_, i) => {
          // Find the flat step index for this section step
          let flatIdx = 0;
          for (let s = 0; s < sectionIdx; s++) {
            flatIdx += sections[s].steps?.length || 0;
          }
          return flatIdx + i;
        })
      : [];

    // Calculate boundaries from matched steps
    const timestamps = sectionSteps.map(s => s.timestamp).sort((a, b) => a - b);
    const lowerBound = timestamps.length > 0 ? timestamps[0] : (lastSectionMaxTimestamp >= 0 ? lastSectionMaxTimestamp + config.boundaryBuffer : 0);
    const upperBound = sectionIdx < sections.length - 1
      ? (() => {
          const nextSectionSteps = stepsBySection.get(sectionIdx + 1) || [];
          const nextTimestamps = nextSectionSteps.map(s => s.timestamp).sort((a, b) => a - b);
          return nextTimestamps.length > 0 ? nextTimestamps[0] : Infinity;
        })()
      : Infinity;

    // Header timestamp = min timestamp of steps in section
    const headerTimestamp = timestamps.length > 0 ? timestamps[0] : undefined;

    // Validate header is after previous section's last step
    let finalHeaderTimestamp = headerTimestamp;
    if (finalHeaderTimestamp !== undefined && lastSectionMaxTimestamp >= 0) {
      if (finalHeaderTimestamp < lastSectionMaxTimestamp) {
        // Adjust header to be after previous section
        finalHeaderTimestamp = lastSectionMaxTimestamp + 1;
      }
    }

    const maxTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : -1;
    if (maxTimestamp > lastSectionMaxTimestamp) {
      lastSectionMaxTimestamp = maxTimestamp;
    }

    sectionsWithBoundaries.push({
      section: {
        ...section,
        timestamp: finalHeaderTimestamp,
      },
      headerTimestamp: finalHeaderTimestamp,
      lowerBound,
      upperBound,
      stepIndices: sectionStepIndices,
      matchedStepCount: sectionSteps.length,
      totalStepCount: section.steps?.length || 0,
    });
  });

  // Build flat step timestamps array
  const stepTimestamps: (number | undefined)[] = new Array(flatSteps.length);
  matchedSteps.forEach(m => {
    stepTimestamps[m.stepIndex] = m.timestamp;
  });

  // Detect violations
  const violations = {
    headerBeforePreviousStep: 0,
    crossBoundaryMatches: 0,
    largeGaps: 0,
  };

  // Check for cross-boundary matches
  matchedSteps.forEach(step => {
    const sectionIdx = stepToSection.get(step.stepIndex);
    if (sectionIdx !== undefined) {
      const section = sectionsWithBoundaries[sectionIdx];
      if (step.timestamp < section.lowerBound || step.timestamp >= section.upperBound) {
        violations.crossBoundaryMatches++;
      }
    }
  });

  // Check for large gaps
  const sortedMatched = [...matchedSteps].sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 1; i < sortedMatched.length; i++) {
    const gap = sortedMatched[i].timestamp - sortedMatched[i - 1].timestamp;
    if (gap > config.maxGapForInterpolation) {
      violations.largeGaps++;
    }
  }

  return {
    sections: sectionsWithBoundaries,
    flatSteps,
    stepTimestamps,
    violations,
  };
}



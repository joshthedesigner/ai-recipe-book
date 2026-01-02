/**
 * Steps-First Timestamp Matching System
 * 
 * Main entry point for the new matching architecture that:
 * 1. Matches steps first (no boundaries)
 * 2. Derives boundaries from matched steps
 * 3. Assigns headers from section step timestamps
 * 4. Refines outliers and validates order
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';
import { TimestampMatchingResult } from './types';
import { matchSteps, StepMatchingResult } from './matching';
import { deriveBoundaries, BoundaryDerivationResult } from './boundaries';
import { interpolateMissingSteps, refineOutliers, validateChronologicalOrder, assignPositionBasedTimestamps } from './refinement';
import { getConfig } from './config';

/**
 * Main function: Match recipe steps to video timestamps using steps-first approach
 */
export async function matchTimestampsV2(
  steps: string[],
  sections: RecipeSection[] | undefined,
  transcriptSegments: TranscriptSegment[],
  videoLength: number
): Promise<TimestampMatchingResult> {
  const startTime = Date.now();
  const config = getConfig();

  // Phase 1: Match all steps without boundaries
  console.log('📋 Phase 1: Matching steps without boundaries...');
  const stepResult: StepMatchingResult = matchSteps(steps, transcriptSegments, config);
  console.log(`   ✅ Matched ${stepResult.matchedSteps.length}/${stepResult.totalSteps} steps (${(stepResult.matchRate * 100).toFixed(1)}%)`);

  // Phase 2: Derive boundaries and assign headers
  console.log('📋 Phase 2: Deriving boundaries from matched steps...');
  const boundaryResult: BoundaryDerivationResult = deriveBoundaries(
    stepResult.matchedSteps,
    stepResult.unmatchedSteps,
    sections,
    steps,
    config
  );
  console.log(`   ✅ Derived boundaries for ${boundaryResult.sections.length} sections`);

  // Phase 3: Interpolate missing steps
  console.log('📋 Phase 3: Interpolating missing steps...');
  const interpolated = interpolateMissingSteps(
    stepResult.unmatchedSteps,
    stepResult.matchedSteps,
    config
  );
  console.log(`   ✅ Interpolated ${interpolated.length} missing step(s)`);

  // Combine matched and interpolated steps
  const allMatchedSteps = [...stepResult.matchedSteps, ...interpolated];
  
  // Phase 3.5: Assign position-based timestamps to ANY remaining unmatched steps
  // This ensures EVERY step gets a timestamp, even if matching failed
  const matchedIndices = new Set(allMatchedSteps.map(m => m.stepIndex));
  const totalMatchedCount = matchedIndices.size;
  const totalStepsCount = steps.length;
  
  if (totalMatchedCount < totalStepsCount) {
    const missingCount = totalStepsCount - totalMatchedCount;
    console.log(`📋 Phase 3.5: Assigning position-based timestamps to ${missingCount} remaining unmatched step(s)...`);
    const positionBased = assignPositionBasedTimestamps(
      steps,
      allMatchedSteps,
      videoLength,
      config,
      boundaryResult.sections // Pass section boundaries for better distribution
    );
    // Only add steps that aren't already matched
    positionBased.forEach(step => {
      if (!matchedIndices.has(step.stepIndex)) {
        allMatchedSteps.push(step);
      }
    });
    console.log(`   ✅ Assigned position-based timestamps to ${positionBased.length} step(s)`);
  }

  // Phase 4: Refine outliers
  console.log('📋 Phase 4: Refining outliers...');
  const { refined, outliers } = refineOutliers(
    allMatchedSteps,
    boundaryResult,
    transcriptSegments,
    config
  );
  if (outliers.length > 0) {
    console.log(`   ⚠️  Found ${outliers.length} outlier(s) outside section boundaries`);
  }

  // Phase 5: Validate chronological order
  console.log('📋 Phase 5: Validating chronological order...');
  const { violations } = validateChronologicalOrder(refined, boundaryResult);
  if (violations > 0) {
    console.log(`   ⚠️  Found ${violations} chronological violation(s)`);
  }

  // Build final result - ensure EVERY step has a timestamp
  const finalStepTimestamps: (number | undefined)[] = new Array(steps.length);
  const refinedIndices = new Set<number>();
  
  refined.forEach(step => {
    finalStepTimestamps[step.stepIndex] = step.timestamp;
    refinedIndices.add(step.stepIndex);
  });
  
  // Safety check: If any step is still missing a timestamp, assign position-based
  for (let i = 0; i < steps.length; i++) {
    if (finalStepTimestamps[i] === undefined) {
      console.warn(`⚠️  Step ${i + 1} still missing timestamp, assigning position-based fallback`);
      // Use simple position-based distribution
      const position = steps.length > 1 ? i / (steps.length - 1) : 0;
      finalStepTimestamps[i] = Math.round(videoLength * position);
    }
  }

  const sectionTimestamps: (number | undefined)[] = sections
    ? boundaryResult.sections.map(s => s.headerTimestamp)
    : [];

  const totalMatched = refined.length;
  const missingTimestamps = steps.length - totalMatched;
  const averageConfidence = refined.length > 0
    ? refined.reduce((sum, s) => sum + s.confidence, 0) / refined.length
    : 0;

  const processingTimeMs = Date.now() - startTime;

  return {
    stepTimestamps: finalStepTimestamps,
    sectionTimestamps,
    quality: {
      matchRate: totalMatched / steps.length,
      averageConfidence,
      chronologicalViolations: violations + boundaryResult.violations.crossBoundaryMatches,
      missingTimestamps,
    },
    metadata: {
      totalSteps: steps.length,
      matchedSteps: totalMatched,
      totalSections: sections?.length || 0,
      sectionsWithHeaders: boundaryResult.sections.filter(s => s.headerTimestamp !== undefined).length,
      processingTimeMs,
    },
  };
}


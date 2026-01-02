/**
 * Step Matching - Improved version of old system
 * 
 * Improvements:
 * - Allow exact match reuse
 * - Relax temporal constraints for later steps
 * - Better interpolation using section boundaries
 * - Lower thresholds for later steps
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';
import { TimestampMatcher } from './matcher';
import { MatchConstraints } from './types';

export interface StepMatchingResult {
  stepTimestamps: (number | undefined)[];
  matchedCount: number;
  interpolatedCount: number;
}

/**
 * Match timestamps to steps with improvements
 */
export function matchStepTimestamps(
  steps: string[],
  transcriptSegments: TranscriptSegment[],
  sections?: RecipeSection[],
  sectionHeaderTimestamps?: Map<string, number> // Optional: use header timestamps for interpolation
): StepMatchingResult {
  if (!steps || steps.length === 0 || !transcriptSegments || transcriptSegments.length === 0) {
    return {
      stepTimestamps: [],
      matchedCount: 0,
      interpolatedCount: 0,
    };
  }

  const matcher = new TimestampMatcher();
  const timestamps: (number | undefined)[] = new Array(steps.length);
  const usedIndices = new Set<number>();
  let matchedCount = 0;
  let lastTimestamp: number | null = null;

  // Build step-to-section mapping for interpolation
  const stepToSection: Map<number, { sectionIndex: number; headerTimestamp?: number }> = new Map();
  if (sections) {
    let flatStepIndex = 0;
    sections.forEach((section, sectionIdx) => {
      if (section.steps) {
        section.steps.forEach(() => {
          const headerTimestamp = sectionHeaderTimestamps?.get(section.title || '');
          stepToSection.set(flatStepIndex, { sectionIndex: sectionIdx, headerTimestamp });
          flatStepIndex++;
        });
      }
    });
  }

  // Phase 1: Match steps with improved logic
  steps.forEach((step, index) => {
    try {
      const isLaterStep = index / steps.length > 0.75; // Last 25% of steps
      
      // Relaxed constraints for later steps
      const maxBackwardJump = isLaterStep ? 10 : 5; // seconds
      
      const constraints: MatchConstraints = {
        excludeIndices: usedIndices,
        allowReuse: true, // Allow exact matches to reuse segments
      };

      const match = matcher.match(step, transcriptSegments, constraints, isLaterStep);

      if (match) {
        const segmentIndex = transcriptSegments.indexOf(match.segment);
        if (segmentIndex !== -1) {
          // Validation: Ensure timestamp is reasonable
          if (match.timestamp >= 0 && match.timestamp <= 36000) {
            // Temporal smoothness check with relaxed constraints for later steps
            const isChronological = lastTimestamp === null || 
              match.timestamp >= lastTimestamp - maxBackwardJump;
            
            // For exact matches, be even more lenient
            const isExactMatch = match.matchType === 'exact';
            const finalMaxJump = isExactMatch ? maxBackwardJump * 1.5 : maxBackwardJump;
            const isWithinBounds = lastTimestamp === null || 
              match.timestamp >= lastTimestamp - finalMaxJump;
            
            if (isWithinBounds || lastTimestamp === null) {
              timestamps[index] = match.timestamp;
              
              // Only mark as used if not an exact match (exact matches can be reused)
              if (!isExactMatch) {
                usedIndices.add(segmentIndex);
              }
              
              lastTimestamp = match.timestamp;
              matchedCount++;
              
              if (!isChronological && lastTimestamp !== null) {
                console.log(`   ℹ️  Step ${index + 1} matched with backward jump (${match.timestamp}s < ${lastTimestamp}s, allowed)`);
              }
            } else {
              console.warn(`   ⚠️  Step ${index + 1} matched with large backward jump (${match.timestamp}s < ${lastTimestamp - finalMaxJump}s) - skipping`);
            }
          } else {
            console.warn(`   ⚠️  Invalid timestamp ${match.timestamp}s for step ${index + 1} - skipping`);
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Error matching timestamp for step ${index + 1}:`, error);
    }
  });

  console.log(`⏱️  Step matching: ${matchedCount}/${steps.length} matched`);

  // Phase 2: Interpolation with section-aware logic
  let interpolatedCount = 0;
  for (let i = 0; i < steps.length; i++) {
    if (timestamps[i] !== undefined) {
      continue; // Already matched
    }

    // Try to use section header timestamp as anchor
    const sectionInfo = stepToSection.get(i);
    if (sectionInfo?.headerTimestamp !== undefined) {
      // Use header timestamp as anchor for first step in section
      // For other steps, interpolate between header and next match
      const headerTimestamp = sectionInfo.headerTimestamp;
      
      // Find next matched step
      let nextIndex = -1;
      for (let j = i + 1; j < steps.length; j++) {
        if (timestamps[j] !== undefined) {
          nextIndex = j;
          break;
        }
      }
      
      if (nextIndex !== -1) {
        const nextTimestamp = timestamps[nextIndex]!;
        const timeGap = nextTimestamp - headerTimestamp;
        const stepGap = nextIndex - i;
        
        if (timeGap > 0 && timeGap < 180 && stepGap > 0) {
          const position = 1 / stepGap; // Position of first step after header
          timestamps[i] = Math.round(headerTimestamp + (timeGap * position));
          interpolatedCount++;
          continue;
        }
      } else {
        // No next match, use header as timestamp
        timestamps[i] = headerTimestamp;
        interpolatedCount++;
        continue;
      }
    }

    // Standard interpolation between matched steps
    let prevIndex = -1;
    let nextIndex = -1;
    
    for (let j = i - 1; j >= 0; j--) {
      if (timestamps[j] !== undefined) {
        prevIndex = j;
        break;
      }
    }
    
    for (let j = i + 1; j < steps.length; j++) {
      if (timestamps[j] !== undefined) {
        nextIndex = j;
        break;
      }
    }
    
    if (prevIndex !== -1 && nextIndex !== -1) {
      const prevTimestamp = timestamps[prevIndex]!;
      const nextTimestamp = timestamps[nextIndex]!;
      const timeGap = nextTimestamp - prevTimestamp;
      const stepGap = nextIndex - prevIndex;
      
      // Interpolate if gap is reasonable (less than 3 minutes)
      if (timeGap > 0 && timeGap < 180 && stepGap > 0) {
        const positionInGap = (i - prevIndex) / stepGap;
        const interpolatedTimestamp = Math.round(prevTimestamp + (timeGap * positionInGap));
        
        timestamps[i] = interpolatedTimestamp;
        interpolatedCount++;
      }
    }
  }

  if (interpolatedCount > 0) {
    console.log(`⏱️  Interpolated ${interpolatedCount} missing timestamp(s)`);
  }

  return {
    stepTimestamps: timestamps,
    matchedCount,
    interpolatedCount,
  };
}


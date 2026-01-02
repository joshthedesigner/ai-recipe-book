/**
 * Chronological Validation
 * 
 * Ensures timestamps are always in sequential order
 */

import { getConfig } from './config';
import { logger } from './logger';

export interface TimestampMatch {
  stepIndex: number;
  timestamp: number;
  confidence: number;
  strategy?: string;
  reasoning?: string;
}

export interface ChronologicalResult {
  matches: TimestampMatch[];
  adjustments: Array<{
    stepIndex: number;
    oldTimestamp: number;
    newTimestamp: number;
    reason: string;
  }>;
  violations: number;
}

/**
 * Enforce chronological order on timestamp matches
 */
export function enforceChronologicalOrder(
  matches: TimestampMatch[],
  videoLength: number
): ChronologicalResult {
  const config = getConfig();
  const sorted = [...matches].sort((a, b) => a.stepIndex - b.stepIndex);
  const adjusted: TimestampMatch[] = [];
  const adjustments: ChronologicalResult['adjustments'] = [];
  
  let lastTimestamp = 0;
  let violations = 0;
  
  logger.debug('Enforcing chronological order', {
    matchCount: matches.length,
    videoLength,
  });
  
  for (const match of sorted) {
    let finalTimestamp = match.timestamp;
    let wasAdjusted = false;
    
    // Ensure minimum gap between steps
    const minTimestamp = lastTimestamp + config.minStepGapSeconds;
    
    if (finalTimestamp < minTimestamp) {
      const oldTimestamp = finalTimestamp;
      finalTimestamp = minTimestamp;
      wasAdjusted = true;
      violations++;
      
      adjustments.push({
        stepIndex: match.stepIndex,
        oldTimestamp,
        newTimestamp: finalTimestamp,
        reason: `Adjusted for chronological order (was ${oldTimestamp}s, min: ${minTimestamp}s)`,
      });
      
      logger.warn(`Chronological adjustment: Step ${match.stepIndex}`, {
        oldTimestamp,
        newTimestamp: finalTimestamp,
        previousStepTimestamp: lastTimestamp,
      });
    }
    
    // Ensure not beyond video length
    if (finalTimestamp > videoLength) {
      const oldTimestamp = finalTimestamp;
      finalTimestamp = Math.max(0, videoLength - 1);
      wasAdjusted = true;
      
      if (oldTimestamp !== finalTimestamp) {
        adjustments.push({
          stepIndex: match.stepIndex,
          oldTimestamp,
          newTimestamp: finalTimestamp,
          reason: `Adjusted to video length (was ${oldTimestamp}s, video length: ${videoLength}s)`,
        });
        
        logger.warn(`Video length adjustment: Step ${match.stepIndex}`, {
          oldTimestamp,
          newTimestamp: finalTimestamp,
          videoLength,
        });
      }
    }
    
    // Ensure not negative
    if (finalTimestamp < 0) {
      const oldTimestamp = finalTimestamp;
      finalTimestamp = 0;
      wasAdjusted = true;
      
      adjustments.push({
        stepIndex: match.stepIndex,
        oldTimestamp,
        newTimestamp: finalTimestamp,
        reason: `Adjusted negative timestamp (was ${oldTimestamp}s)`,
      });
    }
    
    // Reduce confidence if adjusted
    const adjustedMatch: TimestampMatch = {
      ...match,
      timestamp: finalTimestamp,
      confidence: wasAdjusted ? match.confidence * 0.9 : match.confidence,
      reasoning: wasAdjusted 
        ? `${match.reasoning || ''} [Adjusted: ${match.timestamp}s → ${finalTimestamp}s]`.trim()
        : match.reasoning,
    };
    
    adjusted.push(adjustedMatch);
    lastTimestamp = finalTimestamp;
  }
  
  // Check for duplicate timestamps
  const timestampSet = new Set<number>();
  for (const match of adjusted) {
    if (timestampSet.has(match.timestamp)) {
      // Add 1 second to avoid duplicate
      match.timestamp += 1;
      match.confidence *= 0.95;
      violations++;
      
      adjustments.push({
        stepIndex: match.stepIndex,
        oldTimestamp: match.timestamp - 1,
        newTimestamp: match.timestamp,
        reason: 'Adjusted to avoid duplicate timestamp',
      });
    }
    timestampSet.add(match.timestamp);
  }
  
  logger.info('Chronological validation complete', {
    violations,
    adjustments: adjustments.length,
    finalMatchCount: adjusted.length,
  });
  
  return {
    matches: adjusted,
    adjustments,
    violations,
  };
}

/**
 * Validate chronological order (check only, don't adjust)
 */
export function validateChronologicalOrder(
  matches: TimestampMatch[],
  videoLength: number
): {
  isValid: boolean;
  violations: Array<{
    stepIndex: number;
    issue: string;
    expected: number;
    actual: number;
  }>;
} {
  const config = getConfig();
  const sorted = [...matches].sort((a, b) => a.stepIndex - b.stepIndex);
  const violations: Array<{
    stepIndex: number;
    issue: string;
    expected: number;
    actual: number;
  }> = [];
  
  let lastTimestamp = -config.minStepGapSeconds;
  
  for (const match of sorted) {
    // Check minimum gap
    const minTimestamp = lastTimestamp + config.minStepGapSeconds;
    if (match.timestamp < minTimestamp) {
      violations.push({
        stepIndex: match.stepIndex,
        issue: 'Timestamp too early (violates minimum gap)',
        expected: minTimestamp,
        actual: match.timestamp,
      });
    }
    
    // Check video length
    if (match.timestamp > videoLength) {
      violations.push({
        stepIndex: match.stepIndex,
        issue: 'Timestamp exceeds video length',
        expected: videoLength,
        actual: match.timestamp,
      });
    }
    
    // Check negative
    if (match.timestamp < 0) {
      violations.push({
        stepIndex: match.stepIndex,
        issue: 'Negative timestamp',
        expected: 0,
        actual: match.timestamp,
      });
    }
    
    lastTimestamp = match.timestamp;
  }
  
  // Check for duplicates
  const timestampSet = new Set<number>();
  for (const match of sorted) {
    if (timestampSet.has(match.timestamp)) {
      violations.push({
        stepIndex: match.stepIndex,
        issue: 'Duplicate timestamp',
        expected: match.timestamp + 1,
        actual: match.timestamp,
      });
    }
    timestampSet.add(match.timestamp);
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Detect large timestamp jumps (potential issues)
 */
export function detectLargeJumps(
  matches: TimestampMatch[]
): Array<{
  stepIndex: number;
  previousStepIndex: number;
  jump: number;
  previousTimestamp: number;
  currentTimestamp: number;
}> {
  const config = getConfig();
  const sorted = [...matches].sort((a, b) => a.stepIndex - b.stepIndex);
  const largeJumps: Array<{
    stepIndex: number;
    previousStepIndex: number;
    jump: number;
    previousTimestamp: number;
    currentTimestamp: number;
  }> = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    
    // Check if steps are consecutive
    if (current.stepIndex === previous.stepIndex + 1) {
      const jump = current.timestamp - previous.timestamp;
      
      if (jump > config.maxTimestampJumpSeconds) {
        largeJumps.push({
          stepIndex: current.stepIndex,
          previousStepIndex: previous.stepIndex,
          jump,
          previousTimestamp: previous.timestamp,
          currentTimestamp: current.timestamp,
        });
      }
    }
  }
  
  if (largeJumps.length > 0) {
    logger.warn(`Detected ${largeJumps.length} large timestamp jumps`, {
      jumps: largeJumps.map(j => ({
        step: j.stepIndex,
        jump: `${j.jump}s`,
      })),
    });
  }
  
  return largeJumps;
}


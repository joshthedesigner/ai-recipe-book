/**
 * Position-Based Fallback Strategy
 * 
 * Estimates timestamps based on step position when other strategies fail
 */

import { PreprocessedStep } from '../preprocessing';
import { getConfig } from '../config';
import { logger } from '../logger';

export interface PositionMatchResult {
  stepIndex: number;
  timestamp: number;
  confidence: number;
  reasoning: string;
}

/**
 * Estimate timestamp based on step position
 */
export function matchStepsPosition(
  steps: PreprocessedStep[],
  videoLength: number,
  existingMatches?: Array<{ stepIndex: number; timestamp: number }>
): PositionMatchResult[] {
  const config = getConfig();
  
  if (!config.usePositionFallback) {
    logger.debug('Position fallback disabled, skipping');
    return [];
  }
  
  logger.stage('position fallback', {
    stepCount: steps.length,
    videoLength,
    existingMatches: existingMatches?.length || 0,
  });
  
  const matches: PositionMatchResult[] = [];
  const matchedStepIndices = new Set(existingMatches?.map(m => m.stepIndex) || []);
  
  // Sort existing matches by step index
  const sortedExisting = existingMatches ? [...existingMatches].sort((a, b) => a.stepIndex - b.stepIndex) : [];
  
  for (let i = 0; i < steps.length; i++) {
    // Skip if already matched
    if (matchedStepIndices.has(i)) continue;
    
    const step = steps[i];
    let estimatedTimestamp: number;
    let reasoning: string;
    
    // Strategy 1: Interpolate between surrounding matches
    const prevMatch = sortedExisting.find(m => m.stepIndex < i);
    const nextMatch = sortedExisting.find(m => m.stepIndex > i);
    
    if (prevMatch && nextMatch) {
      // Interpolate between previous and next
      const gap = nextMatch.timestamp - prevMatch.timestamp;
      const stepsBetween = nextMatch.stepIndex - prevMatch.stepIndex;
      const stepPosition = i - prevMatch.stepIndex;
      estimatedTimestamp = prevMatch.timestamp + (gap / stepsBetween) * stepPosition;
      reasoning = `Interpolated between step ${prevMatch.stepIndex} (${prevMatch.timestamp}s) and step ${nextMatch.stepIndex} (${nextMatch.timestamp}s)`;
    } else if (prevMatch) {
      // Estimate based on average step duration after previous match
      const remainingSteps = steps.length - prevMatch.stepIndex - 1;
      const remainingTime = videoLength - prevMatch.timestamp;
      const avgStepDuration = remainingSteps > 0 ? remainingTime / remainingSteps : 10;
      const stepPosition = i - prevMatch.stepIndex;
      estimatedTimestamp = prevMatch.timestamp + avgStepDuration * stepPosition;
      reasoning = `Estimated after step ${prevMatch.stepIndex} (${prevMatch.timestamp}s) using average step duration`;
    } else if (nextMatch) {
      // Estimate based on average step duration before next match
      const stepsBefore = nextMatch.stepIndex;
      const timeBefore = nextMatch.timestamp;
      const avgStepDuration = stepsBefore > 0 ? timeBefore / stepsBefore : 10;
      const stepPosition = nextMatch.stepIndex - i;
      estimatedTimestamp = nextMatch.timestamp - avgStepDuration * stepPosition;
      reasoning = `Estimated before step ${nextMatch.stepIndex} (${nextMatch.timestamp}s) using average step duration`;
    } else {
      // No existing matches - use uniform distribution
      const stepRatio = i / (steps.length - 1 || 1);
      estimatedTimestamp = stepRatio * videoLength;
      reasoning = `Estimated using uniform distribution (step ${i + 1} of ${steps.length})`;
    }
    
    // Ensure timestamp is within bounds
    estimatedTimestamp = Math.max(0, Math.min(estimatedTimestamp, videoLength - 1));
    
    // Lower confidence for position-based matches
    const confidence = config.positionFallbackThreshold;
    
    matches.push({
      stepIndex: step.index,
      timestamp: Math.floor(estimatedTimestamp),
      confidence,
      reasoning,
    });
    
    logger.matchResult(
      step.index,
      estimatedTimestamp,
      confidence,
      'position',
      { reasoning }
    );
  }
  
  logger.info(`Position fallback complete: ${matches.length} estimated timestamps`, {
    estimatedCount: matches.length,
  });
  
  return matches;
}



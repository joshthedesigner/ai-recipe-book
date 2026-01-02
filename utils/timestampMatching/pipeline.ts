/**
 * Timestamp Matching Pipeline
 * 
 * Main entry point for the complete timestamp matching system
 * Orchestrates all strategies and produces final results
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateTimestampMatchingInput, assertValid } from './validation';
import { preprocessTimestampMatchingInput } from './preprocessing';
import { matchStepsExact, matchStepsSemantic, matchStepsPosition } from './matching';
import { buildConsensus } from './consensus';
import { enforceChronologicalOrder } from './chronological';
import { generateQualityReport, formatQualityReport } from './quality';
import { logger } from './logger';
import { getConfig } from './config';
import { MatchingError } from './errors';

export interface TimestampMatchingResult {
  stepTimestamps: (number | null)[]; // Array aligned with steps (null for unmatched)
  matches: Array<{
    stepIndex: number;
    timestamp: number;
    confidence: number;
    strategy: string;
  }>;
  qualityReport: {
    overallScore: number;
    matchRate: number;
    averageConfidence: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
  metadata: {
    totalSteps: number;
    matchedSteps: number;
    strategiesUsed: string[];
    processingTimeMs: number;
  };
}

/**
 * Match recipe steps to video timestamps
 * 
 * This is the main function to use for timestamp matching.
 * It orchestrates all strategies and returns final results.
 */
export async function matchTimestamps(
  steps: string[],
  segments: TranscriptSegment[],
  videoLength: number,
  videoId: string,
  supabase: SupabaseClient
): Promise<TimestampMatchingResult> {
  const startTime = Date.now();
  const config = getConfig();
  
  logger.stage('timestamp matching pipeline', {
    videoId,
    stepCount: steps.length,
    segmentCount: segments.length,
    videoLength,
  });
  
  try {
    // 1. Validate inputs
    logger.debug('Validating inputs');
    const validation = validateTimestampMatchingInput(steps, segments, videoLength, videoId);
    assertValid(validation, 'timestamp matching input');
    
    // 2. Preprocess
    logger.debug('Preprocessing steps and segments');
    const preprocessed = preprocessTimestampMatchingInput(steps, segments, videoLength);
    
    // 3. Run matching strategies
    const exactMatches: any[] = [];
    const semanticMatches: any[] = [];
    const positionMatches: any[] = [];
    
    // Strategy 1: Exact matching
    if (config.useExactMatching) {
      logger.debug('Running exact matching strategy');
      const exact = matchStepsExact(
        preprocessed.steps,
        preprocessed.segments
      );
      exactMatches.push(...exact);
    }
    
    // Strategy 2: Semantic matching
    if (config.useSemanticMatching && exactMatches.length < steps.length) {
      logger.debug('Running semantic matching strategy');
      try {
        const semantic = await matchStepsSemantic(
          preprocessed.steps,
          preprocessed.segments,
          videoId,
          supabase,
          {
            excludeSegmentIndices: new Set(exactMatches.map(m => m.segmentIndex)),
          }
        );
        semanticMatches.push(...semantic);
      } catch (error) {
        logger.warn('Semantic matching failed, continuing without it', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue without semantic matching
      }
    }
    
    // Strategy 3: Position fallback (for unmatched steps)
    const matchedStepIndices = new Set([
      ...exactMatches.map(m => m.stepIndex),
      ...semanticMatches.map(m => m.stepIndex),
    ]);
    
    if (config.usePositionFallback && matchedStepIndices.size < steps.length) {
      logger.debug('Running position fallback strategy');
      const existingMatches = [
        ...exactMatches.map(m => ({ stepIndex: m.stepIndex, timestamp: m.timestamp })),
        ...semanticMatches.map(m => ({ stepIndex: m.stepIndex, timestamp: m.timestamp })),
      ];
      
      const position = matchStepsPosition(
        preprocessed.steps,
        videoLength,
        existingMatches
      );
      positionMatches.push(...position);
    }
    
    // 4. Build consensus
    logger.debug('Building consensus from all strategies');
    const consensusResult = buildConsensus(
      exactMatches,
      semanticMatches,
      positionMatches
    );
    
    // 5. Enforce chronological order
    logger.debug('Enforcing chronological order');
    const chronologicalResult = enforceChronologicalOrder(
      consensusResult.matches,
      videoLength
    );
    
    // 6. Generate quality report
    logger.debug('Generating quality report');
    const qualityReport = generateQualityReport(
      chronologicalResult.matches,
      steps.length,
      chronologicalResult.violations,
      consensusResult
    );
    
    // 7. Build final result array (aligned with steps)
    const stepTimestamps: (number | null)[] = new Array(steps.length).fill(null);
    for (const match of chronologicalResult.matches) {
      stepTimestamps[match.stepIndex] = match.timestamp;
    }
    
    const processingTime = Date.now() - startTime;
    logger.performance('timestamp matching pipeline', processingTime, {
      videoId,
      matchedSteps: chronologicalResult.matches.length,
      matchRate: qualityReport.matchRate,
    });
    
    // 8. Collect strategies used
    const strategiesUsed = [
      ...(exactMatches.length > 0 ? ['exact'] : []),
      ...(semanticMatches.length > 0 ? ['semantic'] : []),
      ...(positionMatches.length > 0 ? ['position'] : []),
    ];
    
    return {
      stepTimestamps,
      matches: chronologicalResult.matches.map(m => ({
        stepIndex: m.stepIndex,
        timestamp: m.timestamp,
        confidence: m.confidence,
        strategy: m.strategy || 'unknown',
      })),
      qualityReport: {
        overallScore: qualityReport.overallScore,
        matchRate: qualityReport.matchRate,
        averageConfidence: qualityReport.averageConfidence,
        quality: qualityReport.quality,
        recommendations: qualityReport.recommendations,
      },
      metadata: {
        totalSteps: steps.length,
        matchedSteps: chronologicalResult.matches.length,
        strategiesUsed,
        processingTimeMs: processingTime,
      },
    };
  } catch (error) {
    logger.error('Timestamp matching pipeline failed', error instanceof Error ? error : new Error(String(error)), {
      videoId,
    });
    
    throw new MatchingError(
      'Failed to match timestamps',
      {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Format matching result as human-readable summary
 */
export function formatMatchingResult(result: TimestampMatchingResult): string {
  const lines: string[] = [];
  
  lines.push('⏱️  Timestamp Matching Results');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Matched: ${result.metadata.matchedSteps}/${result.metadata.totalSteps} steps`);
  lines.push(`Quality: ${result.qualityReport.quality.toUpperCase()}`);
  lines.push(`Overall Score: ${(result.qualityReport.overallScore * 100).toFixed(1)}%`);
  lines.push(`Average Confidence: ${result.qualityReport.averageConfidence.toFixed(2)}`);
  lines.push(`Processing Time: ${result.metadata.processingTimeMs}ms`);
  lines.push(`Strategies Used: ${result.metadata.strategiesUsed.join(', ')}`);
  lines.push('');
  lines.push('Recommendations:');
  for (const rec of result.qualityReport.recommendations) {
    lines.push(`  • ${rec}`);
  }
  
  return lines.join('\n');
}


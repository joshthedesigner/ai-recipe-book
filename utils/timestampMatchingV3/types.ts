/**
 * Types for Timestamp Matching V3
 * 
 * Simple, reliable system based on proven old system logic
 * with improvements for later steps and header matching
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';

/**
 * Match result from text matching
 */
export interface MatchResult {
  segment: TranscriptSegment;
  timestamp: number; // seconds
  confidence: number; // 0-1
  matchType: 'exact' | 'fuzzy' | 'keyphrase';
}

/**
 * Matching constraints
 */
export interface MatchConstraints {
  excludeIndices?: Set<number>;
  minTimestamp?: number;
  maxTimestamp?: number;
  allowReuse?: boolean; // Allow reusing segments for exact matches
}

/**
 * Result of timestamp matching
 */
export interface TimestampMatchingResult {
  stepTimestamps: (number | undefined)[]; // Sparse array aligned with steps
  sectionTimestamps: (number | undefined)[]; // Sparse array aligned with sections
  metadata: {
    totalSteps: number;
    matchedSteps: number;
    interpolatedSteps: number;
    totalSections: number;
    matchedHeaders: number;
    processingTimeMs: number;
  };
}



/**
 * Types for Steps-First Timestamp Matching System
 * 
 * This module implements a new architecture that matches steps first,
 * then derives section boundaries and header timestamps from matched steps.
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';

/**
 * A matched step with its timestamp and metadata
 */
export interface MatchedStep {
  stepIndex: number; // Index in original steps array
  stepText: string;
  timestamp: number; // In seconds
  confidence: number; // 0-1
  matchType: 'exact' | 'fuzzy' | 'keyphrase' | 'position';
  segmentIndex: number; // Index in transcript segments
  sectionIndex?: number; // Which section this step belongs to (if known)
}

/**
 * An unmatched step (no timestamp found)
 */
export interface UnmatchedStep {
  stepIndex: number;
  stepText: string;
  sectionIndex?: number;
  reason?: string; // Why it didn't match
}

/**
 * Section with derived boundaries and header timestamp
 */
export interface SectionWithBoundaries {
  section: RecipeSection;
  headerTimestamp?: number; // Derived from min(step timestamps in section)
  lowerBound: number; // Min timestamp of steps in this section
  upperBound: number; // Min timestamp of steps in next section, or Infinity
  stepIndices: number[]; // Indices of steps that belong to this section
  matchedStepCount: number;
  totalStepCount: number;
}

/**
 * Result of step matching phase
 */
export interface StepMatchingResult {
  matchedSteps: MatchedStep[];
  unmatchedSteps: UnmatchedStep[];
  totalSteps: number;
  matchRate: number; // 0-1
  averageConfidence: number;
}

/**
 * Result of boundary derivation phase
 */
export interface BoundaryDerivationResult {
  sections: SectionWithBoundaries[];
  flatSteps: string[];
  stepTimestamps: (number | undefined)[]; // Sparse array aligned with flatSteps
  violations: {
    headerBeforePreviousStep: number;
    crossBoundaryMatches: number;
    largeGaps: number;
  };
}

/**
 * Final result of the complete matching pipeline
 */
export interface TimestampMatchingResult {
  stepTimestamps: (number | undefined)[]; // Sparse array aligned with steps
  sectionTimestamps: (number | undefined)[]; // Sparse array aligned with sections
  quality: {
    matchRate: number;
    averageConfidence: number;
    chronologicalViolations: number;
    missingTimestamps: number;
  };
  metadata: {
    totalSteps: number;
    matchedSteps: number;
    totalSections: number;
    sectionsWithHeaders: number;
    processingTimeMs: number;
  };
}

/**
 * Configuration for matching
 */
export interface MatchingConfig {
  // Text matching thresholds
  exactMatchThreshold: number; // 1.0 (exact match)
  fuzzyMatchThreshold: number; // 0.7 (default)
  adaptiveThresholds: {
    shortStep: number; // < 10 words
    mediumStep: number; // 10-20 words
    longStep: number; // > 20 words
  };
  
  // Temporal constraints
  maxBackwardJump: number; // seconds (default: 5)
  maxGapForInterpolation: number; // seconds (default: 120)
  
  // Boundary derivation
  boundaryBuffer: number; // seconds to add as buffer between sections (default: 5)
  
  // Validation
  maxChronologicalViolation: number; // seconds (default: 10)
  minConfidenceForMatch: number; // 0-1 (default: 0.5)
}



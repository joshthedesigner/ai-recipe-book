/**
 * Configuration for Steps-First Timestamp Matching System
 */

import { MatchingConfig } from './types';

export const DEFAULT_CONFIG: MatchingConfig = {
  exactMatchThreshold: 1.0,
  fuzzyMatchThreshold: 0.7,
  adaptiveThresholds: {
    shortStep: 0.4, // < 10 words (lowered from 0.5)
    mediumStep: 0.6, // 10-20 words (lowered from 0.7)
    longStep: 0.7, // > 20 words (lowered from 0.8)
  },
  maxBackwardJump: 10, // seconds (increased from 5 to allow more flexibility)
  maxGapForInterpolation: 120, // 2 minutes
  boundaryBuffer: 5, // seconds
  maxChronologicalViolation: 10, // seconds
  minConfidenceForMatch: 0.4, // Lowered from 0.5
};

export function getConfig(): MatchingConfig {
  // Could read from env vars or allow overrides
  return DEFAULT_CONFIG;
}


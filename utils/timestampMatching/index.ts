/**
 * Timestamp Matching System
 * 
 * Main entry point for the redesigned timestamp matching pipeline
 */

// Configuration
export { getConfig, DEFAULT_CONFIG, type TimestampMatchingConfig } from './config';

// Error handling
export {
  TimestampMatchingError,
  ValidationError,
  MatchingError,
  ApiError,
  TimeoutError,
  CacheError,
  withRetry,
  isRetryableError,
  type RetryOptions,
} from './errors';

// Validation
export {
  validateSteps,
  validateSegments,
  validateVideoMetadata,
  validateTimestampMatchingInput,
  assertValid,
  type ValidationResult,
} from './validation';

// Logging
export { logger, LogLevel, type LogContext } from './logger';

// Cache
export {
  getCachedEmbeddings,
  cacheEmbeddings,
  cleanupExpiredCache,
  type CachedEmbedding,
} from './cache';

// Preprocessing
export {
  preprocessSteps,
  preprocessSegments,
  preprocessTimestampMatchingInput,
  type PreprocessedStep,
  type PreprocessedSegment,
  type PreprocessedData,
} from './preprocessing';

// Chronological validation
export {
  enforceChronologicalOrder,
  validateChronologicalOrder,
  detectLargeJumps,
  type TimestampMatch,
  type ChronologicalResult,
} from './chronological';

// Matching strategies
export {
  matchStepToSegment,
  matchStepsExact,
  matchStepsSemantic,
  matchStepsPosition,
  type ExactMatchResult,
  type SemanticMatchResult,
  type PositionMatchResult,
} from './matching';

// Consensus system
export {
  buildConsensus,
  type ConsensusMatch,
  type ConsensusResult,
} from './consensus';

// Quality metrics
export {
  generateQualityReport,
  formatQualityReport,
  type QualityReport,
} from './quality';

// Main pipeline
export {
  matchTimestamps,
  formatMatchingResult,
  type TimestampMatchingResult,
} from './pipeline';


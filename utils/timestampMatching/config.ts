/**
 * Timestamp Matching Configuration
 * 
 * Centralized configuration for all timestamp matching thresholds and settings
 */

export interface TimestampMatchingConfig {
  // Matching thresholds
  exactMatchThreshold: number;      // 0.85 - High confidence exact matches
  semanticMatchThreshold: number;    // 0.75 - Semantic embedding matches
  fuzzyMatchThreshold: number;       // 0.50 - Fuzzy text matches
  positionFallbackThreshold: number; // 0.30 - Minimum for position fallback
  
  // Chronological constraints
  minStepGapSeconds: number;         // 2 - Minimum gap between steps
  maxTimestampJumpSeconds: number;   // 30 - Flag large jumps for review
  
  // API settings
  embeddingModel: string;            // 'text-embedding-3-small'
  aiModel: string;                   // 'gpt-4o-mini'
  embeddingTimeoutMs: number;       // 30000 - 30 seconds
  aiTimeoutMs: number;               // 60000 - 60 seconds
  maxRetries: number;                // 3 - Max retry attempts
  retryDelayMs: number;              // 1000 - Initial retry delay
  
  // Caching
  cacheTtlDays: number;              // 30 - Cache TTL in days
  enableCaching: boolean;             // true - Enable embedding cache
  
  // Quality thresholds
  excellentMatchRate: number;        // 0.90 - 90%+ match rate
  excellentConfidence: number;       // 0.80 - 0.8+ avg confidence
  goodMatchRate: number;             // 0.70 - 70%+ match rate
  goodConfidence: number;            // 0.60 - 0.6+ avg confidence
  
  // Strategy selection
  useExactMatching: boolean;         // true
  useSemanticMatching: boolean;      // true
  useAiMatching: boolean;            // true - Use as fallback
  usePositionFallback: boolean;      // true - Always enabled
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: TimestampMatchingConfig = {
  exactMatchThreshold: 0.85,
  semanticMatchThreshold: 0.75,
  fuzzyMatchThreshold: 0.50,
  positionFallbackThreshold: 0.30,
  
  minStepGapSeconds: 2,
  maxTimestampJumpSeconds: 30,
  
  embeddingModel: 'text-embedding-3-small',
  aiModel: 'gpt-4o-mini',
  embeddingTimeoutMs: 30000,
  aiTimeoutMs: 60000,
  maxRetries: 3,
  retryDelayMs: 1000,
  
  cacheTtlDays: 30,
  enableCaching: true,
  
  excellentMatchRate: 0.90,
  excellentConfidence: 0.80,
  goodMatchRate: 0.70,
  goodConfidence: 0.60,
  
  useExactMatching: true,
  useSemanticMatching: true,
  useAiMatching: true,
  usePositionFallback: true,
};

/**
 * Get configuration with environment variable overrides
 */
export function getConfig(): TimestampMatchingConfig {
  return {
    ...DEFAULT_CONFIG,
    // Allow environment variable overrides
    embeddingModel: process.env.TIMESTAMP_EMBEDDING_MODEL || DEFAULT_CONFIG.embeddingModel,
    aiModel: process.env.TIMESTAMP_AI_MODEL || DEFAULT_CONFIG.aiModel,
    enableCaching: process.env.TIMESTAMP_ENABLE_CACHE !== 'false',
  };
}



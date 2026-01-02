/**
 * Semantic Matching Strategy
 * 
 * Uses OpenAI embeddings to match steps to segments semantically
 * Handles paraphrasing and variations in wording
 */

import OpenAI from 'openai';
import { PreprocessedStep, PreprocessedSegment } from '../preprocessing';
import { getConfig } from '../config';
import { logger } from '../logger';
import { ApiError, TimeoutError, withRetry, isRetryableError } from '../errors';
import { getCachedEmbeddings, cacheEmbeddings } from '../cache';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SemanticMatchResult {
  stepIndex: number;
  segmentIndex: number;
  timestamp: number;
  confidence: number;
  similarity: number;
  reasoning?: string;
}

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError('OPENAI_API_KEY environment variable is not set', 500, false);
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * Generate embeddings for texts (with caching)
 */
async function generateEmbeddings(
  texts: string[],
  supabase: SupabaseClient,
  videoId: string,
  indices: number[],
  cacheKeyPrefix: 'step' | 'segment'
): Promise<number[][]> {
  const config = getConfig();
  const client = getOpenAIClient();
  
  // Check cache first
  const cached = await getCachedEmbeddings(supabase, videoId, indices);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];
  
  const embeddings: (number[] | null)[] = new Array(texts.length).fill(null);
  
  // Fill in cached embeddings
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    const cachedEmbedding = cached.get(idx);
    if (cachedEmbedding) {
      embeddings[i] = cachedEmbedding;
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(texts[i]);
    }
  }
  
  // Generate embeddings for uncached texts
  if (uncachedTexts.length > 0) {
    logger.debug(`Generating ${uncachedTexts.length} embeddings (${cached.size} cached)`, {
      videoId,
      cacheKeyPrefix,
    });
    
    try {
      const embeddingResults = await withRetry(
        async () => {
          const response = await Promise.race([
            client.embeddings.create({
              model: config.embeddingModel,
              input: uncachedTexts,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new TimeoutError('Embedding generation timeout')), config.embeddingTimeoutMs)
            ),
          ]);
          
          return response;
        },
        {
          maxRetries: config.maxRetries,
          delayMs: config.retryDelayMs,
          retryable: isRetryableError,
        }
      );
      
      // Store uncached embeddings
      const uncachedEmbeddings = new Map<number, number[]>();
      for (let i = 0; i < uncachedIndices.length; i++) {
        const embedding = embeddingResults.data[i].embedding;
        const originalIndex = uncachedIndices[i];
        // Find the position in the embeddings array for this original index
        const positionInArray = indices.indexOf(originalIndex);
        if (positionInArray !== -1) {
          embeddings[positionInArray] = embedding;
        }
        uncachedEmbeddings.set(originalIndex, embedding);
      }
      
      // Cache the new embeddings
      await cacheEmbeddings(supabase, videoId, uncachedEmbeddings);
      
      logger.debug(`Generated and cached ${uncachedEmbeddings.size} embeddings`, { videoId });
    } catch (error) {
      logger.error('Failed to generate embeddings', error instanceof Error ? error : new Error(String(error)), {
        videoId,
        uncachedCount: uncachedTexts.length,
      });
      throw new ApiError(
        'Failed to generate embeddings',
        error instanceof ApiError ? error.statusCode : 500,
        isRetryableError(error instanceof Error ? error : new Error(String(error))),
        { videoId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  // Fill in any remaining nulls (shouldn't happen, but safety check)
  const finalEmbeddings: number[][] = [];
  for (const emb of embeddings) {
    if (emb === null) {
      throw new ApiError('Missing embedding after generation', 500, false);
    }
    finalEmbeddings.push(emb);
  }
  
  return finalEmbeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Match steps to segments using semantic embeddings
 */
export async function matchStepsSemantic(
  steps: PreprocessedStep[],
  segments: PreprocessedSegment[],
  videoId: string,
  supabase: SupabaseClient,
  constraints?: {
    minTimestamp?: number;
    maxTimestamp?: number;
    excludeSegmentIndices?: Set<number>;
  }
): Promise<SemanticMatchResult[]> {
  const config = getConfig();
  
  if (!config.useSemanticMatching) {
    logger.debug('Semantic matching disabled, skipping');
    return [];
  }
  
  logger.stage('semantic matching', {
    videoId,
    stepCount: steps.length,
    segmentCount: segments.length,
  });
  
  try {
    // Generate embeddings for steps
    const stepTexts = steps.map(s => s.originalText);
    const stepIndices = steps.map(s => s.index);
    const stepEmbeddings = await generateEmbeddings(
      stepTexts,
      supabase,
      videoId,
      stepIndices,
      'step'
    );
    
    // Generate embeddings for segments
    const segmentTexts = segments.map(s => s.originalText);
    const segmentIndices = segments.map(s => s.index);
    const segmentEmbeddings = await generateEmbeddings(
      segmentTexts,
      supabase,
      videoId,
      segmentIndices,
      'segment'
    );
    
    // Calculate similarity matrix
    logger.debug('Calculating similarity matrix', {
      stepCount: steps.length,
      segmentCount: segments.length,
    });
    
    const matches: SemanticMatchResult[] = [];
    const usedSegmentIndices = new Set<number>(constraints?.excludeSegmentIndices || []);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepEmbedding = stepEmbeddings[i];
      let bestMatch: { segmentIndex: number; similarity: number } | null = null;
      
      for (let j = 0; j < segments.length; j++) {
        // Skip already used segments
        if (usedSegmentIndices.has(segments[j].index)) continue;
        
        // Check timestamp constraints
        const segmentTimestamp = Math.floor(segments[j].startMs / 1000);
        if (constraints) {
          if (constraints.minTimestamp !== undefined && segmentTimestamp < constraints.minTimestamp) {
            continue;
          }
          if (constraints.maxTimestamp !== undefined && segmentTimestamp >= constraints.maxTimestamp) {
            continue;
          }
        }
        
        const segmentEmbedding = segmentEmbeddings[j];
        const similarity = cosineSimilarity(stepEmbedding, segmentEmbedding);
        
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            segmentIndex: segments[j].index,
            similarity,
          };
        }
      }
      
      if (bestMatch && bestMatch.similarity >= config.semanticMatchThreshold) {
        const segment = segments.find(s => s.index === bestMatch!.segmentIndex)!;
        const timestamp = Math.floor(segment.startMs / 1000);
        
        matches.push({
          stepIndex: step.index,
          segmentIndex: bestMatch.segmentIndex,
          timestamp,
          confidence: bestMatch.similarity,
          similarity: bestMatch.similarity,
          reasoning: `Semantic match (similarity: ${bestMatch.similarity.toFixed(3)})`,
        });
        
        usedSegmentIndices.add(bestMatch.segmentIndex);
        
        logger.matchResult(
          step.index,
          timestamp,
          bestMatch.similarity,
          'semantic',
          { similarity: bestMatch.similarity.toFixed(3) }
        );
      }
    }
    
    logger.info(`Semantic matching complete: ${matches.length}/${steps.length} matches`, {
      matchRate: matches.length / steps.length,
      avgSimilarity: matches.length > 0
        ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
        : 0,
    });
    
    return matches;
  } catch (error) {
    logger.error('Semantic matching failed', error instanceof Error ? error : new Error(String(error)), {
      videoId,
    });
    
    // Don't fail entire operation, return empty matches
    if (error instanceof ApiError && !error.retryable) {
      logger.warn('Non-retryable API error, returning empty matches');
      return [];
    }
    
    throw error;
  }
}


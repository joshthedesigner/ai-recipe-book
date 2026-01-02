/**
 * Embedding Cache for Timestamp Matching
 * 
 * Caches transcript segment embeddings to reduce API costs
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CacheError } from './errors';
import { logger } from './logger';
import { getConfig } from './config';

export interface CachedEmbedding {
  videoId: string;
  segmentIndex: number;
  embedding: number[];
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Get cached embeddings for a video
 */
export async function getCachedEmbeddings(
  supabase: SupabaseClient,
  videoId: string,
  segmentIndices: number[]
): Promise<Map<number, number[]>> {
  const config = getConfig();
  
  if (!config.enableCaching) {
    return new Map();
  }
  
  try {
    const { data, error } = await supabase
      .from('embedding_cache')
      .select('segment_index, embedding, expires_at')
      .eq('video_id', videoId)
      .in('segment_index', segmentIndices)
      .gt('expires_at', new Date().toISOString()); // Only get non-expired
    
    if (error) {
      logger.warn('Failed to fetch cached embeddings', { videoId, error: error.message });
      throw new CacheError('Failed to fetch cached embeddings', { videoId, error: error.message });
    }
    
    const cache = new Map<number, number[]>();
    
    if (data) {
      for (const row of data) {
        cache.set(row.segment_index, row.embedding);
      }
    }
    
    logger.debug(`Retrieved ${cache.size}/${segmentIndices.length} cached embeddings`, { videoId });
    
    return cache;
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    
    logger.warn('Error fetching cached embeddings, continuing without cache', { 
      videoId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Don't fail the entire operation if cache fails
    return new Map();
  }
}

/**
 * Store embeddings in cache
 */
export async function cacheEmbeddings(
  supabase: SupabaseClient,
  videoId: string,
  embeddings: Map<number, number[]>
): Promise<void> {
  const config = getConfig();
  
  if (!config.enableCaching || embeddings.size === 0) {
    return;
  }
  
  try {
    // Prepare cache entries
    const cacheEntries = Array.from(embeddings.entries()).map(([segmentIndex, embedding]) => ({
      video_id: videoId,
      segment_index: segmentIndex,
      embedding: embedding,
    }));
    
    // Insert in batches (Supabase has limits)
    const batchSize = 100;
    for (let i = 0; i < cacheEntries.length; i += batchSize) {
      const batch = cacheEntries.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('embedding_cache')
        .upsert(batch, {
          onConflict: 'video_id,segment_index',
          ignoreDuplicates: false,
        });
      
      if (error) {
        logger.warn('Failed to cache embeddings', { 
          videoId, 
          batch: i / batchSize + 1,
          error: error.message 
        });
        // Continue with other batches even if one fails
      }
    }
    
    logger.debug(`Cached ${embeddings.size} embeddings`, { videoId });
  } catch (error) {
    logger.warn('Error caching embeddings, continuing without cache', { 
      videoId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Don't fail the entire operation if cache fails
  }
}

/**
 * Clean up expired cache entries (run periodically)
 */
export async function cleanupExpiredCache(supabase: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_embeddings');
    
    if (error) {
      logger.error('Failed to cleanup expired cache', new Error(error.message));
      throw new CacheError('Failed to cleanup expired cache', { error: error.message });
    }
    
    const deletedCount = data || 0;
    logger.info(`Cleaned up ${deletedCount} expired cache entries`);
    
    return deletedCount;
  } catch (error) {
    if (error instanceof CacheError) {
      throw error;
    }
    
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error cleaning up cache', err);
    
    throw new CacheError('Error cleaning up cache', { 
      error: err.message 
    });
  }
}


/**
 * Vector Search Utility
 * 
 * Purpose: Perform semantic similarity search on recipes
 * Uses: Supabase pgvector with cosine similarity
 */

import { supabase } from '@/db/supabaseClient';
import { Recipe } from '@/types';
import { generateEmbedding } from './embed';
import { logger } from '@/utils/logger';

// Optimized field selection - excludes heavy embedding vector (6KB per recipe)
const RECIPE_FIELDS = 'id, user_id, title, ingredients, steps, tags, source_url, image_url, contributor_name, created_at, updated_at';

export interface SearchOptions {
  matchThreshold?: number;  // Minimum similarity (0-1), default 0.7
  matchCount?: number;      // Max results to return, default 10
  userId?: string;          // Optional: filter by user
}

export interface SearchResult extends Recipe {
  similarity: number;       // Similarity score (0-1)
}

/**
 * Search recipes by natural language query
 * Uses vector similarity to find semantically similar recipes
 */
export async function searchRecipes(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  try {
    const {
      matchThreshold = 0.7,
      matchCount = 10,
    } = options;

    // Generate embedding for the search query
    logger.log('Generating embedding for query:', query);
    const queryEmbedding = await generateEmbedding(query);

    // Call the match_recipes function from the database
    logger.log('Searching recipes with similarity threshold:', matchThreshold);
    const { data, error } = await supabase.rpc('match_recipes', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      logger.error('Error searching recipes:', error);
      throw error;
    }

    logger.log(`Found ${data?.length || 0} matching recipes`);
    return data || [];

  } catch (error) {
    logger.error('Error in searchRecipes:', error);
    throw error;
  }
}

/**
 * Search recipes by keyword (non-semantic)
 * Useful for exact matches on title, tags, or ingredients
 */
export async function searchRecipesByKeyword(
  keyword: string,
  options: SearchOptions = {}
): Promise<Recipe[]> {
  try {
    const { matchCount = 10 } = options;

    const searchTerm = `%${keyword.toLowerCase()}%`;

    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_FIELDS)
      .or(`title.ilike.${searchTerm},tags.cs.{${keyword}},ingredients::text.ilike.${searchTerm}`)
      .limit(matchCount);

    if (error) {
      logger.error('Error searching recipes by keyword:', error);
      throw error;
    }

    logger.log(`Found ${data?.length || 0} recipes matching keyword: ${keyword}`);
    return data || [];

  } catch (error) {
    logger.error('Error in searchRecipesByKeyword:', error);
    throw error;
  }
}

/**
 * Get all recipes for a user (no search)
 */
export async function getAllRecipes(userId?: string): Promise<Recipe[]> {
  try {
    let query = supabase
      .from('recipes')
      .select(RECIPE_FIELDS)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error getting all recipes:', error);
      throw error;
    }

    return data || [];

  } catch (error) {
    logger.error('Error in getAllRecipes:', error);
    throw error;
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_FIELDS)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error('Error getting recipe:', error);
      throw error;
    }

    return data;

  } catch (error) {
    logger.error('Error in getRecipeById:', error);
    throw error;
  }
}


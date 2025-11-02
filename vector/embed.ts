/**
 * Embedding Generation Utility
 * 
 * Purpose: Generate vector embeddings for text using OpenAI
 * Model: text-embedding-3-small (1536 dimensions)
 * 
 * Used for:
 * - Recipe embeddings (for semantic search)
 * - Query embeddings (for finding similar recipes)
 */

import OpenAI from 'openai';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * Generate an embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient();
    
    // Clean and prepare text
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Cannot generate embedding for empty text');
    }

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dimensions
      input: cleanText,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const client = getOpenAIClient();
    
    // Clean texts
    const cleanTexts = texts.map(t => t.trim()).filter(t => t.length > 0);
    if (cleanTexts.length === 0) {
      throw new Error('Cannot generate embeddings for empty texts');
    }

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanTexts,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw error;
  }
}

/**
 * Create a searchable text representation of a recipe
 * Combines title, ingredients, steps, and tags into one string
 */
export function createRecipeSearchText(recipe: {
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
}): string {
  const parts = [
    `Title: ${recipe.title}`,
    `Ingredients: ${recipe.ingredients.join(', ')}`,
    `Steps: ${recipe.steps.join(' ')}`,
    `Tags: ${recipe.tags.join(', ')}`,
  ];
  
  return parts.join('\n');
}

/**
 * Get embedding dimensions for the current model
 */
export function getEmbeddingDimensions(): number {
  return 1536; // text-embedding-3-small
}


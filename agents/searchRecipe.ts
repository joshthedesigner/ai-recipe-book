/**
 * Search Recipe Agent
 * 
 * Purpose: Find recipes in the database using semantic search
 * 
 * Key Rules:
 * - Never invents recipes
 * - Returns only recipes from the database
 * - Uses vector similarity for semantic search
 * - Extracts search keywords from natural language
 * - Asks user if no results found
 */

import OpenAI from 'openai';
import { AgentResponse } from '@/types';
import { searchRecipes, searchRecipesByKeyword, SearchResult } from '@/vector/search';

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

const QUERY_EXTRACTION_PROMPT = `You are a search query optimizer. Extract MINIMAL search keywords from natural language recipe queries.

Critical Rules:
- ONLY remove filler/question words - NEVER add words
- Remove: "do you have", "show me", "find me", "I want", "looking for", "any", "?"
- Keep: ingredients, dish names, cuisine types, descriptors (quick, easy, healthy)
- Return the SIMPLEST form - do NOT add words like "recipes", "meals", "dishes"

Examples:
"fish?" → "fish"
"do you have fish recipes" → "fish"
"show me italian pasta dishes" → "italian pasta"
"find me something with chicken" → "chicken"
"I want quick vegetarian meals" → "quick vegetarian"
"looking for healthy breakfast" → "healthy breakfast"
"any desserts?" → "desserts"
"miso soup" → "miso soup"
"chicken?" → "chicken"

Return format: Just the minimal keywords as a single string. Do NOT add extra words.`;

/**
 * Extract search keywords from natural language query
 */
async function extractSearchKeywords(query: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: QUERY_EXTRACTION_PROMPT },
        { role: 'user', content: query }
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const extracted = response.choices[0].message.content?.trim() || query;
    console.log(`Query extraction: "${query}" → "${extracted}"`);
    
    return extracted;
  } catch (error) {
    console.error('Error extracting search keywords:', error);
    // Fall back to original query if extraction fails
    return query;
  }
}

export async function searchRecipe(
  query: string,
  userId?: string
): Promise<AgentResponse> {
  try {
    console.log('Searching for recipes:', query);

    // Step 1: Extract search keywords from natural language
    const searchKeywords = await extractSearchKeywords(query);
    console.log(`Query extraction: "${query}" → "${searchKeywords}"`);
    if (searchKeywords !== query) {
      console.log('Will fallback to original query if needed');
    }

    // Step 2: Try semantic search with extracted keywords
    let results = await searchRecipes(searchKeywords, {
      matchThreshold: 0.7,  // 70% similarity minimum
      matchCount: 10,
      userId,
    });

    // Step 3: If no results AND keywords differ from original, try original query
    if ((!results || results.length === 0) && searchKeywords !== query) {
      console.log(`No results for "${searchKeywords}", trying original query: "${query}"`);
      results = await searchRecipes(query, {
        matchThreshold: 0.7,
        matchCount: 10,
        userId,
      });
    }

    // Step 4: If still no results, try keyword search as fallback
    if (!results || results.length === 0) {
      console.log('No vector results, trying keyword search...');
      results = await searchRecipesByKeyword(searchKeywords, {
        matchCount: 10,
      }) as SearchResult[];
      
      // Try original query in keyword search too
      if ((!results || results.length === 0) && searchKeywords !== query) {
        console.log(`No keyword results for "${searchKeywords}", trying original: "${query}"`);
        results = await searchRecipesByKeyword(query, {
          matchCount: 10,
        }) as SearchResult[];
      }
    }

    // Step 5: Handle no results
    if (!results || results.length === 0) {
      return {
        success: true,
        message: `I couldn't find any recipes matching "${searchKeywords}" in your collection. 🔍\n\nTry:\n- Searching with different keywords\n- Browse all your recipes in the Browse tab\n- Add a "${searchKeywords}" recipe to your collection if you have one!`,
        data: [],
      };
    }

    // Step 6: Generate human-readable summary
    const summary = generateSearchSummary(searchKeywords, results);

    return {
      success: true,
      message: summary,
      data: results,
    };

  } catch (error) {
    console.error('Error in searchRecipe:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error searching for recipes. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a human-readable summary of search results
 */
function generateSearchSummary(query: string, results: SearchResult[]): string {
  const count = results.length;
  
  let summary = `🔍 Found ${count} recipe${count !== 1 ? 's' : ''} matching "${query}":\n\n`;

  results.slice(0, 5).forEach((recipe, index) => {
    const similarityPercent = Math.round((recipe.similarity || 0) * 100);
    const tagsList = recipe.tags.slice(0, 3).join(', ');
    
    summary += `${index + 1}. **${recipe.title}**\n`;
    if (recipe.similarity) {
      summary += `   Relevance: ${similarityPercent}%\n`;
    }
    summary += `   Tags: ${tagsList}\n`;
    summary += `   Ingredients: ${recipe.ingredients.length}\n`;
    summary += `\n`;
  });

  if (count > 5) {
    summary += `\n_...and ${count - 5} more recipe${count - 5 !== 1 ? 's' : ''}_\n`;
  }

  summary += `\nWould you like details on any of these recipes?`;

  return summary;
}


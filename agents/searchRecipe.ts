/**
 * Search Recipe Agent
 * 
 * Purpose: Find recipes in the database using semantic search
 * 
 * Key Rules:
 * - Never invents recipes
 * - Returns only recipes from the database
 * - Uses vector similarity for semantic search
 * - Asks user if no results found
 */

import { AgentResponse } from '@/types';
import { searchRecipes, searchRecipesByKeyword, SearchResult } from '@/vector/search';

export async function searchRecipe(
  query: string,
  userId?: string
): Promise<AgentResponse> {
  try {
    console.log('Searching for recipes:', query);

    // Step 1: Try semantic search first (vector similarity)
    let results = await searchRecipes(query, {
      matchThreshold: 0.7,  // 70% similarity minimum
      matchCount: 10,
      userId,
    });

    // Step 2: If no results, try keyword search as fallback
    if (!results || results.length === 0) {
      console.log('No vector results, trying keyword search...');
      results = await searchRecipesByKeyword(query, {
        matchCount: 10,
      }) as SearchResult[];
    }

    // Step 3: Handle no results
    if (!results || results.length === 0) {
      return {
        success: true,
        message: `I couldn't find any recipes matching "${query}" in your collection. 🔍\n\nTry:\n- Searching with different keywords\n- Browse all your recipes in the Browse tab\n- Add a "${query}" recipe to your collection if you have one!`,
        data: [],
      };
    }

    // Step 4: Generate human-readable summary
    const summary = generateSearchSummary(query, results);

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


/**
 * Dish Image Search Utility (Client-side)
 * 
 * Searches for food/dish images using the server-side API route.
 * This keeps the Pexels API key secure on the server.
 */

export interface ImageSearchResult {
  url: string | null;
  options?: string[];
  error?: string;
}

/**
 * Search for a dish image using recipe title, tags, ingredients, and steps
 * @param recipeTitle - The recipe title to search for
 * @param tags - Optional array of recipe tags (cuisine, ingredients, etc.)
 * @param ingredients - Optional array of ingredient strings
 * @param steps - Optional array of cooking step strings
 * @param customQuery - Optional custom search query to override the auto-generated query
 * @returns Image URL if found, null otherwise
 */
export async function searchDishImage(
  recipeTitle: string, 
  tags?: string[],
  ingredients?: string[],
  steps?: string[],
  customQuery?: string
): Promise<ImageSearchResult> {
  // Validate title
  if (!recipeTitle || recipeTitle.trim().length === 0) {
    return { url: null, error: 'Recipe title is required' };
  }

  try {
    console.log('🔍 Searching for dish image:', { recipeTitle, tags, ingredientsCount: ingredients?.length, stepsCount: steps?.length });

    // Call server-side API route
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch('/api/recipes/search-dish-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipeTitle, 
          tags: tags || [],
          ingredients: ingredients || [],
          steps: steps || [],
          customQuery: customQuery || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('Image search API error:', response.status, errorData.error);
        return { url: null, error: errorData.error || `API error: ${response.status}` };
      }

      const data = await response.json();

      if (data.success) {
        const url = data.url ?? null;
        const options = Array.isArray(data.options) ? data.options : undefined;
        if (url) {
          console.log('✅ Found dish image:', url);
        } else {
          console.log('No primary image found, options:', options?.length || 0);
        }
        return { url, options };
      }

      console.log('No images found for:', recipeTitle);
      return { url: null, options: [] };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn('Image search timed out');
        return { url: null, error: 'Request timed out' };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error searching for dish image:', error);
    // Fail gracefully - don't block recipe saving
    return { url: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


/**
 * Search Dish Image API Route
 * 
 * POST /api/recipes/search-dish-image
 * 
 * Purpose: Search for dish images using Bing Image Search API based on recipe title.
 * This keeps the Bing API key secure on the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const BING_IMAGE_SEARCH_KEY = process.env.BING_IMAGE_SEARCH_KEY;
const BING_IMAGE_SEARCH_ENDPOINT =
  process.env.BING_IMAGE_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/images/search';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
const GOOGLE_CUSTOM_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { recipeTitle, tags, ingredients, steps, customQuery } = await request.json();

    // Validate input
    if (!recipeTitle || typeof recipeTitle !== 'string' || recipeTitle.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipe title is required' },
        { status: 400 }
      );
    }

    // Check if API keys are configured - prefer Google, then Bing, fallback to Pexels
    const useGoogle = !!(GOOGLE_CUSTOM_SEARCH_API_KEY && GOOGLE_CUSTOM_SEARCH_ENGINE_ID);
    const useBing = !!BING_IMAGE_SEARCH_KEY;
    const usePexels = !!PEXELS_API_KEY;
    
    if (!useGoogle && !useBing && !usePexels) {
      return NextResponse.json(
        { success: false, error: 'Image search not configured (need GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID, BING_IMAGE_SEARCH_KEY, or PEXELS_API_KEY)' },
        { status: 503 }
      );
    }

    // If customQuery is provided, use it directly (for refinement searches)
    if (customQuery && typeof customQuery === 'string' && customQuery.trim().length > 0) {
      const searchQuery = `${customQuery.trim()} food photography close-up`;
      
      console.log('🔍 Refining image search with custom query:', searchQuery);

      // Try Google first if configured
      if (useGoogle) {
        try {
          const result = await searchWithGoogle(searchQuery, recipeTitle, '', [], [], [], null);
          if (result) return result;
          console.log('Google search failed or returned no results, falling back to Bing/Pexels');
        } catch (googleError) {
          console.warn('Google search error, falling back to Bing/Pexels:', googleError);
        }
      }

      // Try Bing if configured
      if (useBing) {
        try {
          const result = await searchWithBing(searchQuery, recipeTitle, '', [], [], [], null);
          if (result) return result;
          console.log('Bing search failed or returned no results, falling back to Pexels');
        } catch (bingError) {
          console.warn('Bing search error, falling back to Pexels:', bingError);
        }
      }

      // Fallback to Pexels if Google/Bing not configured or failed
      if (usePexels) {
        try {
          const result = await searchWithPexels(searchQuery, recipeTitle, '', [], [], [], null);
          if (result) return result;
        } catch (pexelsError) {
          console.error('Pexels search error:', pexelsError);
        }
      }

      console.log('No images found from any source for custom query:', searchQuery);
      return NextResponse.json({
        success: true,
        url: null,
        options: [],
      });
    }

    // Extract relevant tags
    const tagArray = Array.isArray(tags) ? tags : [];
    const cuisineTags = tagArray.filter((tag: string) => {
      const lowerTag = tag.toLowerCase();
      // Known cuisine tags
      return ['chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
        'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean',
        'indonesian', 'turkish', 'lebanese', 'persian', 'moroccan'].includes(lowerTag);
    });
    const ingredientTags = tagArray.filter((tag: string) => {
      const lowerTag = tag.toLowerCase();
      // Main ingredient/protein tags
      return ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'tofu', 'vegetarian', 'vegan'].includes(lowerTag);
    });

    // Extract key ingredients from ingredients list
    const extractKeyIngredients = (ingredientsList: string[]): string[] => {
      if (!Array.isArray(ingredientsList) || ingredientsList.length === 0) return [];
      
      // Common flavorful/distinctive ingredients that help identify dishes
      const keyIngredientKeywords = [
        'lemon', 'lime', 'garlic', 'ginger', 'basil', 'cilantro', 'parsley', 'rosemary', 'thyme', 'oregano',
        'tomato', 'onion', 'pepper', 'chili', 'paprika', 'cumin', 'coriander', 'turmeric', 'curry',
        'cheese', 'parmesan', 'mozzarella', 'feta', 'goat cheese',
        'mushroom', 'bell pepper', 'zucchini', 'eggplant', 'spinach', 'kale',
        'coconut', 'peanut', 'sesame', 'soy', 'miso', 'fish sauce',
        'wine', 'vinegar', 'balsamic', 'olive oil', 'butter'
      ];
      
      const titleLower = recipeTitle.toLowerCase();
      const foundIngredients: string[] = [];
      
      for (const ingredient of ingredientsList) {
        const ingLower = ingredient.toLowerCase();
        // Extract the main noun (remove quantities, measurements, etc.)
        const words = ingLower.split(/[\s,]+/).filter(w => w.length > 2);
        
        for (const word of words) {
          // Check if this word matches a key ingredient
          if (keyIngredientKeywords.some(keyword => word.includes(keyword) || keyword.includes(word))) {
            // Use the keyword itself (normalized)
            const matchedKeyword = keyIngredientKeywords.find(k => word.includes(k) || k.includes(word));
            if (matchedKeyword && !foundIngredients.includes(matchedKeyword) && !titleLower.includes(matchedKeyword)) {
              foundIngredients.push(matchedKeyword);
            }
          }
        }
        
        // Limit to top 3 key ingredients
        if (foundIngredients.length >= 3) break;
      }
      
      return foundIngredients;
    };

    // Extract cooking method from tags or steps
    const extractCookingMethod = (tagList: string[], stepsList: string[]): string | null => {
      // Cooking method tags
      const methodTags = ['grilled', 'baked', 'fried', 'roasted', 'braised', 'steamed', 'stir-fry', 'sauteed', 'boiled', 'poached'];
      
      // Check tags first
      for (const tag of tagList) {
        const lowerTag = tag.toLowerCase();
        if (methodTags.includes(lowerTag)) {
          return lowerTag;
        }
      }
      
      // Check steps for cooking verbs
      if (Array.isArray(stepsList) && stepsList.length > 0) {
        const stepsText = stepsList.join(' ').toLowerCase();
        const cookingVerbs = {
          'grill': 'grilled',
          'bake': 'baked',
          'roast': 'roasted',
          'fry': 'fried',
          'braise': 'braised',
          'steam': 'steamed',
          'stir-fry': 'stir-fry',
          'sauté': 'sauteed',
          'saute': 'sauteed',
          'boil': 'boiled',
          'poach': 'poached',
          'simmer': 'simmered',
          'sear': 'seared'
        };
        
        for (const [verb, method] of Object.entries(cookingVerbs)) {
          if (stepsText.includes(verb)) {
            return method;
          }
        }
      }
      
      return null;
    };

    const keyIngredients = extractKeyIngredients(ingredients || []);
    const cookingMethod = extractCookingMethod(tagArray, steps || []);

    // Clean and optimize search query
    // Remove common recipe words that don't help search
    const cleanedTitle = recipeTitle
      .toLowerCase()
      .replace(/\b(recipe|dish|food|meal|how to|easy|best|homemade|authentic)\b/gi, '')
      .trim();
    
    // Build comprehensive query with all available context
    // Structure: title + cuisine + main ingredient + key ingredients + cooking method + food photography
    const queryParts: string[] = [];
    
    // 1. Start with cleaned title
    queryParts.push(cleanedTitle || recipeTitle.toLowerCase());
    
    // 2. Add cuisine context (most important for accuracy)
    if (cuisineTags.length > 0) {
      queryParts.push(cuisineTags[0]);
    }
    
    // 3. Add main ingredient tag if not already in title
    if (ingredientTags.length > 0) {
      const mainIngredient = ingredientTags[0];
      const titleLower = recipeTitle.toLowerCase();
      if (!titleLower.includes(mainIngredient)) {
        queryParts.push(mainIngredient);
      }
    }
    
    // 4. Add key ingredients (up to 2 most distinctive)
    for (const ingredient of keyIngredients.slice(0, 2)) {
      queryParts.push(ingredient);
    }
    
    // 5. Add cooking method if available
    if (cookingMethod) {
      queryParts.push(cookingMethod);
    }
    
    // 6. Add food photography terms to focus on dish photos
    queryParts.push('food photography close-up');
    
    const searchQuery = queryParts.join(' ');
    
    console.log('🔍 Searching for dish image:', { 
      originalTitle: recipeTitle, 
      cuisineTags,
      ingredientTags,
      keyIngredients,
      cookingMethod,
      searchQuery 
    });

    // Try Google first if configured
    if (useGoogle) {
      try {
        const result = await searchWithGoogle(searchQuery, recipeTitle, cleanedTitle, cuisineTags, ingredientTags, keyIngredients, cookingMethod);
        if (result) return result;
        console.log('Google search failed or returned no results, falling back to Bing/Pexels');
      } catch (googleError) {
        console.warn('Google search error, falling back to Bing/Pexels:', googleError);
      }
    }

    // Try Bing if configured
    if (useBing) {
      try {
        const result = await searchWithBing(searchQuery, recipeTitle, cleanedTitle, cuisineTags, ingredientTags, keyIngredients, cookingMethod);
        if (result) return result;
        // If Bing fails, fall through to Pexels fallback
        console.log('Bing search failed or returned no results, falling back to Pexels');
      } catch (bingError) {
        console.warn('Bing search error, falling back to Pexels:', bingError);
        // Fall through to Pexels fallback
      }
    }

    // Fallback to Pexels if Google/Bing not configured or failed
    if (usePexels) {
      try {
        const result = await searchWithPexels(searchQuery, recipeTitle, cleanedTitle, cuisineTags, ingredientTags, keyIngredients, cookingMethod);
        if (result) return result;
      } catch (pexelsError) {
        console.error('Pexels search error:', pexelsError);
      }
    }

    console.log('No images found from any source for:', searchQuery);
    return NextResponse.json({
      success: true,
      url: null,
      options: [],
    });

  } catch (error) {
    console.error('Error searching for dish image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: null,
        options: [],
      },
      { status: 500 }
    );
  }
}

// Google Custom Search helper function
async function searchWithGoogle(
  searchQuery: string,
  recipeTitle: string,
  cleanedTitle: string,
  cuisineTags: string[],
  ingredientTags: string[],
  keyIngredients: string[],
  cookingMethod: string | null
): Promise<NextResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Google Custom Search API for images
    const response = await fetch(
      `${GOOGLE_CUSTOM_SEARCH_URL}?key=${encodeURIComponent(GOOGLE_CUSTOM_SEARCH_API_KEY!)}&cx=${encodeURIComponent(GOOGLE_CUSTOM_SEARCH_ENGINE_ID!)}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=10&safe=active`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Google Custom Search API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    console.log(`📸 Google returned ${data.items?.length || 0} images for query: "${searchQuery}"`);

    if (data.items && data.items.length > 0) {
      const titleLower = recipeTitle.toLowerCase();
      const cleanedTitleLower = cleanedTitle.toLowerCase();
      
      // Extract keywords from search query for custom query scoring
      const isCustomQuery = cleanedTitleLower === '' && cuisineTags.length === 0;
      const queryKeywords = isCustomQuery 
        ? searchQuery.toLowerCase().replace('food photography close-up', '').trim().split(/\s+/).filter(w => w.length > 2)
        : [];
      
      const scoredPhotos = data.items.map((item: any, index: number) => {
        let score = 0;
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const alt = `${title} ${snippet}`;
        
        // Base food-related keywords
        if (alt.includes('food') || alt.includes('dish') || alt.includes('meal') || alt.includes('cuisine')) {
          score += 3;
        }
        if (alt.includes('close') || alt.includes('close-up') || alt.includes('plated')) {
          score += 2;
        }
        
        // For custom queries, score based on query keywords
        if (isCustomQuery && queryKeywords.length > 0) {
          for (const keyword of queryKeywords) {
            if (alt.includes(keyword)) {
              score += 5; // Higher weight for custom query matches
            }
          }
        } else {
          // Original scoring logic for recipe-based queries
          if (alt.includes(cleanedTitleLower) || alt.includes(titleLower)) {
            score += 10;
          } else if (cleanedTitleLower) {
            const titleWords = cleanedTitleLower.split(/\s+/).filter(w => w.length > 3);
            const matchingWords = titleWords.filter(word => alt.includes(word));
            if (matchingWords.length > 0) {
              score += matchingWords.length * 2;
            }
          }
        }
        
        if (cuisineTags.length > 0) {
          const cuisine = cuisineTags[0].toLowerCase();
          if (alt.includes(cuisine)) {
            score += 8;
          }
        }
        
        if (ingredientTags.length > 0) {
          const ingredient = ingredientTags[0].toLowerCase();
          if (alt.includes(ingredient)) {
            score += 5;
          }
        }
        
        for (const keyIngredient of keyIngredients) {
          if (alt.includes(keyIngredient.toLowerCase())) {
            score += 3;
          }
        }
        
        if (cookingMethod && alt.includes(cookingMethod.toLowerCase())) {
          score += 4;
        }
        
        // Penalties for non-food images
        if (alt.includes('restaurant') || alt.includes('dining') || alt.includes('ambiance') || alt.includes('interior')) {
          score -= 10;
        }
        if (alt.includes('people') || alt.includes('person') || alt.includes('chef') || alt.includes('cooking')) {
          score -= 3;
        }
        
        // Prefer earlier results
        score += (10 - index);
        
        return { item, score, index };
      });
      
      scoredPhotos.sort((a: any, b: any) => b.score - a.score);
      
      console.log(`📊 Top 3 photo scores: ${scoredPhotos.slice(0, 3).map((p: any) => `${p.score}`).join(', ')}`);
      
      // Build up to 6 options from top scored photos
      const topPhotos = scoredPhotos.slice(0, 6);
      const options = topPhotos
        .map((p: any) => p.item.link)
        .filter((u: string | undefined) => !!u);

      if (options.length > 0) {
        const imageUrl = options[0]; // Use first option as primary URL
        console.log('✅ Found dish image via Google:', imageUrl, `(${options.length} options)`);
        return NextResponse.json({
          success: true,
          url: imageUrl,
          options,
        });
      } else {
        console.warn('⚠️ Google returned images but none had valid URLs');
      }
    } else {
      console.warn('⚠️ Google returned no images for query:', searchQuery);
    }

    return null;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      console.warn('Google search timed out');
      return null;
    }
    
    throw fetchError;
  }
}

// Bing Image Search helper function
async function searchWithBing(
  searchQuery: string,
  recipeTitle: string,
  cleanedTitle: string,
  cuisineTags: string[],
  ingredientTags: string[],
  keyIngredients: string[],
  cookingMethod: string | null
): Promise<NextResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${BING_IMAGE_SEARCH_ENDPOINT}?q=${encodeURIComponent(
        searchQuery
      )}&count=10&safeSearch=Strict&imageType=Photo`,
      {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': BING_IMAGE_SEARCH_KEY!,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Bing Image Search API rate limit exceeded');
        return null; // Return null to trigger fallback
      }
      console.warn('Bing Image Search API error:', response.status, response.statusText);
      return null; // Return null to trigger fallback
    }

    const data = await response.json();

    if (data.value && data.value.length > 0) {
      const titleLower = recipeTitle.toLowerCase();
      const cleanedTitleLower = cleanedTitle.toLowerCase();
      
      const scoredPhotos = data.value.map((photo: any, index: number) => {
        let score = 0;
        const altParts: string[] = [];
        if (photo.name) altParts.push(photo.name);
        if (photo.hostPageDisplayUrl) altParts.push(photo.hostPageDisplayUrl);
        if (photo.hostPageDomainFriendlyName) altParts.push(photo.hostPageDomainFriendlyName);
        const alt = altParts.join(' ').toLowerCase();
        
        if (alt.includes('food') || alt.includes('dish') || alt.includes('meal') || alt.includes('cuisine')) {
          score += 3;
        }
        if (alt.includes('close') || alt.includes('close-up') || alt.includes('plated')) {
          score += 2;
        }
        
        if (alt.includes(cleanedTitleLower) || alt.includes(titleLower)) {
          score += 10;
        } else {
          const titleWords = cleanedTitleLower.split(/\s+/).filter(w => w.length > 3);
          const matchingWords = titleWords.filter(word => alt.includes(word));
          if (matchingWords.length > 0) {
            score += matchingWords.length * 2;
          }
        }
        
        if (cuisineTags.length > 0) {
          const cuisine = cuisineTags[0].toLowerCase();
          if (alt.includes(cuisine)) {
            score += 8;
          }
        }
        
        if (ingredientTags.length > 0) {
          const ingredient = ingredientTags[0].toLowerCase();
          if (alt.includes(ingredient)) {
            score += 5;
          }
        }
        
        for (const keyIngredient of keyIngredients) {
          if (alt.includes(keyIngredient.toLowerCase())) {
            score += 3;
          }
        }
        
        if (cookingMethod && alt.includes(cookingMethod.toLowerCase())) {
          score += 4;
        }
        
        if (alt.includes('restaurant') || alt.includes('dining') || alt.includes('ambiance') || alt.includes('interior')) {
          score -= 10;
        }
        if (alt.includes('people') || alt.includes('person') || alt.includes('chef') || alt.includes('cooking')) {
          score -= 3;
        }
        
        score += (10 - index);
        
        return { photo, score, index };
      });
      
      scoredPhotos.sort((a: any, b: any) => b.score - a.score);
      
      const bestPhoto = scoredPhotos[0].photo;
      const imageUrl = bestPhoto.contentUrl || bestPhoto.thumbnailUrl;
      
      if (imageUrl) {
        // Build up to 6 options from top scored photos
        const topPhotos = scoredPhotos.slice(0, 6);
        const options = topPhotos
          .map((p: any) => p.photo.contentUrl || p.photo.thumbnailUrl)
          .filter((u: string | undefined) => !!u);

        console.log('✅ Found dish image via Bing:', imageUrl);
        return NextResponse.json({
          success: true,
          url: imageUrl,
          options,
        });
      }
    }

    return null;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      console.warn('Bing search timed out');
      return null;
    }
    
    throw fetchError;
  }
}

// Pexels Image Search helper function
async function searchWithPexels(
  searchQuery: string,
  recipeTitle: string,
  cleanedTitle: string,
  cuisineTags: string[],
  ingredientTags: string[],
  keyIngredients: string[],
  cookingMethod: string | null
): Promise<NextResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
      const response = await fetch(
        `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=6&orientation=landscape`,
      {
        method: 'GET',
        headers: {
          'Authorization': PEXELS_API_KEY!,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Pexels API rate limit exceeded');
        return null;
      }
      console.warn('Pexels API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    console.log(`📸 Pexels returned ${data.photos?.length || 0} photos for query: "${searchQuery}"`);

    if (data.photos && data.photos.length > 0) {
      const titleLower = recipeTitle.toLowerCase();
      const cleanedTitleLower = cleanedTitle.toLowerCase();
      
      // Extract keywords from search query for custom query scoring
      const isCustomQuery = cleanedTitleLower === '' && cuisineTags.length === 0;
      const queryKeywords = isCustomQuery 
        ? searchQuery.toLowerCase().replace('food photography close-up', '').trim().split(/\s+/).filter(w => w.length > 2)
        : [];
      
      const scoredPhotos = data.photos.map((photo: any, index: number) => {
        let score = 0;
        const alt = (photo.alt || '').toLowerCase();
        
        // Base food-related keywords
        if (alt.includes('food') || alt.includes('dish') || alt.includes('meal') || alt.includes('cuisine')) {
          score += 3;
        }
        if (alt.includes('close') || alt.includes('close-up') || alt.includes('plated')) {
          score += 2;
        }
        
        // For custom queries, score based on query keywords
        if (isCustomQuery && queryKeywords.length > 0) {
          for (const keyword of queryKeywords) {
            if (alt.includes(keyword)) {
              score += 5; // Higher weight for custom query matches
            }
          }
        } else {
          // Original scoring logic for recipe-based queries
          if (alt.includes(cleanedTitleLower) || alt.includes(titleLower)) {
            score += 10;
          } else if (cleanedTitleLower) {
            const titleWords = cleanedTitleLower.split(/\s+/).filter(w => w.length > 3);
            const matchingWords = titleWords.filter(word => alt.includes(word));
            if (matchingWords.length > 0) {
              score += matchingWords.length * 2;
            }
          }
        }
        
        if (cuisineTags.length > 0) {
          const cuisine = cuisineTags[0].toLowerCase();
          if (alt.includes(cuisine)) {
            score += 8;
          }
        }
        
        if (ingredientTags.length > 0) {
          const ingredient = ingredientTags[0].toLowerCase();
          if (alt.includes(ingredient)) {
            score += 5;
          }
        }
        
        for (const keyIngredient of keyIngredients) {
          if (alt.includes(keyIngredient.toLowerCase())) {
            score += 3;
          }
        }
        
        if (cookingMethod && alt.includes(cookingMethod.toLowerCase())) {
          score += 4;
        }
        
        // Penalties for non-food images
        if (alt.includes('restaurant') || alt.includes('dining') || alt.includes('ambiance') || alt.includes('interior')) {
          score -= 10;
        }
        if (alt.includes('people') || alt.includes('person') || alt.includes('chef') || alt.includes('cooking')) {
          score -= 3;
        }
        
        // Prefer earlier results
        score += (6 - index);
        
        return { photo, score, index };
      });
      
      scoredPhotos.sort((a: any, b: any) => b.score - a.score);
      
      console.log(`📊 Top 3 photo scores: ${scoredPhotos.slice(0, 3).map((p: any) => `${p.score}`).join(', ')}`);
      
      // Build up to 6 options from top scored photos
      const topPhotos = scoredPhotos.slice(0, 6);
      const options = topPhotos
        .map((p: any) => p.photo.src?.large || p.photo.src?.medium || p.photo.src?.original)
        .filter((u: string | undefined) => !!u);

      if (options.length > 0) {
        const imageUrl = options[0]; // Use first option as primary URL
        console.log('✅ Found dish image via Pexels:', imageUrl, `(${options.length} options)`);
        return NextResponse.json({
          success: true,
          url: imageUrl,
          options,
        });
      } else {
        console.warn('⚠️ Pexels returned photos but none had valid URLs');
      }
    } else {
      console.warn('⚠️ Pexels returned no photos for query:', searchQuery);
    }

    return null;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      console.warn('Pexels search timed out');
      return null;
    }
    
    throw fetchError;
  }
}


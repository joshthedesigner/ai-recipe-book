/**
 * Auto-Tagging Utility
 * 
 * Automatically generates category tags based on recipe ingredients.
 * Used across all recipe entry methods (URL scraping, text input, image extraction).
 */

/**
 * Cuisine hierarchy mapping - regional cuisines to parent cuisines
 */
const CUISINE_HIERARCHY: Record<string, string> = {
  // Indian Regional
  'goan': 'indian',
  'punjabi': 'indian',
  'bengali': 'indian',
  'south indian': 'indian',
  'north indian': 'indian',
  'gujarati': 'indian',
  'maharashtrian': 'indian',
  
  // Chinese Regional
  'sichuan': 'chinese',
  'szechuan': 'chinese',
  'cantonese': 'chinese',
  'hunan': 'chinese',
  'shanghainese': 'chinese',
  
  // Italian Regional
  'tuscan': 'italian',
  'neapolitan': 'italian',
  'sicilian': 'italian',
  'roman': 'italian',
  
  // Mexican Regional
  'tex-mex': 'mexican',
  'oaxacan': 'mexican',
  'yucatecan': 'mexican',
  
  // American Regional
  'cajun': 'american',
  'creole': 'american',
  'southern': 'american',
  'tex-mex': 'american', // Also American
  
  // French Regional
  'provençal': 'french',
  'alsatian': 'french',
  'breton': 'french',
  
  // Japanese Regional
  'okinawan': 'japanese',
  
  // Spanish Regional
  'catalan': 'spanish',
  'andalusian': 'spanish',
  'basque': 'spanish',
  
  // Middle Eastern
  'lebanese': 'middle eastern',
  'turkish': 'middle eastern',
  'persian': 'middle eastern',
  'moroccan': 'middle eastern',
};

/**
 * Analyze ingredients and generate category tags
 * @param ingredients - Array of ingredient strings
 * @returns Array of auto-generated tags
 */
export function generateAutoTags(ingredients: string[]): string[] {
  const autoTags: string[] = [];
  const ingredientsText = ingredients.join(' ').toLowerCase();

  // Fish
  const fishKeywords = [
    'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass', 
    'mackerel', 'sardines', 'anchovies', 'fish', 'swordfish', 'mahi'
  ];
  if (fishKeywords.some(keyword => ingredientsText.includes(keyword))) {
    autoTags.push('fish');
  }

  // Seafood (non-fish)
  const seafoodKeywords = [
    'shrimp', 'prawns', 'crab', 'lobster', 'scallops', 'mussels', 
    'clams', 'oysters', 'squid', 'octopus', 'calamari'
  ];
  if (seafoodKeywords.some(keyword => ingredientsText.includes(keyword))) {
    autoTags.push('seafood');
  }

  // Chicken
  if (ingredientsText.includes('chicken') || (ingredientsText.includes('poultry') && !ingredientsText.includes('duck') && !ingredientsText.includes('turkey'))) {
    autoTags.push('chicken');
  }

  // Beef
  const beefKeywords = ['beef', 'steak', 'ground beef', 'brisket', 'ribeye', 'sirloin'];
  if (beefKeywords.some(keyword => ingredientsText.includes(keyword))) {
    autoTags.push('beef');
  }

  // Pork
  const porkKeywords = ['pork', 'bacon', 'ham', 'sausage', 'prosciutto', 'pancetta', 'chorizo'];
  if (porkKeywords.some(keyword => ingredientsText.includes(keyword))) {
    autoTags.push('pork');
  }

  // Lamb
  if (ingredientsText.includes('lamb') || ingredientsText.includes('mutton')) {
    autoTags.push('lamb');
  }

  // Vegetarian/Vegan detection
  const meatKeywords = [...fishKeywords, ...seafoodKeywords, 'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'meat'];
  const hasMeat = meatKeywords.some(keyword => ingredientsText.includes(keyword));
  
  if (!hasMeat) {
    autoTags.push('vegetarian');
    
    // Check for vegan (no dairy, eggs, honey)
    const animalProducts = [
      'milk', 'cream', 'cheese', 'butter', 'egg', 'honey', 'yogurt', 
      'ghee', 'whey', 'casein', 'gelatin'
    ];
    const hasAnimalProducts = animalProducts.some(keyword => ingredientsText.includes(keyword));
    if (!hasAnimalProducts) {
      autoTags.push('vegan');
    }
  }

  return autoTags;
}

/**
 * Expand regional cuisine tags to include parent cuisines
 * @param tags - Array of tags to expand
 * @returns Expanded tags with parent cuisines added
 */
export function expandCuisineTags(tags: string[]): string[] {
  const expandedTags = [...tags];
  
  tags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    
    // Check if this is a regional cuisine
    if (CUISINE_HIERARCHY[lowerTag]) {
      const parentCuisine = CUISINE_HIERARCHY[lowerTag];
      
      // Add parent cuisine if not already present
      if (!expandedTags.some(t => t.toLowerCase() === parentCuisine)) {
        expandedTags.push(parentCuisine);
      }
    }
  });
  
  return expandedTags;
}

/**
 * Merge auto-generated tags with existing tags (removes duplicates)
 * @param existingTags - Tags already present
 * @param ingredients - Array of ingredient strings
 * @returns Combined unique tags
 */
export function mergeAutoTags(existingTags: string[], ingredients: string[]): string[] {
  const autoTags = generateAutoTags(ingredients);
  const combined = [...existingTags, ...autoTags];
  
  // Expand cuisine tags (e.g., "goan" → add "indian")
  const expanded = expandCuisineTags(combined);
  
  // Remove duplicates and return
  return [...new Set(expanded.map(tag => tag.toLowerCase()))];
}


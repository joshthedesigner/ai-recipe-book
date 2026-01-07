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
 * Cuisine detection configuration
 * Each cuisine has keywords (ingredients and dishes) and a minimum match threshold
 */
interface CuisineConfig {
  name: string;
  ingredients: string[];
  dishes: string[];
  minMatches: number;
}

const CUISINE_CONFIGS: CuisineConfig[] = [
  {
    name: 'japanese',
    ingredients: [
      'miso', 'soy sauce', 'mirin', 'sake', 'dashi', 'kombu', 'wakame',
      'nori', 'wasabi', 'pickled ginger', 'bonito', 'shiitake', 'daikon',
      'shiso', 'yuzu', 'ponzu', 'tamari', 'furikake', 'panko', 'togarashi',
      'umeboshi', 'edamame', 'tofu', 'natto', 'rice vinegar', 'sesame oil',
      'sesame seeds', 'miso paste', 'shoyu', 'tsuyu'
    ],
    dishes: [
      'sushi', 'sashimi', 'ramen', 'udon', 'soba', 'tempura', 'teriyaki',
      'yakitori', 'katsu', 'donburi', 'onigiri', 'bento', 'okonomiyaki',
      'takoyaki', 'sukiyaki', 'shabu-shabu', 'tonkatsu', 'karaage', 'gyoza',
      'miso soup', 'chawanmushi', 'yakiniku', 'teppanyaki'
    ],
    minMatches: 2, // Need at least 2 indicators (ingredient OR dish)
  },
  // More cuisines can be added here easily
];

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
 * Detect cuisines from recipe content
 * @param title - Recipe title
 * @param ingredients - Array of ingredient strings
 * @param steps - Array of cooking step strings
 * @returns Object with detected tags and review flag
 */
export function detectCuisines(
  title: string,
  ingredients: string[],
  steps: string[]
): { tags: string[]; needsReview: boolean } {
  // Combine all text for searching
  const combinedText = `${title || ''} ${(ingredients || []).join(' ')} ${(steps || []).join(' ')}`.toLowerCase();
  
  const detectedTags: string[] = [];
  let hasLowConfidence = false;
  let hasAnyMatches = false;
  
  for (const config of CUISINE_CONFIGS) {
    const ingredientMatches = config.ingredients.filter(ing => 
      combinedText.includes(ing.toLowerCase())
    ).length;
    
    const dishMatches = config.dishes.filter(dish => 
      combinedText.includes(dish.toLowerCase())
    ).length;
    
    const totalMatches = ingredientMatches + dishMatches;
    const minMatches = config.minMatches || 2;
    
    if (totalMatches >= minMatches) {
      // High confidence - auto-add the tag
      detectedTags.push(config.name);
      hasAnyMatches = true;
    } else if (totalMatches > 0) {
      // Some matches but not enough - flag for user review
      hasLowConfidence = true;
      hasAnyMatches = true;
    }
  }
  
  // Review needed if: low confidence matches OR no matches at all
  const needsReview = hasLowConfidence || !hasAnyMatches;
  
  return { tags: detectedTags, needsReview };
}

/**
 * Merge auto-generated tags with existing tags (removes duplicates)
 * @param existingTags - Tags already present
 * @param ingredients - Array of ingredient strings
 * @param title - Recipe title (optional, for cuisine detection)
 * @param steps - Array of cooking steps (optional, for cuisine detection)
 * @returns Combined unique tags
 */
export function mergeAutoTags(
  existingTags: string[],
  ingredients: string[],
  title?: string,
  steps?: string[]
): string[] {
  // Step 1: Get protein tags (existing functionality)
  const autoTags = generateAutoTags(ingredients);
  
  // Step 2: Get cuisine tags (NEW functionality)
  const cuisineResult = detectCuisines(title || '', ingredients, steps || []);
  
  // Step 3: Combine all tags
  const combined = [...existingTags, ...autoTags, ...cuisineResult.tags];
  
  // Step 4: Expand cuisine tags (e.g., "goan" → add "indian")
  const expanded = expandCuisineTags(combined);
  
  // Step 5: Remove duplicates and return
  return [...new Set(expanded.map(tag => tag.toLowerCase()))];
}

/**
 * Helper function to check if tag review is needed
 * @param title - Recipe title
 * @param ingredients - Array of ingredient strings
 * @param steps - Array of cooking step strings
 * @returns True if user should review tags
 */
export function getTagReviewStatus(
  title: string,
  ingredients: string[],
  steps: string[]
): boolean {
  return detectCuisines(title, ingredients, steps).needsReview;
}


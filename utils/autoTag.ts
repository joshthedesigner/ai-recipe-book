/**
 * Auto-Tagging Utility
 * 
 * Automatically generates category tags based on recipe ingredients.
 * Used across all recipe entry methods (URL scraping, text input, image extraction).
 */

import OpenAI from 'openai';

// Lazy-load OpenAI client for AI-based cuisine detection
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
  // Japanese
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
    minMatches: 2,
  },

  // Chinese
  {
    name: 'chinese',
    ingredients: [
      'soy sauce', 'hoisin', 'oyster sauce', 'sesame oil', 'rice wine',
      'shaoxing wine', 'five spice', 'star anise', 'szechuan peppercorn',
      'black bean sauce', 'doubanjiang', 'fermented black beans',
      'chinese black vinegar', 'dark soy', 'light soy', 'ginger', 'garlic',
      'scallions', 'green onions', 'bok choy', 'napa cabbage', 'chinese broccoli',
      'gai lan', 'snow peas', 'water chestnuts', 'bamboo shoots',
      'wood ear mushrooms', 'shiitake', 'tofu', 'pork belly', 'chinese sausage',
      'lap cheong', 'szechuan pepper', 'sichuan pepper', 'chinese five spice',
      'douchi', 'fermented black bean', 'tianmianjiang', 'sweet bean sauce'
    ],
    dishes: [
      'kung pao', 'mapo tofu', 'general tso', 'sweet and sour', 'peking duck',
      'dim sum', 'dumplings', 'wonton', 'wontons', 'spring rolls', 'egg rolls',
      'chow mein', 'lo mein', 'fried rice', 'hot pot', 'char siu', 'char sui',
      'moo shu', 'orange chicken', 'mongolian beef', 'szechuan', 'sichuan',
      'hunan', 'cantonese', 'shanghai', 'beijing', 'soup dumplings',
      'xiao long bao', 'dan dan noodles', 'twice cooked pork', 'ma po tofu',
      'kung pao chicken', 'beef and broccoli', 'mongolian chicken',
      'sesame chicken', 'lemon chicken', 'cashew chicken', 'chinese chicken',
      'chinese takeout', 'chinese food', 'stir fry', 'stir-fry'
    ],
    minMatches: 2,
  },

  // Italian
  {
    name: 'italian',
    ingredients: [
      'olive oil', 'garlic', 'basil', 'oregano', 'parmesan', 'pecorino',
      'mozzarella', 'prosciutto', 'pancetta', 'balsamic', 'capers',
      'anchovies', 'sun-dried tomatoes', 'artichokes', 'arugula', 'radicchio',
      'cannellini beans', 'borlotti beans', 'risotto rice', 'arborio rice',
      'polenta', 'mascarpone', 'ricotta', 'gorgonzola', 'pasta', 'gnocchi',
      'marinara', 'pesto', 'pomodoro', 'ragu', 'bolognese'
    ],
    dishes: [
      'pasta', 'pizza', 'risotto', 'osso buco', 'carbonara', 'amatriciana',
      'cacio e pepe', 'aglio e olio', 'puttanesca', 'arrabbiata',
      'bolognese', 'ragu', 'lasagna', 'lasagne', 'cannelloni', 'ravioli',
      'tortellini', 'gnocchi', 'polenta', 'bruschetta', 'caprese',
      'tiramisu', 'gelato', 'panna cotta', 'cannoli', 'zeppole',
      'fettuccine', 'spaghetti', 'penne', 'rigatoni', 'linguine',
      'italian food', 'italian cuisine'
    ],
    minMatches: 2,
  },

  // American
  {
    name: 'american',
    ingredients: [
      'cheddar cheese', 'american cheese', 'bacon', 'bbq sauce', 'ketchup',
      'mustard', 'mayonnaise', 'pickles', 'hamburger buns', 'hot dog buns',
      'corn', 'potatoes', 'sweet potatoes', 'pumpkin', 'cranberries',
      'maple syrup', 'pecans', 'walnuts', 'peanut butter', 'jelly',
      'graham crackers', 'marshmallows', 'chocolate chips'
    ],
    dishes: [
      'hamburger', 'cheeseburger', 'hot dog', 'bbq', 'barbecue', 'ribs',
      'fried chicken', 'chicken wings', 'buffalo wings', 'mac and cheese',
      'macaroni and cheese', 'apple pie', 'pumpkin pie', 'pecan pie',
      'chocolate chip cookies', 'brownies', 's\'mores', 'cornbread',
      'biscuits', 'gravy', 'meatloaf', 'pot roast', 'clam chowder',
      'new england clam chowder', 'cobb salad', 'caesar salad',
      'american food', 'southern food', 'cajun', 'creole'
    ],
    minMatches: 2,
  },

  // French
  {
    name: 'french',
    ingredients: [
      'butter', 'cream', 'shallots', 'tarragon', 'thyme', 'rosemary',
      'dijon mustard', 'white wine', 'red wine', 'cognac', 'brandy',
      'gruyere', 'brie', 'camembert', 'goat cheese', 'chevre',
      'truffle', 'foie gras', 'duck', 'duck fat', 'herbes de provence',
      'french butter', 'creme fraiche', 'mirepoix'
    ],
    dishes: [
      'coq au vin', 'boeuf bourguignon', 'ratatouille', 'cassoulet',
      'bouillabaisse', 'quiche', 'souffle', 'crepes', 'croissants',
      'baguette', 'french onion soup', 'vichyssoise', 'confit',
      'terrine', 'pate', 'escargot', 'duck confit', 'steak frites',
      'beef bourguignon', 'chicken coq au vin', 'french food',
      'french cuisine', 'provencal', 'provençal'
    ],
    minMatches: 2,
  },

  // Greek
  {
    name: 'greek',
    ingredients: [
      'feta cheese', 'kalamata olives', 'olive oil', 'oregano', 'lemon',
      'yogurt', 'tzatziki', 'hummus', 'tahini', 'phyllo dough', 'filo',
      'spanakopita', 'dolmades', 'grape leaves', 'lamb', 'octopus',
      'halloumi', 'mizithra', 'kasseri', 'greek yogurt'
    ],
    dishes: [
      'moussaka', 'spanakopita', 'baklava', 'gyro', 'souvlaki',
      'tzatziki', 'hummus', 'dolmades', 'stuffed grape leaves',
      'greek salad', 'horiatiki', 'pastitsio', 'saganaki',
      'greek food', 'greek cuisine', 'mediterranean'
    ],
    minMatches: 2,
  },

  // Indian
  {
    name: 'indian',
    ingredients: [
      'curry', 'turmeric', 'cumin', 'coriander', 'garam masala',
      'cardamom', 'cinnamon', 'cloves', 'fenugreek', 'mustard seeds',
      'curry leaves', 'ginger', 'garlic', 'ghee', 'yogurt', 'paneer',
      'basmati rice', 'lentils', 'dal', 'chickpeas', 'chana',
      'tamarind', 'coconut milk', 'coconut', 'asafoetida', 'hing',
      'red chili', 'green chili', 'mango powder', 'amchur'
    ],
    dishes: [
      'curry', 'tikka masala', 'butter chicken', 'chicken tikka',
      'biryani', 'dal', 'lentil curry', 'samosas', 'naan', 'roti',
      'paratha', 'dosa', 'idli', 'vada', 'pakora', 'bhaji',
      'palak paneer', 'saag paneer', 'aloo gobi', 'chana masala',
      'tandoori', 'vindaloo', 'korma', 'rogan josh', 'molee', 'molly',
      'meen molee', 'fish molee', 'kerala fish curry', 'kerala curry',
      'indian food', 'indian cuisine'
    ],
    minMatches: 2,
  },

  // Korean
  {
    name: 'korean',
    ingredients: [
      'gochujang', 'gochugaru', 'kimchi', 'soy sauce', 'sesame oil',
      'rice vinegar', 'garlic', 'ginger', 'scallions', 'sesame seeds',
      'doenjang', 'ssamjang', 'rice', 'noodles', 'tofu', 'beef',
      'pork belly', 'short ribs', 'galbi', 'bulgogi'
    ],
    dishes: [
      'kimchi', 'bulgogi', 'galbi', 'bibimbap', 'korean bbq',
      'japchae', 'tteokbokki', 'korean fried chicken', 'soondubu',
      'kimchi jjigae', 'doenjang jjigae', 'samgyeopsal', 'bossam',
      'korean food', 'korean cuisine'
    ],
    minMatches: 2,
  },

  // Mexican
  {
    name: 'mexican',
    ingredients: [
      'cilantro', 'lime', 'jalapeno', 'serrano', 'chipotle', 'adobo',
      'cumin', 'oregano', 'chili powder', 'corn', 'black beans',
      'pinto beans', 'refried beans', 'avocado', 'tomatillo', 'salsa',
      'queso', 'cotija', 'monterey jack', 'tortillas', 'corn tortillas',
      'flour tortillas', 'mexican cheese'
    ],
    dishes: [
      'tacos', 'burritos', 'enchiladas', 'quesadillas', 'tostadas',
      'nachos', 'guacamole', 'salsa', 'pico de gallo', 'mole',
      'pozole', 'chiles rellenos', 'tamales', 'churros', 'flan',
      'mexican food', 'mexican cuisine', 'tex-mex'
    ],
    minMatches: 2,
  },

  // Thai
  {
    name: 'thai',
    ingredients: [
      'coconut milk', 'lemongrass', 'lime leaves', 'kaffir lime',
      'thai basil', 'fish sauce', 'palm sugar', 'galangal', 'ginger',
      'thai chili', 'bird\'s eye chili', 'tamarind', 'curry paste',
      'red curry paste', 'green curry paste', 'massaman curry',
      'pad thai sauce', 'rice noodles', 'jasmine rice'
    ],
    dishes: [
      'pad thai', 'green curry', 'red curry', 'massaman curry',
      'tom yum', 'tom kha', 'pad see ew', 'pad kee mao', 'drunk noodles',
      'som tam', 'papaya salad', 'larb', 'thai food', 'thai cuisine',
      'thai curry'
    ],
    minMatches: 2,
  },

  // Vietnamese
  {
    name: 'vietnamese',
    ingredients: [
      'fish sauce', 'nuoc cham', 'rice noodles', 'rice paper',
      'vermicelli', 'bean sprouts', 'mint', 'cilantro', 'basil',
      'lime', 'lemongrass', 'hoisin', 'sriracha', 'jasmine rice',
      'star anise', 'cinnamon', 'five spice'
    ],
    dishes: [
      'pho', 'banh mi', 'spring rolls', 'summer rolls', 'goi cuon',
      'bun', 'vermicelli bowl', 'banh xeo', 'com tam', 'broken rice',
      'vietnamese food', 'vietnamese cuisine'
    ],
    minMatches: 2,
  },

  // Middle Eastern
  {
    name: 'middle eastern',
    ingredients: [
      'tahini', 'hummus', 'pita', 'za\'atar', 'sumac', 'cumin',
      'coriander', 'cardamom', 'allspice', 'pomegranate', 'dates',
      'figs', 'yogurt', 'labneh', 'feta', 'halloumi', 'lamb',
      'chickpeas', 'lentils', 'bulgur', 'couscous', 'phyllo', 'filo'
    ],
    dishes: [
      'hummus', 'baba ganoush', 'falafel', 'shawarma', 'kebab',
      'kabob', 'kofta', 'tabbouleh', 'fattoush', 'baklava',
      'knafeh', 'mansaf', 'maqluba', 'middle eastern food',
      'middle eastern cuisine', 'lebanese', 'turkish', 'persian',
      'iranian', 'moroccan'
    ],
    minMatches: 2,
  },

  // Mediterranean
  {
    name: 'mediterranean',
    ingredients: [
      'olive oil', 'olives', 'feta', 'tomatoes', 'cucumber',
      'bell peppers', 'eggplant', 'zucchini', 'artichokes', 'capers',
      'anchovies', 'lemons', 'oregano', 'basil', 'thyme', 'rosemary',
      'garlic', 'chickpeas', 'lentils', 'bulgur', 'couscous',
      'halloumi', 'yogurt', 'tahini', 'hummus'
    ],
    dishes: [
      'mediterranean food', 'mediterranean cuisine', 'greek salad',
      'caprese', 'ratatouille', 'hummus', 'baba ganoush', 'falafel',
      'couscous', 'paella', 'gazpacho', 'tapas', 'mezze'
    ],
    minMatches: 2,
  },
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
 * AI-powered cuisine detection prompt
 * First analyzes title, then expands to full recipe if needed
 */
const CUISINE_DETECTION_PROMPT = `You are a cuisine classification expert. Analyze the recipe and determine its primary cuisine.

Return JSON with:
{
  "cuisine": "cuisine_name" | null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- Return the primary cuisine name (e.g., "japanese", "indonesian", "ethiopian", "peruvian", etc.)
- Return null if cuisine is unclear, fusion, or you cannot determine it
- Only return ONE cuisine (the primary one)
- Use lowercase, single-word cuisine names when possible (e.g., "middle eastern" is acceptable)
- Confidence should be high (0.8+) for clear matches
- Consider dish names, ingredients, cooking methods, and cultural context
- Be conservative - if unsure, return null with low confidence
- Title is the strongest signal - if title clearly indicates cuisine, use that
- If title is unclear, analyze ingredients and cooking methods`;

/**
 * Use AI to detect cuisine from recipe
 * First checks title, then expands to full recipe if confidence is low
 */
async function detectCuisineWithAI(
  title: string,
  ingredients: string[],
  steps: string[]
): Promise<{ cuisine: string | null; confidence: number; reasoning: string } | null> {
  try {
    const client = getOpenAIClient();
    
    // First pass: Analyze title only (faster, cheaper)
    const titlePrompt = `Recipe title: "${title}"

Based on the title alone, determine the cuisine. If the title clearly indicates a cuisine (e.g., "Japanese Sake Steamed Clams", "Shawarma Pargiyot", "Spaghetti Carbonara"), return that cuisine with high confidence.

If the title is unclear or generic, return null with low confidence.`;

    const titleResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CUISINE_DETECTION_PROMPT },
        { role: 'user', content: titlePrompt }
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 150,
    });

    const titleResult = JSON.parse(titleResponse.choices[0].message.content || '{}');
    
    // If title analysis gives high confidence, return it
    if (titleResult.cuisine && titleResult.confidence >= 0.8) {
      return titleResult;
    }
    
    // Second pass: Analyze full recipe (if title was unclear)
    const fullPrompt = `Recipe:
Title: "${title}"
Ingredients: ${ingredients.join(', ')}
Steps: ${steps.join(' | ')}

Analyze the full recipe to determine cuisine. Consider dish names, ingredients, cooking methods, and cultural context.`;

    const fullResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CUISINE_DETECTION_PROMPT },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 200,
    });

    const fullResult = JSON.parse(fullResponse.choices[0].message.content || '{}');
    return fullResult;

  } catch (error) {
    console.error('Error in AI cuisine detection:', error);
    return null;
  }
}

/**
 * Fallback: Detect cuisines using ingredient/dish matching
 * Used when AI is unavailable or fails
 */
function detectCuisinesByIngredients(
  title: string,
  ingredients: string[],
  steps: string[]
): { tags: string[]; needsReview: boolean } {
  const titleLower = (title || '').toLowerCase();
  const combinedText = `${titleLower} ${(ingredients || []).join(' ')} ${(steps || []).join(' ')}`.toLowerCase();
  
  const detectedTags: string[] = [];
  let hasLowConfidence = false;
  let hasAnyMatches = false;
  
  // Track best match to avoid multiple cuisine tags
  let bestMatch: { cuisine: string; score: number } | null = null;
  
  for (const config of CUISINE_CONFIGS) {
    // Check if cuisine name appears in title (strong signal - worth 3 points)
    const titleMatch = titleLower.includes(config.name.toLowerCase()) ? 3 : 0;
    
    // Count ingredient matches
    const ingredientMatches = config.ingredients.filter(ing => 
      combinedText.includes(ing.toLowerCase())
    ).length;
    
    // Count dish matches - check both in title and in full text
    // Use word boundary matching to avoid false positives
    const dishMatchesInTitle = config.dishes.filter(dish => {
      const dishLower = dish.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${dishLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordBoundaryRegex.test(titleLower);
    }).length;
    
    const dishMatchesInText = config.dishes.filter(dish => {
      const dishLower = dish.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${dishLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordBoundaryRegex.test(combinedText);
    }).length;
    
    // Dish matches in title are worth 5 points each (very strong signal)
    // Dish matches elsewhere are worth 2 points each
    const dishMatches = (dishMatchesInTitle * 5) + ((dishMatchesInText - dishMatchesInTitle) * 2);
    
    // Total score: title match + ingredient matches + weighted dish matches
    const totalMatches = titleMatch + ingredientMatches + dishMatches;
    const minMatches = config.minMatches || 2;
    
    if (totalMatches >= minMatches) {
      hasAnyMatches = true;
      
      // Update best match if this is better
      if (!bestMatch || totalMatches > bestMatch.score) {
        bestMatch = { cuisine: config.name, score: totalMatches };
      }
    } else if (totalMatches > 0) {
      hasLowConfidence = true;
      hasAnyMatches = true;
    }
  }
  
  // Only add the BEST match
  if (bestMatch) {
    detectedTags.push(bestMatch.cuisine);
  }
  
  const needsReview = hasLowConfidence || !hasAnyMatches;
  return { tags: detectedTags, needsReview };
}

/**
 * Detect cuisines from recipe content
 * Uses AI-first approach: AI analyzes title, then full recipe if needed
 * Falls back to ingredient/dish matching if AI fails
 * @param title - Recipe title
 * @param ingredients - Array of ingredient strings
 * @param steps - Array of cooking step strings
 * @returns Object with detected tags and review flag
 */
export async function detectCuisines(
  title: string,
  ingredients: string[],
  steps: string[]
): Promise<{ tags: string[]; needsReview: boolean }> {
  // Step 1: Quick check for dish name in title (fast, no API call)
  // Use word boundary matching to avoid false positives (e.g., "molee" matching "mole")
  const titleLower = (title || '').toLowerCase();
  
  for (const config of CUISINE_CONFIGS) {
    const dishInTitle = config.dishes.find(dish => {
      const dishLower = dish.toLowerCase();
      // Use word boundary matching: check if dish appears as a whole word
      // This prevents "molee" from matching "mole" or "molly" from matching "mole"
      const wordBoundaryRegex = new RegExp(`\\b${dishLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordBoundaryRegex.test(titleLower);
    });
    
    if (dishInTitle) {
      // Dish name in title = automatic match (no AI needed)
      return { tags: [config.name], needsReview: false };
    }
  }
  
  // Step 2: Use AI to analyze (title first, then full recipe if needed)
  try {
    const aiResult = await detectCuisineWithAI(title, ingredients, steps);
    
    if (aiResult && aiResult.cuisine && aiResult.confidence >= 0.8) {
      // High confidence AI result
      return { tags: [aiResult.cuisine], needsReview: false };
    }
    
    // Low confidence or null - fall back to ingredient matching
    console.log('AI cuisine detection had low confidence, falling back to ingredient matching');
    return detectCuisinesByIngredients(title, ingredients, steps);
  } catch (error) {
    console.error('AI cuisine detection failed, falling back to ingredient matching:', error);
    // Step 3: Fallback to ingredient/dish matching
    return detectCuisinesByIngredients(title, ingredients, steps);
  }
}

/**
 * All cuisine tags (main cuisines + regional variants) for filtering
 */
const ALL_CUISINE_TAGS = new Set([
  // Main cuisines
  'chinese', 'italian', 'japanese', 'mexican', 'thai', 'indian', 'korean',
  'french', 'greek', 'american', 'vietnamese', 'middle eastern', 'mediterranean',
  // Regional variants (from CUISINE_HIERARCHY)
  'goan', 'punjabi', 'bengali', 'south indian', 'north indian', 'gujarati', 'maharashtrian',
  'sichuan', 'szechuan', 'cantonese', 'hunan', 'shanghainese',
  'tuscan', 'neapolitan', 'sicilian', 'roman',
  'tex-mex', 'oaxacan', 'yucatecan',
  'cajun', 'creole', 'southern',
  'provençal', 'alsatian', 'breton',
  'okinawan',
  'catalan', 'andalusian', 'basque',
  'lebanese', 'turkish', 'persian', 'moroccan',
]);

/**
 * Remove known cuisine tags from a tag array
 * This is used to remove old/incorrect cuisine tags before re-detection
 * Note: We only remove cuisines from our known list - AI-detected cuisines not in this list
 * will be preserved (they're trusted as correct)
 */
function removeCuisineTags(tags: string[]): string[] {
  return tags.filter(tag => !ALL_CUISINE_TAGS.has(tag.toLowerCase().trim()));
}

/**
 * Merge auto-generated tags with existing tags (removes duplicates)
 * @param existingTags - Tags already present (may include AI-added cuisine tags)
 * @param ingredients - Array of ingredient strings
 * @param title - Recipe title (optional, for cuisine detection)
 * @param steps - Array of cooking steps (optional, for cuisine detection)
 * @returns Combined unique tags
 */
export async function mergeAutoTags(
  existingTags: string[],
  ingredients: string[],
  title?: string,
  steps?: string[]
): Promise<string[]> {
  // Step 1: Separate known cuisine tags from unknown cuisine tags
  // We'll re-detect known cuisine tags, but preserve unknown ones (likely AI-detected)
  const tagsWithoutKnownCuisine = existingTags.filter(tag => 
    !ALL_CUISINE_TAGS.has(tag.toLowerCase().trim())
  );
  
  // Step 2: Get protein tags (existing functionality)
  const autoTags = generateAutoTags(ingredients);
  
  // Step 3: Get cuisine tags using our detection (returns only BEST match)
  const cuisineResult = await detectCuisines(title || '', ingredients, steps || []);
  
  // Step 4: Combine all tags
  // - Tags without known cuisines (includes unknown cuisine tags that AI detected)
  // - Auto-generated protein tags
  // - Newly detected cuisine tags (from AI or ingredient matching)
  const combined = [...tagsWithoutKnownCuisine, ...autoTags, ...cuisineResult.tags];
  
  // Step 5: Expand cuisine tags (e.g., "goan" → add "indian")
  const expanded = expandCuisineTags(combined);
  
  // Step 6: Remove duplicates and return
  return [...new Set(expanded.map(tag => tag.toLowerCase()))];
}

/**
 * Detect course type from recipe content
 * Follows strict decision hierarchy based on how dishes are served and eaten
 * 
 * Decision hierarchy (first match wins):
 * 1. Soup - liquid base, eaten with spoon, served alone
 * 2. Main - primary calorie/protein source, served with rice/pasta/bread
 * 3. Side - accompanies main dish, smaller portion
 * 4. Appetizer - starter/small plate, finger food
 * 5. Dessert - sweet-focused, end of meal
 * 6. Other - if none apply
 * 
 * @param title - Recipe title
 * @param ingredients - Array of ingredient strings
 * @param steps - Array of cooking step strings
 * @returns Detected course tag (or null if unclear)
 */
export function detectCourse(
  title: string,
  ingredients: string[],
  steps: string[]
): string | null {
  const titleLower = (title || '').toLowerCase();
  const ingredientsText = (ingredients || []).join(' ').toLowerCase();
  const stepsText = (steps || []).join(' ').toLowerCase();
  const fullText = `${titleLower} ${ingredientsText} ${stepsText}`;

  // Helper: Check if text contains keywords (case-insensitive)
  const hasKeywords = (text: string, keywords: string[]): boolean => {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  };

  // Helper: Check if steps mention serving with something
  const mentionsServeWith = (): boolean => {
    const serveWithKeywords = [
      'serve with', 'serve over', 'serve on', 'serve alongside',
      'accompanied by', 'with rice', 'with pasta', 'with bread',
      'over rice', 'over pasta', 'on rice', 'on pasta', 'on bread',
      'with grains', 'with noodles', 'with naan', 'with roti'
    ];
    return hasKeywords(stepsText, serveWithKeywords);
  };

  // Helper: Check if dish has primarily liquid base
  const hasLiquidBase = (): boolean => {
    const liquidKeywords = [
      'broth', 'stock', 'coconut milk', 'blended', 'pureed',
      'liquid', 'soup base', 'soup stock', 'soup broth'
    ];
    return hasKeywords(fullText, liquidKeywords);
  };

  // Helper: Check if dish is typically eaten with spoon
  const eatenWithSpoon = (): boolean => {
    const spoonKeywords = ['spoon', 'ladle', 'soup spoon', 'eaten with spoon'];
    return hasKeywords(fullText, spoonKeywords) || 
           (hasLiquidBase() && !hasKeywords(fullText, ['rice', 'pasta', 'bread', 'noodles']));
  };

  // Helper: Check if dish is served over/with starch
  const servedWithStarch = (): boolean => {
    const starchKeywords = [
      'rice', 'pasta', 'bread', 'noodles', 'quinoa', 'couscous',
      'naan', 'roti', 'tortilla', 'wrap', 'pita'
    ];
    return hasKeywords(titleLower, starchKeywords) || 
           mentionsServeWith() ||
           hasKeywords(stepsText, starchKeywords);
  };

  // Helper: Check if explicitly described as starter/small plate
  const isStarter = (): boolean => {
    const starterKeywords = [
      'appetizer', 'appetiser', 'starter', 'hors d\'oeuvre',
      'small plate', 'mezze', 'tapas', 'finger food', 'amuse-bouche'
    ];
    return hasKeywords(titleLower, starterKeywords) ||
           hasKeywords(fullText, starterKeywords);
  };

  // Helper: Check if sweet-focused
  const isSweet = (): boolean => {
    const sweetKeywords = [
      'sugar', 'honey', 'syrup', 'chocolate', 'caramel', 'vanilla',
      'dessert', 'sweet', 'cake', 'pie', 'tart', 'cookie', 'biscuit',
      'pudding', 'custard', 'mousse', 'ice cream', 'sorbet', 'gelato'
    ];
    return hasKeywords(titleLower, sweetKeywords) ||
           hasKeywords(fullText, sweetKeywords);
  };

  // Helper: Check if explicitly described as side dish
  const isSideDish = (): boolean => {
    const sideKeywords = [
      'side', 'side dish', 'accompaniment', 'garnish', 'topping'
    ];
    return hasKeywords(titleLower, sideKeywords) ||
           hasKeywords(fullText, sideKeywords);
  };

  // DECISION HIERARCHY (first match wins)

  // 1. SOUP - Only if liquid base, eaten with spoon, served alone
  if (hasLiquidBase() && eatenWithSpoon() && !servedWithStarch()) {
    // Additional check: title should indicate soup or liquid dish
    const soupTitleKeywords = ['soup', 'broth', 'chowder', 'bisque', 'gazpacho', 'consommé', 'consomme', 'ramen', 'pho'];
    if (hasKeywords(titleLower, soupTitleKeywords) || hasLiquidBase()) {
      return 'soup';
    }
  }

  // 2. MAIN - Primary calorie/protein source, served with rice/pasta/bread
  // Check if intended as main dish
  const mainIndicators = [
    // Title indicates main dish
    hasKeywords(titleLower, ['curry', 'stew', 'tagine', 'casserole', 'roast', 'braise', 'grill', 'skillet', 'chili', 'ragout', 'goulash', 'bolognese', 'ragu', 'stroganoff', 'teriyaki', 'stir-fry', 'fricassee']),
    // Served with starch
    servedWithStarch(),
    // Instructions say "serve with"
    mentionsServeWith(),
    // Has substantial protein (indicates main dish)
    hasKeywords(ingredientsText, ['chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'tofu', 'tempeh', 'beans', 'lentils']),
    // Not explicitly a side or appetizer
    !isSideDish() && !isStarter()
  ];

  if (mainIndicators.some(indicator => indicator === true)) {
    return 'main';
  }

  // 3. SIDE - Accompanies main dish, smaller portion, not full meal
  if (isSideDish() || 
      (hasKeywords(titleLower, ['salad', 'coleslaw', 'slaw']) && !hasKeywords(titleLower, ['main', 'entree', 'dinner']))) {
    // Additional check: not a main dish salad (like cobb salad, caesar salad as main)
    const mainSaladKeywords = ['cobb', 'caesar', 'nicoise', 'chef salad', 'dinner salad'];
    if (!hasKeywords(titleLower, mainSaladKeywords)) {
      return 'side';
    }
  }

  // 4. APPETIZER - Starter/small plate, finger food, small portions
  if (isStarter() || 
      hasKeywords(titleLower, ['dip', 'spread', 'crostini', 'bruschetta', 'canapé', 'canape'])) {
    return 'appetizer';
  }

  // 5. DESSERT - Sweet-focused, end of meal
  if (isSweet() && 
      (hasKeywords(titleLower, ['dessert', 'sweet', 'cake', 'pie', 'tart', 'cookie', 'biscuit', 'pudding', 'custard', 'mousse', 'ice cream', 'sorbet']) ||
       hasKeywords(fullText, ['dessert', 'end of meal', 'after dinner']))) {
    return 'dessert';
  }

  // 6. OTHER - If none of the above apply
  // Check for breakfast/brunch (could be main or other)
  if (hasKeywords(titleLower, ['breakfast', 'brunch', 'pancake', 'waffle', 'french toast', 'omelet', 'omelette', 'frittata'])) {
    // Breakfast dishes are typically mains unless explicitly small
    if (!hasKeywords(titleLower, ['small', 'mini', 'bite'])) {
      return 'main';
    }
  }

  // If we can't determine, return null (will be handled as "other" or not tagged)
  return null;
}

/**
 * Helper function to check if tag review is needed
 * @param title - Recipe title
 * @param ingredients - Array of ingredient strings
 * @param steps - Array of cooking step strings
 * @returns True if user should review tags
 */
export async function getTagReviewStatus(
  title: string,
  ingredients: string[],
  steps: string[]
): Promise<boolean> {
  const result = await detectCuisines(title, ingredients, steps);
  return result.needsReview;
}


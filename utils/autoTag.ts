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
      'tandoori', 'vindaloo', 'korma', 'rogan josh', 'indian food',
      'indian cuisine'
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


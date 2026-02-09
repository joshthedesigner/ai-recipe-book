# AI-Powered Cuisine Detection Proposal

## Current Problem

When no dish name is found in the title, we fall back to ingredient-based matching, which is unreliable because:
- Many cuisines share common spices (cumin, turmeric, ginger, garlic)
- Ingredient matching can give false positives
- Example: "Shawarma Pargiyot" gets tagged as Indian because it has 7 matching spices

## Proposed Solution: AI Fallback

Use AI to determine cuisine when no dish match is found.

### Detection Flow

```
1. Check for dish name in title
   → If found: Return that cuisine immediately ✅
   
2. If no dish match: Use AI to analyze recipe
   → AI analyzes: title, ingredients, steps
   → Returns: cuisine name with confidence
   → If high confidence: Use AI result ✅
   
3. Fallback: Ingredient-based matching
   → Only if AI fails or low confidence
```

## Implementation

### AI Prompt for Cuisine Detection

```typescript
const CUISINE_DETECTION_PROMPT = `You are a cuisine classification expert. Analyze the recipe and determine its primary cuisine.

Recipe:
Title: {title}
Ingredients: {ingredients}
Steps: {steps}

Return JSON with:
{
  "cuisine": "japanese" | "chinese" | "italian" | "mexican" | "thai" | "indian" | "korean" | "french" | "greek" | "american" | "vietnamese" | "middle eastern" | "mediterranean" | null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Rules:
- Return null if cuisine is unclear or fusion
- Only return one cuisine (the primary one)
- Confidence should be high (0.8+) for clear matches
- Consider title, ingredients, and cooking methods
- Be conservative - if unsure, return null
`;
```

### Updated detectCuisines Function

```typescript
export async function detectCuisines(
  title: string,
  ingredients: string[],
  steps: string[]
): Promise<{ tags: string[]; needsReview: boolean }> {
  const titleLower = (title || '').toLowerCase();
  
  // Pass 1: Check for dish names in title (fast, no API call)
  for (const config of CUISINE_CONFIGS) {
    const dishInTitle = config.dishes.find(dish => 
      titleLower.includes(dish.toLowerCase())
    );
    
    if (dishInTitle) {
      // Dish name in title = automatic match
      return { tags: [config.name], needsReview: false };
    }
  }
  
  // Pass 2: Check for cuisine name in title
  for (const config of CUISINE_CONFIGS) {
    if (titleLower.includes(config.name.toLowerCase())) {
      return { tags: [config.name], needsReview: false };
    }
  }
  
  // Pass 3: Use AI to analyze recipe (when no dish/cuisine name found)
  try {
    const aiResult = await detectCuisineWithAI(title, ingredients, steps);
    
    if (aiResult && aiResult.confidence >= 0.8) {
      return { tags: [aiResult.cuisine], needsReview: false };
    }
    
    // Low confidence or null - flag for review
    return { tags: [], needsReview: true };
  } catch (error) {
    // AI failed - fall back to ingredient matching
    return detectCuisinesByIngredients(title, ingredients, steps);
  }
}
```

## Benefits

1. **More Accurate**: AI understands context better than keyword matching
2. **Handles Edge Cases**: Works for fusion dishes, regional variations
3. **Reduces False Positives**: Won't tag "Shawarma" as Indian just because of spices
4. **Scalable**: Can handle new cuisines without updating configs

## Trade-offs

**Pros:**
- Much more accurate
- Handles complex cases
- Understands context

**Cons:**
- Requires API call (cost: ~$0.0001-0.0002 per recipe)
- Slightly slower (but only when no dish match)
- Need to handle API failures

## Cost Estimate

- Most recipes: No AI call (dish match found) = $0
- Recipes without dish match: 1 AI call = ~$0.0001-0.0002
- For 1000 recipes, ~200 might need AI = ~$0.02-0.04

## Recommendation

**Implement AI fallback** because:
1. Most recipes will have dish matches (no AI cost)
2. AI only called when needed (no dish match)
3. Much more accurate than ingredient matching
4. Low cost per recipe

This gives us the best of both worlds:
- Fast dish-based detection (most cases)
- Accurate AI detection (edge cases)


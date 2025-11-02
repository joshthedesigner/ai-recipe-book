/**
 * Auto-Tagging Utility
 * 
 * Automatically generates category tags based on recipe ingredients.
 * Used across all recipe entry methods (URL scraping, text input, image extraction).
 */

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
 * Merge auto-generated tags with existing tags (removes duplicates)
 * @param existingTags - Tags already present
 * @param ingredients - Array of ingredient strings
 * @returns Combined unique tags
 */
export function mergeAutoTags(existingTags: string[], ingredients: string[]): string[] {
  const autoTags = generateAutoTags(ingredients);
  const combined = [...existingTags, ...autoTags];
  
  // Remove duplicates and return
  return [...new Set(combined.map(tag => tag.toLowerCase()))];
}


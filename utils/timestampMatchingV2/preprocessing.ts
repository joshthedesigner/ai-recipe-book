/**
 * Text Preprocessing for Steps-First Matching
 * 
 * Handles normalization, synonym mapping, and filler word removal
 */

/**
 * Cooking synonym map for better text matching
 */
const COOKING_SYNONYMS: { [key: string]: string } = {
  'pan': 'skillet',
  'skillet': 'pan',
  'stir': 'mix',
  'mix': 'stir',
  'cook': 'prepare',
  'prepare': 'cook',
  'fry': 'sauté',
  'sauté': 'fry',
  'cut': 'chop',
  'chop': 'cut',
  'slice': 'cut',
  'dice': 'chop',
  'mince': 'chop',
  'boil': 'simmer',
  'simmer': 'boil',
  'roast': 'bake',
  'bake': 'roast',
  'season': 'spice',
  'spice': 'season',
  'pour': 'add',
  'add': 'pour',
};

/**
 * Filler words to remove for better matching
 */
const FILLER_WORDS = new Set([
  'now', 'okay', 'ok', 'so', 'well', 'you know', 'actually', 'basically',
  'really', 'very', 'just', 'sort of', 'kind of', 'like', 'um', 'uh',
  'right', 'see', 'know', 'think', 'suppose', 'probably', 'maybe',
  'perhaps', 'i think', 'i guess', 'i mean', 'you see', 'alright', 'all right'
]);

/**
 * Normalize numbers in text (e.g., "two" -> "2", "three" -> "3")
 */
function normalizeNumbers(text: string): string {
  const numberMap: { [key: string]: string } = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
    'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
    'eighty': '80', 'ninety': '90', 'hundred': '100'
  };
  
  let normalized = text.toLowerCase();
  for (const [word, num] of Object.entries(numberMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, num);
  }
  return normalized;
}

/**
 * Apply cooking synonym mapping
 */
function applySynonyms(text: string): string {
  const words = text.split(' ');
  return words.map(word => {
    const trimmed = word.trim();
    return COOKING_SYNONYMS[trimmed] || trimmed;
  }).join(' ');
}

/**
 * Remove filler words that don't affect meaning
 */
function removeFillerWords(text: string): string {
  const words = text.split(' ');
  return words.filter(word => {
    const trimmed = word.trim();
    return trimmed.length > 0 && !FILLER_WORDS.has(trimmed);
  }).join(' ');
}

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove punctuation
 * - Normalize numbers
 * - Apply synonyms
 * - Remove filler words
 * - Normalize whitespace
 */
export function normalizeText(text: string): string {
  let normalized = normalizeNumbers(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Apply cooking synonyms
  normalized = applySynonyms(normalized);
  
  // Remove filler words
  normalized = removeFillerWords(normalized);
  
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Count words in text (after normalization)
 */
export function countWords(text: string): number {
  const normalized = normalizeText(text);
  return normalized.split(' ').filter(w => w.length > 0).length;
}



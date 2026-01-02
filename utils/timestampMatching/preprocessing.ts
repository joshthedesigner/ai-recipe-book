/**
 * Preprocessing Layer for Timestamp Matching
 * 
 * Normalizes and extracts key information from steps and segments
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { logger } from './logger';
import { getConfig } from './config';

export interface PreprocessedStep {
  originalText: string;
  normalizedText: string;
  keyPhrases: string[];
  cookingActions: string[];
  ingredients: string[];
  index: number;
  estimatedDuration?: number;
}

export interface PreprocessedSegment {
  originalText: string;
  normalizedText: string;
  startMs: number;
  endMs: number;
  duration: number;
  keyPhrases: string[];
  cookingActions: string[];
  ingredients: string[];
  index: number;
}

export interface PreprocessedData {
  steps: PreprocessedStep[];
  segments: PreprocessedSegment[];
  metadata: {
    videoLength: number;
    stepCount: number;
    segmentCount: number;
  };
}

/**
 * Cooking action verbs (for key phrase extraction)
 */
const COOKING_ACTIONS = new Set([
  'add', 'mix', 'heat', 'cook', 'stir', 'chop', 'cut', 'slice', 'dice',
  'boil', 'simmer', 'bake', 'fry', 'season', 'pour', 'place', 'remove',
  'whisk', 'beat', 'fold', 'knead', 'roll', 'spread', 'brush', 'drizzle',
  'sauté', 'roast', 'grill', 'steam', 'blanch', 'braise', 'sear',
  'marinate', 'tenderize', 'mince', 'grate', 'peel', 'core', 'seed',
  'drain', 'rinse', 'pat', 'toss', 'combine', 'blend', 'puree',
]);

/**
 * Filler words to remove
 */
const FILLER_WORDS = new Set([
  'now', 'then', 'so', 'well', 'um', 'uh', 'like', 'you know',
  'actually', 'basically', 'literally', 'really', 'very', 'quite',
  'just', 'simply', 'kind of', 'sort of',
]);

/**
 * Number word to digit mapping
 */
const NUMBER_MAP: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
  'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
  'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
  'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
  'eighty': '80', 'ninety': '90', 'hundred': '100',
};

/**
 * Contraction expansion map
 */
const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "won't": "will not",
  "can't": "cannot",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "hasn't": "has not",
  "haven't": "have not",
  "hadn't": "had not",
  "doesn't": "does not",
  "didn't": "did not",
  "wouldn't": "would not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "mustn't": "must not",
  "mightn't": "might not",
  "needn't": "need not",
  "I'm": "I am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "I've": "I have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "I'll": "I will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "we'll": "we will",
  "they'll": "they will",
  "I'd": "I would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "we'd": "we would",
  "they'd": "they would",
};

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let normalized = text.trim();
  
  // Expand contractions
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    normalized = normalized.replace(regex, expansion);
  }
  
  // Normalize numbers
  for (const [word, num] of Object.entries(NUMBER_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, num);
  }
  
  // Lowercase
  normalized = normalized.toLowerCase();
  
  // Remove punctuation (keep spaces)
  normalized = normalized.replace(/[^\w\s\d]/g, ' ');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Extract key phrases from text
 */
function extractKeyPhrases(text: string): {
  keyPhrases: string[];
  cookingActions: string[];
  ingredients: string[];
} {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(w => w.length > 1);
  
  const keyPhrases: string[] = [];
  const cookingActions: string[] = [];
  const ingredients: string[] = [];
  
  // Extract cooking actions
  for (const word of words) {
    if (COOKING_ACTIONS.has(word)) {
      cookingActions.push(word);
      keyPhrases.push(word);
    }
  }
  
  // Extract potential ingredients (nouns that aren't common words)
  // Simple heuristic: words that aren't cooking actions, filler words, or common verbs
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  ]);
  
  for (const word of words) {
    if (word.length > 3 && 
        !COOKING_ACTIONS.has(word) && 
        !FILLER_WORDS.has(word) && 
        !commonWords.has(word) &&
        !/^\d+$/.test(word)) { // Not just a number
      // Likely an ingredient or tool
      ingredients.push(word);
      keyPhrases.push(word);
    }
  }
  
  // Remove duplicates
  return {
    keyPhrases: [...new Set(keyPhrases)],
    cookingActions: [...new Set(cookingActions)],
    ingredients: [...new Set(ingredients)],
  };
}

/**
 * Estimate step duration based on complexity
 */
function estimateStepDuration(step: PreprocessedStep): number {
  // Base duration: 10 seconds
  let duration = 10;
  
  // Add time for each cooking action (5 seconds each)
  duration += step.cookingActions.length * 5;
  
  // Add time for multiple ingredients (2 seconds each after first)
  if (step.ingredients.length > 1) {
    duration += (step.ingredients.length - 1) * 2;
  }
  
  // Longer text suggests more complex step
  if (step.originalText.length > 100) {
    duration += 5;
  }
  
  return duration;
}

/**
 * Preprocess recipe steps
 */
export function preprocessSteps(steps: string[]): PreprocessedStep[] {
  logger.debug(`Preprocessing ${steps.length} steps`);
  
  return steps.map((step, index) => {
    const normalized = normalizeText(step);
    const { keyPhrases, cookingActions, ingredients } = extractKeyPhrases(step);
    
    const preprocessed: PreprocessedStep = {
      originalText: step,
      normalizedText: normalized,
      keyPhrases,
      cookingActions,
      ingredients,
      index,
    };
    
    // Estimate duration
    preprocessed.estimatedDuration = estimateStepDuration(preprocessed);
    
    return preprocessed;
  });
}

/**
 * Preprocess transcript segments
 */
export function preprocessSegments(segments: TranscriptSegment[]): PreprocessedSegment[] {
  logger.debug(`Preprocessing ${segments.length} segments`);
  
  return segments.map((segment, index) => {
    const normalized = normalizeText(segment.text);
    const { keyPhrases, cookingActions, ingredients } = extractKeyPhrases(segment.text);
    
    return {
      originalText: segment.text,
      normalizedText: normalized,
      startMs: segment.startMs,
      endMs: segment.endMs,
      duration: segment.endMs - segment.startMs,
      keyPhrases,
      cookingActions,
      ingredients,
      index,
    };
  });
}

/**
 * Preprocess complete input for timestamp matching
 */
export function preprocessTimestampMatchingInput(
  steps: string[],
  segments: TranscriptSegment[],
  videoLength: number
): PreprocessedData {
  logger.stage('preprocessing', {
    stepCount: steps.length,
    segmentCount: segments.length,
    videoLength,
  });
  
  const preprocessedSteps = preprocessSteps(steps);
  const preprocessedSegments = preprocessSegments(segments);
  
  logger.debug('Preprocessing complete', {
    stepCount: preprocessedSteps.length,
    segmentCount: preprocessedSegments.length,
    avgKeyPhrasesPerStep: preprocessedSteps.reduce((sum, s) => sum + s.keyPhrases.length, 0) / preprocessedSteps.length,
    avgKeyPhrasesPerSegment: preprocessedSegments.reduce((sum, s) => sum + s.keyPhrases.length, 0) / preprocessedSegments.length,
  });
  
  return {
    steps: preprocessedSteps,
    segments: preprocessedSegments,
    metadata: {
      videoLength,
      stepCount: steps.length,
      segmentCount: segments.length,
    },
  };
}



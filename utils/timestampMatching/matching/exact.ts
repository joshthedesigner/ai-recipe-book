/**
 * Exact Text Matching Strategy
 * 
 * Fast, local text-based matching using string similarity algorithms
 */

import { PreprocessedStep, PreprocessedSegment } from '../preprocessing';
import { getConfig } from '../config';
import { logger } from '../logger';

export interface ExactMatchResult {
  stepIndex: number;
  segmentIndex: number;
  timestamp: number;
  confidence: number;
  matchType: 'exact' | 'substring' | 'fuzzy';
  reasoning?: string;
}

/**
 * Calculate Jaro-Winkler similarity (0-1)
 * Good for short strings with potential typos
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  // Jaro distance
  const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (
    matches / str1.length +
    matches / str2.length +
    (matches - transpositions / 2) / matches
  ) / 3.0;
  
  // Winkler modification (prefix bonus)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate normalized similarity from Levenshtein distance (0-1)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1.0 : 1 - (distance / maxLen);
}

/**
 * Calculate word overlap similarity (0-1)
 */
function wordOverlapSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 1));
  
  if (words1.size === 0 && words2.size === 0) return 1.0;
  if (words1.size === 0 || words2.size === 0) return 0.0;
  
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }
  
  // Jaccard similarity
  const union = words1.size + words2.size - matches;
  return union === 0 ? 0.0 : matches / union;
}

/**
 * Calculate key phrase overlap
 */
function keyPhraseOverlap(step: PreprocessedStep, segment: PreprocessedSegment): number {
  if (step.keyPhrases.length === 0 && segment.keyPhrases.length === 0) return 1.0;
  if (step.keyPhrases.length === 0 || segment.keyPhrases.length === 0) return 0.0;
  
  const stepPhrases = new Set(step.keyPhrases);
  const segmentPhrases = new Set(segment.keyPhrases);
  
  let matches = 0;
  for (const phrase of stepPhrases) {
    if (segmentPhrases.has(phrase)) matches++;
  }
  
  // Weighted by importance (cooking actions are more important)
  const cookingActionMatches = step.cookingActions.filter(a => 
    segment.cookingActions.includes(a)
  ).length;
  
  const baseScore = matches / Math.max(stepPhrases.size, segmentPhrases.size);
  const cookingBonus = cookingActionMatches > 0 ? 0.2 : 0;
  
  return Math.min(1.0, baseScore + cookingBonus);
}

/**
 * Match step to segment using exact text matching
 */
export function matchStepToSegment(
  step: PreprocessedStep,
  segment: PreprocessedSegment,
  constraints?: {
    minTimestamp?: number;
    maxTimestamp?: number;
  }
): ExactMatchResult | null {
  const config = getConfig();
  
  // Check timestamp constraints
  const segmentTimestamp = Math.floor(segment.startMs / 1000);
  if (constraints) {
    if (constraints.minTimestamp !== undefined && segmentTimestamp < constraints.minTimestamp) {
      return null;
    }
    if (constraints.maxTimestamp !== undefined && segmentTimestamp >= constraints.maxTimestamp) {
      return null;
    }
  }
  
  // Strategy 1: Exact match (normalized)
  if (step.normalizedText === segment.normalizedText) {
    return {
      stepIndex: step.index,
      segmentIndex: segment.index,
      timestamp: segmentTimestamp,
      confidence: 1.0,
      matchType: 'exact',
      reasoning: 'Exact normalized text match',
    };
  }
  
  // Strategy 2: Substring match (one contains the other)
  const longer = step.normalizedText.length > segment.normalizedText.length 
    ? step.normalizedText 
    : segment.normalizedText;
  const shorter = step.normalizedText.length > segment.normalizedText.length 
    ? segment.normalizedText 
    : step.normalizedText;
  
  if (longer.includes(shorter) && shorter.length >= 10) {
    const confidence = shorter.length / longer.length;
    if (confidence >= config.exactMatchThreshold) {
      return {
        stepIndex: step.index,
        segmentIndex: segment.index,
        timestamp: segmentTimestamp,
        confidence,
        matchType: 'substring',
        reasoning: `Substring match (${(confidence * 100).toFixed(0)}% coverage)`,
      };
    }
  }
  
  // Strategy 3: Fuzzy matching (combine multiple similarity metrics)
  const jaroWinkler = jaroWinklerSimilarity(step.normalizedText, segment.normalizedText);
  const levenshtein = levenshteinSimilarity(step.normalizedText, segment.normalizedText);
  const wordOverlap = wordOverlapSimilarity(step.normalizedText, segment.normalizedText);
  const keyPhraseOverlapScore = keyPhraseOverlap(step, segment);
  
  // Weighted combination
  const fuzzyScore = (
    jaroWinkler * 0.3 +
    levenshtein * 0.3 +
    wordOverlap * 0.2 +
    keyPhraseOverlapScore * 0.2
  );
  
  if (fuzzyScore >= config.exactMatchThreshold) {
    return {
      stepIndex: step.index,
      segmentIndex: segment.index,
      timestamp: segmentTimestamp,
      confidence: fuzzyScore,
      matchType: 'fuzzy',
      reasoning: `Fuzzy match (J-W: ${jaroWinkler.toFixed(2)}, Lev: ${levenshtein.toFixed(2)}, Words: ${wordOverlap.toFixed(2)}, KeyPhrases: ${keyPhraseOverlapScore.toFixed(2)})`,
    };
  }
  
  return null;
}

/**
 * Match all steps to segments using exact matching
 */
export function matchStepsExact(
  steps: PreprocessedStep[],
  segments: PreprocessedSegment[],
  constraints?: {
    minTimestamp?: number;
    maxTimestamp?: number;
    excludeSegmentIndices?: Set<number>;
  }
): ExactMatchResult[] {
  const config = getConfig();
  const matches: ExactMatchResult[] = [];
  const usedSegmentIndices = new Set<number>(constraints?.excludeSegmentIndices || []);
  
  logger.debug(`Exact matching: ${steps.length} steps against ${segments.length} segments`);
  
  for (const step of steps) {
    let bestMatch: ExactMatchResult | null = null;
    
    for (const segment of segments) {
      // Skip already used segments
      if (usedSegmentIndices.has(segment.index)) continue;
      
      const match = matchStepToSegment(step, segment, {
        minTimestamp: constraints?.minTimestamp,
        maxTimestamp: constraints?.maxTimestamp,
      });
      
      if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
        bestMatch = match;
      }
    }
    
    if (bestMatch && bestMatch.confidence >= config.exactMatchThreshold) {
      matches.push(bestMatch);
      usedSegmentIndices.add(bestMatch.segmentIndex);
      
      logger.matchResult(
        bestMatch.stepIndex,
        bestMatch.timestamp,
        bestMatch.confidence,
        'exact',
        { matchType: bestMatch.matchType }
      );
    }
  }
  
  logger.info(`Exact matching complete: ${matches.length}/${steps.length} matches`, {
    matchRate: matches.length / steps.length,
  });
  
  return matches;
}



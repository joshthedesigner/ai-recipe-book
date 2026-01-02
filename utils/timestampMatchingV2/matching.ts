/**
 * Step Matching Logic (Steps-First Approach)
 * 
 * Matches recipe steps to transcript segments without boundary constraints.
 * Uses text similarity, temporal smoothness, and adaptive thresholds.
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { MatchedStep, UnmatchedStep, StepMatchingResult, MatchingConfig } from './types';
import { normalizeText, countWords } from './preprocessing';
import { getConfig } from './config';

/**
 * Calculate similarity between two normalized strings (0-1)
 * Uses multiple strategies for better matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Strategy 1: Check for substring match (one contains the other)
  if (longer.includes(shorter)) {
    return Math.min(0.95, shorter.length / longer.length); // Cap at 0.95 to allow exact matches to be 1.0
  }
  
  // Strategy 2: Word overlap scoring (Jaccard similarity)
  const words1 = new Set(str1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 1));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
  
  // Strategy 3: Partial word matches (fuzzy matching)
  const partialMatches = [...words1].filter(word => 
    [...words2].some(w2 => w2.includes(word) || word.includes(w2))
  );
  const partialScore = words1.size > 0 ? partialMatches.length / words1.size : 0;
  
  // Strategy 4: Key phrase matching (cooking terms are important)
  const keyPhrases = ['add', 'mix', 'heat', 'cook', 'stir', 'chop', 'cut', 'slice', 'dice', 
     'boil', 'simmer', 'bake', 'fry', 'sauté', 'season', 'pour', 'place', 'remove', 'combine',
     'whisk', 'beat', 'fold', 'knead', 'roll', 'spread', 'grate', 'peel', 'drain', 'rinse'];
  
  const keyPhrasesInStep = [...words1].filter(w => keyPhrases.includes(w));
  const keyPhrasesInSegment = [...words2].filter(w => keyPhrases.includes(w));
  
  // If key phrases match, boost the score
  let keyPhraseBoost = 0;
  if (keyPhrasesInStep.length > 0 && keyPhrasesInSegment.length > 0) {
    const matchingKeyPhrases = keyPhrasesInStep.filter(kp => keyPhrasesInSegment.includes(kp));
    keyPhraseBoost = matchingKeyPhrases.length / Math.max(keyPhrasesInStep.length, 1) * 0.2;
  }
  
  // Combine scores: Jaccard (most important) + partial matches + key phrase boost
  const baseScore = Math.max(jaccardScore, partialScore * 0.8);
  const finalScore = Math.min(1.0, baseScore + keyPhraseBoost);
  
  return finalScore;
}

/**
 * Get adaptive threshold based on step length
 */
function getAdaptiveThreshold(wordCount: number, config: MatchingConfig): number {
  if (wordCount < 10) {
    return config.adaptiveThresholds.shortStep;
  } else if (wordCount <= 20) {
    return config.adaptiveThresholds.mediumStep;
  } else {
    return config.adaptiveThresholds.longStep;
  }
}

/**
 * Match a single step to transcript segments
 */
function matchStep(
  stepText: string,
  stepIndex: number,
  transcriptSegments: TranscriptSegment[],
  usedSegmentIndices: Set<number>,
  lastTimestamp: number | null,
  config: MatchingConfig,
  totalSteps?: number // Add totalSteps parameter
): MatchedStep | UnmatchedStep {
  if (!stepText || stepText.trim().length < 10) {
    return {
      stepIndex,
      stepText,
      reason: 'Step text too short',
    };
  }

  const normalizedStep = normalizeText(stepText);
  const wordCount = countWords(stepText);
  const threshold = getAdaptiveThreshold(wordCount, config);

  let bestMatch: {
    segment: TranscriptSegment;
    segmentIndex: number;
    score: number;
    type: 'exact' | 'fuzzy' | 'keyphrase';
    isUsed: boolean;
  } | null = null;
  let bestUnusedMatch: typeof bestMatch = null;

  // Find best matching segment (prefer unused, but allow used for very high-quality matches)
  for (let i = 0; i < transcriptSegments.length; i++) {
    const segment = transcriptSegments[i];
    const normalizedSegment = normalizeText(segment.text);
    const isUsed = usedSegmentIndices.has(i);
    
    // Exact substring match
    if (normalizedSegment.includes(normalizedStep) || normalizedStep.includes(normalizedSegment)) {
      const exactMatch = {
        segment,
        segmentIndex: i,
        score: 1.0,
        type: 'exact' as const,
        isUsed,
      };
      
      // Prefer unused exact matches, but accept used ones if no unused available
      if (!isUsed) {
        bestMatch = exactMatch;
        break; // Exact match on unused segment - take it immediately
      } else if (!bestUnusedMatch) {
        bestUnusedMatch = exactMatch; // Keep as fallback
      }
      continue;
    }
    
    // Fuzzy match
    const similarity = calculateSimilarity(normalizedStep, normalizedSegment);
    if (similarity >= threshold) {
      const match = {
        segment,
        segmentIndex: i,
        score: similarity,
        type: (similarity >= 0.8 ? 'fuzzy' : 'keyphrase') as const,
        isUsed,
      };
      
      if (!isUsed) {
        // Prefer unused segments
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = match;
        }
      } else if (similarity >= 0.9) {
        // Allow reusing segments for very high-quality matches (>= 0.9)
        if (!bestUnusedMatch || similarity > bestUnusedMatch.score) {
          bestUnusedMatch = match;
        }
      } else if (similarity >= 0.8 && totalSteps) {
        // For later steps, also allow reusing segments with high quality (>= 0.8)
        const stepProgress = stepIndex / totalSteps;
        const isLaterStep = stepProgress > 0.5; // Last 50% of steps
        if (isLaterStep) {
          if (!bestUnusedMatch || similarity > bestUnusedMatch.score) {
            bestUnusedMatch = match;
          }
        }
      }
    }
  }

  // Use unused match if available, otherwise fall back to used match (if quality is high enough)
  // Be more lenient for later steps
  const stepProgress = totalSteps ? stepIndex / totalSteps : 0;
  const isLaterStep = stepProgress > 0.5;
  const minScoreForReuse = isLaterStep ? 0.8 : 0.9; // Lower threshold for later steps
  
  if (!bestMatch && bestUnusedMatch && bestUnusedMatch.score >= minScoreForReuse) {
    bestMatch = bestUnusedMatch;
  }

  // Retry with lower threshold if no match found
  if (!bestMatch) {
    const lowerThreshold = threshold * 0.7; // 30% lower threshold
    for (let i = 0; i < transcriptSegments.length; i++) {
      if (usedSegmentIndices.has(i)) continue;
      
      const segment = transcriptSegments[i];
      const normalizedSegment = normalizeText(segment.text);
      const similarity = calculateSimilarity(normalizedStep, normalizedSegment);
      
      if (similarity >= lowerThreshold && similarity < threshold) {
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = {
            segment,
            segmentIndex: i,
            score: similarity,
            type: similarity >= 0.7 ? 'fuzzy' : 'keyphrase',
            isUsed: false,
          };
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      stepIndex,
      stepText,
      reason: 'No match found above threshold',
    };
  }

  const timestamp = Math.floor(bestMatch.segment.startMs / 1000);
  
  // Temporal smoothness check (relaxed for high-quality matches and later steps)
  if (lastTimestamp !== null) {
    const backwardJump = lastTimestamp - timestamp;
    
    // Calculate how far through the recipe we are (0.0 = start, 1.0 = end)
    // This helps us be more lenient for later steps
    const stepProgress = totalSteps ? stepIndex / totalSteps : 0;
    const isLaterStep = stepProgress > 0.75; // Last 25% of steps
    
    // Base max jump
    let maxAllowedJump = config.maxBackwardJump;
    
    // Increase for high-quality matches
    if (bestMatch.score >= 0.9) {
      maxAllowedJump = config.maxBackwardJump * 2;
    } else if (bestMatch.score >= 0.8) {
      maxAllowedJump = config.maxBackwardJump * 1.5;
    }
    
    // Further increase for later steps (they have fewer options)
    if (isLaterStep) {
      maxAllowedJump = maxAllowedJump * 1.5; // 50% more lenient for later steps
    }
    
    if (backwardJump > maxAllowedJump) {
      // For exact matches, be even more lenient
      if (bestMatch.type === 'exact') {
        const exactMaxJump = maxAllowedJump * 1.5;
        if (backwardJump <= exactMaxJump) {
          // Allow it - exact matches are very reliable
        } else {
          return {
            stepIndex,
            stepText,
            reason: `Large backward jump detected (${backwardJump}s > ${exactMaxJump}s)`,
          };
        }
      } else {
        return {
          stepIndex,
          stepText,
          reason: `Large backward jump detected (${backwardJump}s > ${maxAllowedJump}s)`,
        };
      }
    }
  }

  // Validation: timestamp must be reasonable
  if (timestamp < 0 || timestamp > 36000) {
    return {
      stepIndex,
      stepText,
      reason: `Invalid timestamp: ${timestamp}s`,
    };
  }

  return {
    stepIndex,
    stepText,
    timestamp,
    confidence: bestMatch.score,
    matchType: bestMatch.type,
    segmentIndex: bestMatch.segmentIndex,
  } as MatchedStep;
}

/**
 * Match all steps to transcript segments (Phase 1)
 * 
 * Matches steps sequentially with temporal smoothness, but no boundary constraints.
 * This allows steps to match anywhere in the transcript, then we'll group by section later.
 */
export function matchSteps(
  steps: string[],
  transcriptSegments: TranscriptSegment[],
  config: MatchingConfig = getConfig()
): StepMatchingResult {
  if (!steps || steps.length === 0 || !transcriptSegments || transcriptSegments.length === 0) {
    return {
      matchedSteps: [],
      unmatchedSteps: steps.map((step, i) => ({ stepIndex: i, stepText: step })),
      totalSteps: steps.length,
      matchRate: 0,
      averageConfidence: 0,
    };
  }

  const matchedSteps: MatchedStep[] = [];
  const unmatchedSteps: UnmatchedStep[] = [];
  const usedSegmentIndices = new Set<number>();
  let lastTimestamp: number | null = null;

  // Match steps sequentially
  for (let i = 0; i < steps.length; i++) {
    const result = matchStep(
      steps[i],
      i,
      transcriptSegments,
      usedSegmentIndices,
      lastTimestamp,
      config,
      steps.length // Pass total steps count
    );

    if ('timestamp' in result) {
      // Matched
      matchedSteps.push(result);
      // Only mark segment as used if it wasn't already used (allows reuse for exact matches)
      if (!usedSegmentIndices.has(result.segmentIndex) || result.matchType === 'exact') {
        usedSegmentIndices.add(result.segmentIndex);
      }
      lastTimestamp = result.timestamp;
    } else {
      // Unmatched
      unmatchedSteps.push(result);
    }
  }

  // Calculate metrics
  const matchRate = steps.length > 0 ? matchedSteps.length / steps.length : 0;
  const averageConfidence = matchedSteps.length > 0
    ? matchedSteps.reduce((sum, m) => sum + m.confidence, 0) / matchedSteps.length
    : 0;

  return {
    matchedSteps,
    unmatchedSteps,
    totalSteps: steps.length,
    matchRate,
    averageConfidence,
  };
}


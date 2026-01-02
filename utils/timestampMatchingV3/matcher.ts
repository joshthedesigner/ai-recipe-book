/**
 * TimestampMatcher - Core matching logic
 * 
 * Based on proven old system with improvements:
 * - Better similarity calculation
 * - Adaptive thresholds
 * - Exact match reuse support
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { MatchResult, MatchConstraints } from './types';

export class TimestampMatcher {
  private readonly cookingSynonyms: { [key: string]: string } = {
    'pan': 'skillet', 'skillet': 'pan',
    'stir': 'mix', 'mix': 'stir',
    'cook': 'prepare', 'prepare': 'cook',
    'fry': 'sauté', 'sauté': 'fry',
    'cut': 'chop', 'chop': 'cut',
    'slice': 'cut', 'dice': 'chop', 'mince': 'chop',
    'boil': 'simmer', 'simmer': 'boil',
    'roast': 'bake', 'bake': 'roast',
    'season': 'spice', 'spice': 'season',
    'pour': 'add', 'add': 'pour',
  };

  private readonly fillerWords = new Set([
    'now', 'okay', 'ok', 'so', 'well', 'you know', 'actually', 'basically',
    'really', 'very', 'just', 'sort of', 'kind of', 'like', 'um', 'uh',
    'right', 'see', 'know', 'think', 'suppose', 'probably', 'maybe',
    'perhaps', 'i think', 'i guess', 'i mean', 'you see', 'alright', 'all right'
  ]);

  private normalizeText(text: string): string {
    let normalized = this.normalizeNumbers(text)
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    normalized = this.applySynonyms(normalized);
    normalized = this.removeFillerWords(normalized);
    
    return normalized.replace(/\s+/g, ' ').trim();
  }

  private applySynonyms(text: string): string {
    const words = text.split(' ');
    return words.map(word => {
      const trimmed = word.trim();
      return this.cookingSynonyms[trimmed] || trimmed;
    }).join(' ');
  }

  private removeFillerWords(text: string): string {
    const words = text.split(' ');
    return words.filter(word => {
      const trimmed = word.trim();
      return trimmed.length > 0 && !this.fillerWords.has(trimmed);
    }).join(' ');
  }

  private normalizeNumbers(text: string): string {
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
   * Get adaptive threshold based on step length and position
   */
  private getAdaptiveThreshold(wordCount: number, isLaterStep: boolean = false): number {
    let baseThreshold: number;
    if (wordCount < 10) {
      baseThreshold = 0.5;
    } else if (wordCount <= 20) {
      baseThreshold = 0.7;
    } else {
      baseThreshold = 0.8;
    }
    
    // Lower threshold for later steps (they have fewer options)
    return isLaterStep ? Math.max(0.4, baseThreshold - 0.1) : baseThreshold;
  }

  /**
   * Calculate similarity using word overlap and key phrases
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Check for substring match
    if (longer.includes(shorter)) {
      return Math.min(0.95, shorter.length / longer.length);
    }
    
    // Word overlap scoring
    const words1 = new Set(str1.split(' ').filter(w => w.length > 1));
    const words2 = new Set(str2.split(' ').filter(w => w.length > 1));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
    
    // Key phrase boost
    const keyPhrases = ['add', 'mix', 'heat', 'cook', 'stir', 'chop', 'cut', 'slice', 'dice', 
       'boil', 'simmer', 'bake', 'fry', 'sauté', 'season', 'pour', 'place', 'remove', 'combine'];
    
    const keyPhrasesInText = [...words1].filter(w => keyPhrases.includes(w));
    const keyPhrasesInSegment = [...words2].filter(w => keyPhrases.includes(w));
    
    let keyPhraseBoost = 0;
    if (keyPhrasesInText.length > 0 && keyPhrasesInSegment.length > 0) {
      const matchingKeyPhrases = keyPhrasesInText.filter(kp => keyPhrasesInSegment.includes(kp));
      keyPhraseBoost = matchingKeyPhrases.length / Math.max(keyPhrasesInText.length, 1) * 0.2;
    }
    
    return Math.min(1.0, jaccardScore + keyPhraseBoost);
  }

  /**
   * Match text to transcript segments
   */
  match(
    text: string,
    transcriptSegments: TranscriptSegment[],
    constraints?: MatchConstraints,
    isLaterStep: boolean = false
  ): MatchResult | null {
    if (!text || text.trim().length < 10 || !transcriptSegments || transcriptSegments.length === 0) {
      return null;
    }

    const normalizedText = this.normalizeText(text);
    const textWords = normalizedText.split(' ').filter(w => w.length > 1);
    const wordCount = textWords.length;

    // Filter segments by constraints
    let candidateSegments = transcriptSegments.map((seg, idx) => ({ seg, idx }));
    
    if (constraints) {
      candidateSegments = candidateSegments.filter(({ seg, idx }) => {
        const segmentSeconds = Math.floor(seg.startMs / 1000);
        
        if (constraints.minTimestamp !== undefined && segmentSeconds < constraints.minTimestamp) {
          return false;
        }
        if (constraints.maxTimestamp !== undefined && segmentSeconds >= constraints.maxTimestamp) {
          return false;
        }
        
        // Check excluded indices (unless allowing reuse for exact matches)
        if (constraints.excludeIndices?.has(idx) && !constraints.allowReuse) {
          return false;
        }
        
        return true;
      });
    }

    if (candidateSegments.length === 0) {
      return null;
    }

    // Find best matching segment
    let bestMatch: { segment: TranscriptSegment; score: number; type: 'exact' | 'fuzzy' | 'keyphrase' } | null = null;
    let bestUnusedMatch: typeof bestMatch = null;

    for (const { seg, idx } of candidateSegments) {
      const normalizedSegment = this.normalizeText(seg.text);
      const isUsed = constraints?.excludeIndices?.has(idx) || false;
      
      // Exact substring match
      if (normalizedSegment.includes(normalizedText) || normalizedText.includes(normalizedSegment)) {
        const exactMatch = { segment: seg, score: 1.0, type: 'exact' as const };
        
        if (!isUsed) {
          bestMatch = exactMatch;
          break; // Exact match on unused segment - take it immediately
        } else if (!bestUnusedMatch) {
          bestUnusedMatch = exactMatch; // Keep as fallback if allowing reuse
        }
        continue;
      }
      
      // Fuzzy match
      const similarity = this.calculateSimilarity(normalizedText, normalizedSegment);
      
      if (!isUsed) {
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = { segment: seg, score: similarity, type: similarity >= 0.8 ? 'fuzzy' : 'keyphrase' };
        }
      } else if (constraints?.allowReuse && similarity >= 0.9) {
        // Allow reusing segments for very high-quality matches if explicitly allowed
        if (!bestUnusedMatch || similarity > bestUnusedMatch.score) {
          bestUnusedMatch = { segment: seg, score: similarity, type: similarity >= 0.8 ? 'fuzzy' : 'keyphrase' };
        }
      }
    }

    // Use unused match if available and allowing reuse, otherwise fall back to used match for exact
    if (!bestMatch && bestUnusedMatch && constraints?.allowReuse) {
      bestMatch = bestUnusedMatch;
    }

    if (!bestMatch) {
      return null;
    }

    // Apply adaptive threshold
    const threshold = this.getAdaptiveThreshold(wordCount, isLaterStep);
    
    if (bestMatch.score < threshold) {
      return null;
    }

    return {
      segment: bestMatch.segment,
      timestamp: Math.floor(bestMatch.segment.startMs / 1000),
      confidence: bestMatch.score,
      matchType: bestMatch.type
    };
  }
}


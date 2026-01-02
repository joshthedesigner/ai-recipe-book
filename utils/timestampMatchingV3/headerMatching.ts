/**
 * Header Matching - Match section headers to transcript
 * 
 * Headers are more distinctive and easier to match than steps.
 * Used as anchors for step interpolation.
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';
import { TimestampMatcher } from './matcher';

export interface HeaderMatchingResult {
  headerTimestamps: Map<string, number>; // section title -> timestamp
  matchedCount: number;
}

/**
 * Match section headers to transcript segments
 */
export function matchHeaderTimestamps(
  sections: RecipeSection[],
  transcriptSegments: TranscriptSegment[]
): HeaderMatchingResult {
  if (!sections || sections.length === 0 || !transcriptSegments || transcriptSegments.length === 0) {
    return {
      headerTimestamps: new Map(),
      matchedCount: 0,
    };
  }

  const matcher = new TimestampMatcher();
  const headerTimestamps = new Map<string, number>();
  let matchedCount = 0;
  let lastTimestamp: number | null = null;

  sections.forEach((section, sectionIdx) => {
    // Only match sections with meaningful titles
    if (!section.title || section.title.trim().length < 2) {
      return;
    }

    try {
      // Strategy: Find all matches, then pick the best one
      // Prefer matches that are after previous section's timestamp
      const allMatches: Array<{ segment: TranscriptSegment; timestamp: number; score: number }> = [];
      
      // Find all potential matches
      for (const segment of transcriptSegments) {
        const normalizedHeader = section.title.toLowerCase().trim();
        const normalizedSegment = segment.text.toLowerCase().trim();
        
        // Check for exact or substring match
        if (normalizedSegment.includes(normalizedHeader) || normalizedHeader.includes(normalizedSegment)) {
          const timestamp = Math.floor(segment.startMs / 1000);
          if (timestamp >= 0 && timestamp <= 36000) {
            // Calculate match quality (exact = 1.0, substring = ratio)
            const score = normalizedSegment.includes(normalizedHeader) 
              ? normalizedHeader.length / normalizedSegment.length
              : normalizedSegment.length / normalizedHeader.length;
            allMatches.push({ segment, timestamp, score });
          }
        }
      }
      
      if (allMatches.length === 0) {
        // Fallback to matcher for fuzzy matching
        const match = matcher.match(section.title, transcriptSegments, {}, false);
        if (match) {
          if (match.timestamp >= 0 && match.timestamp <= 36000) {
            headerTimestamps.set(section.title, match.timestamp);
            lastTimestamp = match.timestamp;
            matchedCount++;
          }
        }
        return;
      }
      
      // Sort matches by quality (best first), then by timestamp (chronological)
      allMatches.sort((a, b) => {
        // First, prefer matches after previous section
        const aAfterPrevious = lastTimestamp === null || a.timestamp >= lastTimestamp - 10;
        const bAfterPrevious = lastTimestamp === null || b.timestamp >= lastTimestamp - 10;
        
        if (aAfterPrevious && !bAfterPrevious) return -1;
        if (!aAfterPrevious && bAfterPrevious) return 1;
        
        // Then by score (quality)
        if (Math.abs(a.score - b.score) > 0.1) {
          return b.score - a.score;
        }
        
        // Finally by timestamp (prefer earlier matches if scores are similar)
        return a.timestamp - b.timestamp;
      });
      
      const bestMatch = allMatches[0];
      if (bestMatch) {
        headerTimestamps.set(section.title, bestMatch.timestamp);
        lastTimestamp = bestMatch.timestamp;
        matchedCount++;
        
        if (allMatches.length > 1) {
          console.log(`   ℹ️  Header "${section.title}" had ${allMatches.length} matches, selected timestamp ${bestMatch.timestamp}s (score: ${bestMatch.score.toFixed(2)})`);
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Error matching header "${section.title}":`, error);
    }
  });

  console.log(`📋 Header matching: ${matchedCount}/${sections.length} matched`);

  return {
    headerTimestamps,
    matchedCount,
  };
}


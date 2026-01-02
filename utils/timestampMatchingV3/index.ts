/**
 * Timestamp Matching V3 - Main Entry Point
 * 
 * Simple, reliable system based on proven old system logic
 * with improvements for later steps and header matching
 */

import { TranscriptSegment } from '@/utils/youtubeHelpers';
import { RecipeSection } from '@/types';
import { TimestampMatchingResult } from './types';
import { matchStepTimestamps } from './stepMatching';
import { matchHeaderTimestamps } from './headerMatching';

/**
 * Main function: Match recipe steps and headers to video timestamps
 */
export async function matchTimestampsV3(
  steps: string[],
  sections: RecipeSection[] | undefined,
  transcriptSegments: TranscriptSegment[],
  videoLength: number
): Promise<TimestampMatchingResult> {
  const startTime = Date.now();

  // Phase 1: Match headers first (if sections exist)
  let headerTimestamps = new Map<string, number>();
  let matchedHeaders = 0;
  
  if (sections && sections.length > 0) {
    console.log('📋 Phase 1: Matching section headers...');
    const headerResult = matchHeaderTimestamps(sections, transcriptSegments);
    headerTimestamps = headerResult.headerTimestamps;
    matchedHeaders = headerResult.matchedCount;
  }

  // Phase 2: Match steps (using headers as anchors for interpolation)
  console.log('📋 Phase 2: Matching steps...');
  const stepResult = matchStepTimestamps(
    steps,
    transcriptSegments,
    sections,
    headerTimestamps
  );

  // Build section timestamps array
  const sectionTimestamps: (number | undefined)[] = sections
    ? sections.map(s => headerTimestamps.get(s.title || ''))
    : [];

  const processingTimeMs = Date.now() - startTime;

  return {
    stepTimestamps: stepResult.stepTimestamps,
    sectionTimestamps,
    metadata: {
      totalSteps: steps.length,
      matchedSteps: stepResult.matchedCount,
      interpolatedSteps: stepResult.interpolatedCount,
      totalSections: sections?.length || 0,
      matchedHeaders,
      processingTimeMs,
    },
  };
}



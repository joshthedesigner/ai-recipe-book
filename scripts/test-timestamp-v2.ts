/**
 * Test script for Steps-First Timestamp Matching V2
 * 
 * Run with: npx tsx scripts/test-timestamp-v2.ts
 */

require('dotenv').config({ path: '.env.local' });

import { matchTimestampsV2 } from '../utils/timestampMatchingV2';
import { TranscriptSegment } from '../utils/youtubeHelpers';

// Test case 1: Simple flat recipe
const testCase1 = {
  name: 'Flat Recipe - Simple Steps',
  steps: [
    'Add 2 tablespoons of olive oil to the pan',
    'Heat the oil over medium heat',
    'Add the onions and cook until soft',
    'Add garlic and cook for 1 minute',
    'Season with salt and pepper',
  ],
  sections: undefined,
  transcriptSegments: [
    { text: 'first we add two tablespoons of olive oil to the pan', startMs: 5000, endMs: 8000 },
    { text: 'then we heat the oil over medium heat', startMs: 8000, endMs: 11000 },
    { text: 'now add the onions and cook until they are soft', startMs: 11000, endMs: 15000 },
    { text: 'add some garlic and cook for about one minute', startMs: 15000, endMs: 18000 },
    { text: 'season with salt and pepper to taste', startMs: 18000, endMs: 21000 },
  ] as TranscriptSegment[],
  videoLength: 25,
};

// Test case 2: Recipe with sections
const testCase2 = {
  name: 'Sectioned Recipe',
  steps: [
    'Mix flour and water',
    'Knead the dough',
    'Let rest for 30 minutes',
    'Roll out the dough',
    'Cut into shapes',
  ],
  sections: [
    {
      title: 'Dough',
      steps: ['Mix flour and water', 'Knead the dough', 'Let rest for 30 minutes'],
    },
    {
      title: 'Shaping',
      steps: ['Roll out the dough', 'Cut into shapes'],
    },
  ],
  transcriptSegments: [
    { text: 'for the dough we mix flour and water together', startMs: 10000, endMs: 13000 },
    { text: 'then knead the dough until smooth', startMs: 13000, endMs: 18000 },
    { text: 'let it rest for thirty minutes', startMs: 18000, endMs: 20000 },
    { text: 'now for shaping roll out the dough', startMs: 25000, endMs: 28000 },
    { text: 'cut it into your desired shapes', startMs: 28000, endMs: 30000 },
  ] as TranscriptSegment[],
  videoLength: 35,
};

async function runTest(testCase: typeof testCase1) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log('='.repeat(80));

  try {
    const result = await matchTimestampsV2(
      testCase.steps,
      testCase.sections,
      testCase.transcriptSegments,
      testCase.videoLength
    );

    console.log('\n📊 Results:');
    console.log(`   Match Rate: ${(result.quality.matchRate * 100).toFixed(1)}%`);
    console.log(`   Average Confidence: ${result.quality.averageConfidence.toFixed(2)}`);
    console.log(`   Chronological Violations: ${result.quality.chronologicalViolations}`);
    console.log(`   Missing Timestamps: ${result.quality.missingTimestamps}`);
    console.log(`   Processing Time: ${result.metadata.processingTimeMs}ms`);

    console.log('\n📝 Step Timestamps:');
    result.stepTimestamps.forEach((ts, idx) => {
      if (ts !== undefined) {
        const minutes = Math.floor(ts / 60);
        const seconds = ts % 60;
        console.log(`   Step ${idx + 1}: ${minutes}:${seconds.toString().padStart(2, '0')} - "${testCase.steps[idx].substring(0, 50)}${testCase.steps[idx].length > 50 ? '...' : ''}"`);
      } else {
        console.log(`   Step ${idx + 1}: [NO TIMESTAMP] - "${testCase.steps[idx].substring(0, 50)}${testCase.steps[idx].length > 50 ? '...' : ''}"`);
      }
    });

    if (testCase.sections && result.sectionTimestamps.length > 0) {
      console.log('\n📋 Section Timestamps:');
      testCase.sections.forEach((section, idx) => {
        const ts = result.sectionTimestamps[idx];
        if (ts !== undefined) {
          const minutes = Math.floor(ts / 60);
          const seconds = ts % 60;
          console.log(`   "${section.title}": ${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          console.log(`   "${section.title}": [NO TIMESTAMP]`);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing Steps-First Timestamp Matching V2\n');

  try {
    await runTest(testCase1);
    await runTest(testCase2);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests completed!');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();



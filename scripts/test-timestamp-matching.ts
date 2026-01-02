#!/usr/bin/env ts-node

/**
 * Test Script for Timestamp Matching System
 * 
 * Usage: npx tsx scripts/test-timestamp-matching.ts
 * 
 * Make sure .env.local has:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - OPENAI_API_KEY (for semantic matching)
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

import { matchTimestamps, formatMatchingResult } from '../utils/timestampMatching';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { TranscriptSegment } from '../utils/youtubeHelpers';

async function testTimestampMatching() {
  console.log('🧪 Testing Timestamp Matching System\n');
  console.log('='.repeat(60));
  
  // Create standalone Supabase client for testing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
  
  // Test Case 1: Simple exact matches
  console.log('\n📝 Test Case 1: Simple Exact Matches');
  console.log('-'.repeat(60));
  
  const steps1 = [
    'Add salt to the mixture',
    'Mix everything together',
    'Heat the oil in a pan',
  ];
  
  const segments1: TranscriptSegment[] = [
    { text: 'First, add salt to the mixture', startMs: 5000, endMs: 8000 },
    { text: 'Then mix everything together', startMs: 10000, endMs: 13000 },
    { text: 'Heat the oil in a pan', startMs: 15000, endMs: 18000 },
  ];
  
  try {
    const result1 = await matchTimestamps(
      steps1,
      segments1,
      600, // 10 minutes
      'test-video-001',
      supabase
    );
    
    console.log(formatMatchingResult(result1));
    console.log('\nStep Timestamps:', result1.stepTimestamps);
    
    // Verify results
    const expected = [5, 10, 15];
    let correct = 0;
    for (let i = 0; i < steps1.length; i++) {
      const actual = result1.stepTimestamps[i];
      const exp = expected[i];
      if (actual && Math.abs(actual - exp) <= 2) {
        correct++;
      }
    }
    console.log(`\n✅ Accuracy: ${(correct / steps1.length * 100).toFixed(0)}%`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Test Case 2: Paraphrasing (semantic matching)
  console.log('\n\n📝 Test Case 2: Paraphrasing (Semantic Matching)');
  console.log('-'.repeat(60));
  
  const steps2 = [
    'Add two cups of flour',
    'Mix in three eggs',
    'Cook for five minutes',
  ];
  
  const segments2: TranscriptSegment[] = [
    { text: 'Add two cups of flour to the bowl', startMs: 3000, endMs: 6000 },
    { text: 'Then mix in three eggs', startMs: 8000, endMs: 11000 },
    { text: 'Cook it for about five minutes', startMs: 15000, endMs: 18000 },
  ];
  
  try {
    const result2 = await matchTimestamps(
      steps2,
      segments2,
      300, // 5 minutes
      'test-video-002',
      supabase
    );
    
    console.log(formatMatchingResult(result2));
    console.log('\nStep Timestamps:', result2.stepTimestamps);
    console.log(`\n✅ Match Rate: ${(result2.qualityReport.matchRate * 100).toFixed(0)}%`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Test Case 3: Missing matches (position fallback)
  console.log('\n\n📝 Test Case 3: Missing Matches (Position Fallback)');
  console.log('-'.repeat(60));
  
  const steps3 = [
    'Step one',
    'Step two',
    'Step three',
    'Step four',
    'Step five',
  ];
  
  const segments3: TranscriptSegment[] = [
    { text: 'Step one', startMs: 2000, endMs: 4000 },
    // Missing step two
    { text: 'Step three', startMs: 10000, endMs: 12000 },
    // Missing step four
    { text: 'Step five', startMs: 20000, endMs: 22000 },
  ];
  
  try {
    const result3 = await matchTimestamps(
      steps3,
      segments3,
      300, // 5 minutes
      'test-video-003',
      supabase
    );
    
    console.log(formatMatchingResult(result3));
    console.log('\nStep Timestamps:', result3.stepTimestamps);
    console.log(`\n✅ Coverage: ${result3.metadata.matchedSteps}/${result3.metadata.totalSteps} steps`);
    console.log(`✅ All steps have timestamps: ${result3.stepTimestamps.every(t => t !== null)}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

// Run tests
testTimestampMatching().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


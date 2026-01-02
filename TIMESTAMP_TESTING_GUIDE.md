# Timestamp Matching System - Testing Guide

## Quick Start Testing

### 1. Unit Test Individual Components

Create a test file: `utils/timestampMatching/__tests__/preprocessing.test.ts`

```typescript
import { preprocessSteps, preprocessSegments } from '../preprocessing';
import { TranscriptSegment } from '@/utils/youtubeHelpers';

describe('Preprocessing', () => {
  it('should normalize text correctly', () => {
    const steps = ["Add 2 cups of flour", "Don't overmix"];
    const preprocessed = preprocessSteps(steps);
    
    expect(preprocessed[0].normalizedText).toContain('2');
    expect(preprocessed[1].normalizedText).toContain('do not');
  });
  
  it('should extract cooking actions', () => {
    const steps = ["Add salt", "Mix ingredients", "Heat oil"];
    const preprocessed = preprocessSteps(steps);
    
    expect(preprocessed[0].cookingActions).toContain('add');
    expect(preprocessed[1].cookingActions).toContain('mix');
    expect(preprocessed[2].cookingActions).toContain('heat');
  });
});
```

### 2. Integration Test with Real Data

Create: `utils/timestampMatching/__tests__/pipeline.test.ts`

```typescript
import { matchTimestamps } from '../pipeline';
import { createClient } from '@/db/supabaseServer';
import { TranscriptSegment } from '@/utils/youtubeHelpers';

describe('Timestamp Matching Pipeline', () => {
  const supabase = createClient();
  
  it('should match timestamps for simple recipe', async () => {
    const steps = [
      'Add salt to the mixture',
      'Mix everything together',
      'Heat the oil in a pan',
    ];
    
    const segments: TranscriptSegment[] = [
      { text: 'First, add salt to the mixture', startMs: 5000, endMs: 8000 },
      { text: 'Then mix everything together', startMs: 10000, endMs: 13000 },
      { text: 'Heat the oil in a pan', startMs: 15000, endMs: 18000 },
    ];
    
    const result = await matchTimestamps(
      steps,
      segments,
      600, // 10 minutes
      'test-video-123',
      supabase
    );
    
    expect(result.stepTimestamps).toHaveLength(3);
    expect(result.stepTimestamps[0]).toBe(5); // 5 seconds
    expect(result.stepTimestamps[1]).toBe(10); // 10 seconds
    expect(result.stepTimestamps[2]).toBe(15); // 15 seconds
    expect(result.qualityReport.quality).toBe('excellent');
  });
});
```

### 3. Manual Testing Script

Create: `scripts/test-timestamp-matching.ts`

```typescript
#!/usr/bin/env ts-node

import { matchTimestamps, formatMatchingResult } from '../utils/timestampMatching';
import { createClient } from '../db/supabaseServer';
import { TranscriptSegment } from '../utils/youtubeHelpers';

async function testTimestampMatching() {
  const supabase = createClient();
  
  // Test data
  const steps = [
    'Add 2 cups of flour',
    'Mix in 3 eggs',
    'Heat oil in a large pan',
    'Cook for 5 minutes',
    'Serve hot',
  ];
  
  const segments: TranscriptSegment[] = [
    { text: 'First, add two cups of flour', startMs: 2000, endMs: 5000 },
    { text: 'Then mix in three eggs', startMs: 6000, endMs: 9000 },
    { text: 'Heat the oil in a large pan', startMs: 12000, endMs: 15000 },
    { text: 'Cook for about five minutes', startMs: 18000, endMs: 21000 },
    { text: 'Serve it hot', startMs: 24000, endMs: 27000 },
  ];
  
  console.log('🧪 Testing Timestamp Matching...\n');
  console.log('Steps:', steps);
  console.log('Segments:', segments.length, 'segments\n');
  
  try {
    const result = await matchTimestamps(
      steps,
      segments,
      300, // 5 minutes
      'test-video-001',
      supabase
    );
    
    console.log('\n' + formatMatchingResult(result));
    console.log('\n📊 Detailed Results:');
    console.log('Step Timestamps:', result.stepTimestamps);
    console.log('\nMatches:');
    result.matches.forEach(match => {
      console.log(`  Step ${match.stepIndex + 1}: ${match.timestamp}s (${match.strategy}, confidence: ${match.confidence.toFixed(2)})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTimestampMatching();
```

Run with:
```bash
npx ts-node scripts/test-timestamp-matching.ts
```

## Testing with Real YouTube Videos

### 1. Test with Known Good Video

```typescript
import { extractYouTubeId, getYouTubeCaptions } from '@/utils/youtubeHelpers';
import { matchTimestamps } from '@/utils/timestampMatching';
import { createClient } from '@/db/supabaseServer';

async function testWithYouTubeVideo(videoUrl: string) {
  const supabase = createClient();
  const videoId = extractYouTubeId(videoUrl);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }
  
  // Get captions
  const captionData = await getYouTubeCaptions(videoId, true);
  if (!captionData || !captionData.segments) {
    throw new Error('No captions available');
  }
  
  // Extract recipe steps (you'll need to get these from recipe extraction)
  const steps = [
    // ... recipe steps from extraction
  ];
  
  // Match timestamps
  const result = await matchTimestamps(
    steps,
    captionData.segments,
    Math.max(...captionData.segments.map(s => s.endMs)) / 1000,
    videoId,
    supabase
  );
  
  console.log(formatMatchingResult(result));
  
  // Verify timestamps make sense
  result.matches.forEach(match => {
    const segment = captionData.segments.find(s => 
      Math.floor(s.startMs / 1000) === match.timestamp
    );
    console.log(`Step ${match.stepIndex + 1}: "${steps[match.stepIndex]}"`);
    console.log(`  → ${match.timestamp}s: "${segment?.text}"`);
    console.log(`  Strategy: ${match.strategy}, Confidence: ${match.confidence.toFixed(2)}\n`);
  });
}
```

### 2. Compare with Manual Timestamps

Create a test with known correct timestamps:

```typescript
interface TestCase {
  videoId: string;
  steps: string[];
  expectedTimestamps: number[]; // Manual timestamps
  tolerance: number; // Seconds tolerance
}

const testCases: TestCase[] = [
  {
    videoId: 'abc123',
    steps: ['Add salt', 'Mix', 'Heat'],
    expectedTimestamps: [10, 30, 60],
    tolerance: 5, // Within 5 seconds
  },
];

async function validateAccuracy(testCase: TestCase) {
  // ... get segments and match
  const result = await matchTimestamps(...);
  
  let correct = 0;
  for (let i = 0; i < testCase.steps.length; i++) {
    const actual = result.stepTimestamps[i];
    const expected = testCase.expectedTimestamps[i];
    const diff = Math.abs(actual - expected);
    
    if (diff <= testCase.tolerance) {
      correct++;
    } else {
      console.warn(`Step ${i + 1}: Expected ${expected}s, got ${actual}s (diff: ${diff}s)`);
    }
  }
  
  const accuracy = correct / testCase.steps.length;
  console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  return accuracy;
}
```

## Performance Testing

### Benchmark Script

```typescript
async function benchmarkMatching() {
  const testSizes = [
    { steps: 5, segments: 50 },
    { steps: 10, segments: 100 },
    { steps: 20, segments: 200 },
  ];
  
  for (const size of testSizes) {
    const steps = Array(size.steps).fill(0).map((_, i) => `Step ${i + 1}`);
    const segments = Array(size.segments).fill(0).map((_, i) => ({
      text: `Segment ${i}`,
      startMs: i * 1000,
      endMs: (i + 1) * 1000,
    }));
    
    const start = Date.now();
    const result = await matchTimestamps(
      steps,
      segments,
      600,
      'benchmark',
      supabase
    );
    const duration = Date.now() - start;
    
    console.log(`${size.steps} steps, ${size.segments} segments: ${duration}ms`);
  }
}
```

## Testing Checklist

- [ ] **Unit Tests**: All individual components
- [ ] **Integration Tests**: Full pipeline with test data
- [ ] **Real Video Tests**: Test with actual YouTube videos
- [ ] **Accuracy Tests**: Compare with manual timestamps
- [ ] **Performance Tests**: Benchmark with various sizes
- [ ] **Error Handling**: Test with invalid inputs
- [ ] **Edge Cases**: Empty steps, no segments, very long videos
- [ ] **Caching**: Verify cache works correctly
- [ ] **Chronological**: Verify timestamps are sequential
- [ ] **Quality Reports**: Verify metrics are accurate

## Debugging Tips

### Enable Debug Logging

Set environment variable:
```bash
TIMESTAMP_LOG_LEVEL=debug
```

### Check Cache

```typescript
// Check if embeddings are cached
const cached = await getCachedEmbeddings(supabase, videoId, segmentIndices);
console.log(`Cached: ${cached.size}/${segmentIndices.length}`);
```

### Inspect Preprocessing

```typescript
const preprocessed = preprocessTimestampMatchingInput(steps, segments, videoLength);
console.log('Preprocessed steps:', preprocessed.steps.map(s => ({
  original: s.originalText,
  normalized: s.normalizedText,
  keyPhrases: s.keyPhrases,
})));
```

### Check Individual Strategies

```typescript
// Test exact matching only
const exactMatches = matchStepsExact(preprocessed.steps, preprocessed.segments);
console.log('Exact matches:', exactMatches);

// Test semantic matching only
const semanticMatches = await matchStepsSemantic(...);
console.log('Semantic matches:', semanticMatches);
```

## Common Issues & Solutions

### Issue: Low Match Rate
**Solution**: 
- Check if steps and segments are normalized correctly
- Lower confidence thresholds in config
- Enable semantic matching
- Check if video has good captions

### Issue: High Cost
**Solution**:
- Verify caching is working
- Check cache hit rate
- Consider disabling semantic matching for simple cases

### Issue: Chronological Violations
**Solution**:
- Check if segments are in chronological order
- Verify video length is correct
- Review adjustment logic

### Issue: Slow Performance
**Solution**:
- Check if embeddings are cached
- Verify batch processing is working
- Check network latency to OpenAI API



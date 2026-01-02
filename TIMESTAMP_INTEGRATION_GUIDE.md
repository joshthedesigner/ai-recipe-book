# Timestamp Matching - Integration Guide

## Quick Integration

### Step 1: Update `utils/videoExtractor.ts`

Find the function `extractRecipeFromTranscript` and replace the old timestamp mapping:

**Old Code** (around line 1092):
```typescript
// Map timestamps to sections AND steps if we have transcript segments
if (transcriptSegments && transcriptSegments.length > 0) {
  // ... old mapping code ...
  extracted.stepTimestamps = mapTimestampsToSteps(extracted.steps, transcriptSegments);
}
```

**New Code**:
```typescript
// Map timestamps using new matching system
if (transcriptSegments && transcriptSegments.length > 0 && extracted.steps.length > 0) {
  try {
    const { matchTimestamps } = await import('@/utils/timestampMatching');
    const { createClient } = await import('@/db/supabaseServer');
    
    const supabase = createClient();
    const videoId = extractYouTubeId(videoUrl);
    const videoLength = Math.max(...transcriptSegments.map(s => s.endMs)) / 1000;
    
    if (videoId && videoLength > 0) {
      const matchingResult = await matchTimestamps(
        extracted.steps,
        transcriptSegments,
        videoLength,
        videoId,
        supabase
      );
      
      extracted.stepTimestamps = matchingResult.stepTimestamps;
      
      // Log quality report
      console.log('⏱️  Timestamp matching complete:');
      console.log(`   Match Rate: ${(matchingResult.qualityReport.matchRate * 100).toFixed(1)}%`);
      console.log(`   Quality: ${matchingResult.qualityReport.quality.toUpperCase()}`);
      console.log(`   Average Confidence: ${matchingResult.qualityReport.averageConfidence.toFixed(2)}`);
    }
  } catch (error) {
    console.warn('⚠️  New timestamp matching failed, falling back to old system:', error);
    // Fallback to old system
    extracted.stepTimestamps = mapTimestampsToSteps(extracted.steps, transcriptSegments);
  }
}
```

### Step 2: Add Feature Flag (Optional but Recommended)

**In `.env.local`**:
```bash
USE_NEW_TIMESTAMP_MATCHING=true
```

**In `utils/videoExtractor.ts`**:
```typescript
const USE_NEW_TIMESTAMP_MATCHING = process.env.USE_NEW_TIMESTAMP_MATCHING === 'true';

if (USE_NEW_TIMESTAMP_MATCHING) {
  // Use new system
  const matchingResult = await matchTimestamps(...);
} else {
  // Use old system
  extracted.stepTimestamps = mapTimestampsToSteps(...);
}
```

### Step 3: Test Integration

1. **Add a YouTube recipe**:
   - Go to your app
   - Add a YouTube video URL
   - Check server logs for timestamp matching output

2. **Verify Results**:
   - Check recipe detail page
   - Verify timestamps appear
   - Click timestamp buttons to verify they work

3. **Check Quality**:
   - Look for quality report in logs
   - Verify match rate is high
   - Check that timestamps are sequential

## Full Integration Example

Here's a complete example of integrating into `extractRecipeFromYouTubeVideo`:

```typescript
import { matchTimestamps } from '@/utils/timestampMatching';
import { createClient } from '@/db/supabaseServer';

export async function extractRecipeFromYouTubeVideo(videoUrl: string): Promise<ExtractedRecipe> {
  // ... existing code ...
  
  // After extracting recipe from transcript
  const recipe = await extractRecipeFromTranscript(captions, sectionHints, transcriptSegments);
  
  // Map timestamps using new system
  if (transcriptSegments && transcriptSegments.length > 0 && recipe.steps.length > 0) {
    try {
      const supabase = createClient();
      const videoId = extractYouTubeId(videoUrl);
      const videoLength = Math.max(...transcriptSegments.map(s => s.endMs)) / 1000;
      
      if (videoId && videoLength > 0) {
        const matchingResult = await matchTimestamps(
          recipe.steps,
          transcriptSegments,
          videoLength,
          videoId,
          supabase
        );
        
        recipe.stepTimestamps = matchingResult.stepTimestamps;
        
        // Log results
        console.log('✅ Timestamp matching:', {
          matchRate: `${(matchingResult.qualityReport.matchRate * 100).toFixed(1)}%`,
          quality: matchingResult.qualityReport.quality,
          confidence: matchingResult.qualityReport.averageConfidence.toFixed(2),
          strategies: matchingResult.metadata.strategiesUsed.join(', '),
        });
      }
    } catch (error) {
      console.warn('⚠️  Timestamp matching failed:', error);
      // Continue without timestamps (or use old system)
    }
  }
  
  // ... rest of function ...
}
```

## Backward Compatibility

The new system is designed to be backward compatible:

1. **Same Output Format**: `stepTimestamps` array (same as before)
2. **Graceful Fallback**: Falls back to old system if new one fails
3. **No Breaking Changes**: Existing code continues to work

## Monitoring Integration

Add monitoring to track system performance:

```typescript
// After matching
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Log to your monitoring system
  console.log(JSON.stringify({
    event: 'timestamp_matching_complete',
    videoId,
    matchRate: matchingResult.qualityReport.matchRate,
    quality: matchingResult.qualityReport.quality,
    processingTime: matchingResult.metadata.processingTimeMs,
    strategies: matchingResult.metadata.strategiesUsed,
  }));
}
```

## Troubleshooting

### Issue: Import errors
**Solution**: Make sure all dependencies are installed:
```bash
npm install
```

### Issue: Database errors
**Solution**: Run the migration:
```sql
-- In Supabase SQL Editor
-- Run: supabase/2025-01-21_add-embedding-cache.sql
```

### Issue: Slow performance
**Solution**: 
- Check if caching is enabled
- Verify embeddings are being cached
- Check network latency to OpenAI

### Issue: Low match rate
**Solution**:
- Check if semantic matching is enabled
- Verify video has good captions
- Check quality report recommendations

## Next Steps After Integration

1. **Monitor**: Watch for errors and performance issues
2. **Validate**: Test with real videos
3. **Optimize**: Adjust thresholds if needed
4. **Document**: Update user-facing docs
5. **Iterate**: Improve based on feedback



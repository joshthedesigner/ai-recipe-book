# Local Testing Guide - Timestamp Matching

## Quick Setup

### 1. Enable Feature Flag

**Add to `.env.local`**:
```bash
USE_NEW_TIMESTAMP_MATCHING=true
```

### 2. Verify Environment Variables

Make sure you have:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

### 3. Start Dev Server

```bash
npm run dev
```

## Testing Steps

### Test 1: Add a YouTube Recipe

1. **Open your app**: `http://localhost:3000`
2. **Add a YouTube video URL** (one with clear recipe steps)
3. **Watch server logs** for:
   ```
   ⏱️  Using NEW timestamp matching system...
   ✅ NEW system: X/Y steps matched
   Quality: EXCELLENT/GOOD/FAIR/POOR
   ```

### Test 2: Check Server Console

Look for these log messages:

**Success Indicators**:
- ✅ `Using NEW timestamp matching system...`
- ✅ `NEW system: X/Y steps matched`
- ✅ `Quality: EXCELLENT` or `GOOD`
- ✅ `Strategies: exact, semantic, position`

**Warning Signs**:
- ⚠️ `falling back to old system` (check error message)
- ⚠️ `Quality: POOR` (low match rate)
- ⚠️ `High use of position fallback` (many estimates)

### Test 3: Verify in UI

1. **Go to recipe detail page**
2. **Check for timestamp buttons** next to steps
3. **Click timestamp** - should seek video to that time
4. **Verify timestamps are sequential** (each step after previous)

### Test 4: Check Database

**In Supabase Dashboard**:
```sql
SELECT 
  id,
  title,
  video_url,
  jsonb_array_length(COALESCE(step_timestamps, '[]'::jsonb)) as timestamp_count,
  step_timestamps
FROM recipes
WHERE video_platform = 'youtube'
ORDER BY created_at DESC
LIMIT 1;
```

Should show:
- `timestamp_count` > 0
- `step_timestamps` array with numbers

## What to Test

### Good Test Videos:
- ✅ Clear step-by-step narration
- ✅ Recipe with 5-15 steps
- ✅ Good quality captions
- ✅ Cooking videos (not just talking)

### Expected Results:

**Excellent Quality**:
- Match rate: 90%+
- Average confidence: 0.8+
- Mostly "exact" or "semantic" matches
- Few "position" fallbacks

**Good Quality**:
- Match rate: 70%+
- Average confidence: 0.6+
- Mix of strategies
- Some position fallbacks

**Fair/Poor Quality**:
- Match rate: <70%
- Low confidence
- Many position fallbacks
- May need better video/captions

## Debugging

### If New System Doesn't Run:

1. **Check feature flag**:
   ```bash
   echo $USE_NEW_TIMESTAMP_MATCHING
   # Should output: true
   ```

2. **Check logs** for:
   - `Using NEW timestamp matching system...` (enabled)
   - `Mapping timestamps to flat list steps (OLD SYSTEM)...` (disabled)

### If Errors Occur:

1. **Check server console** for error messages
2. **Verify Supabase connection**:
   ```bash
   # Test in browser console or API route
   ```
3. **Check OpenAI API key** (for semantic matching)
4. **Verify database migration** ran successfully

### Common Issues:

**Issue**: "No timestamps appearing"
- **Check**: Feature flag enabled?
- **Check**: Video has captions?
- **Check**: Server logs for errors?

**Issue**: "Low match rate"
- **Normal**: Some videos have poor captions
- **Try**: Different video with better narration
- **Check**: Quality report recommendations

**Issue**: "Semantic matching failing"
- **Check**: OpenAI API key valid?
- **Check**: API rate limits?
- **Normal**: Falls back to position matching

## Test Checklist

- [ ] Feature flag enabled in `.env.local`
- [ ] Dev server restarted
- [ ] Added YouTube recipe URL
- [ ] Server logs show "NEW system"
- [ ] Quality report shows GOOD/EXCELLENT
- [ ] Timestamps appear in UI
- [ ] Timestamp buttons work (seek video)
- [ ] Timestamps are sequential
- [ ] Database has `step_timestamps` data

## Success Criteria

✅ **System is working if**:
- Logs show "NEW system" messages
- Match rate > 70%
- Quality is GOOD or EXCELLENT
- Timestamps appear in UI
- No errors in console

## Next Steps After Testing

1. **If working well**: 
   - Test with more videos
   - Monitor quality reports
   - Gradually enable for more users

2. **If issues found**:
   - Check error logs
   - Verify environment variables
   - Test with different videos
   - Disable feature flag if needed

## Quick Test Command

You can also test via API:

```bash
# In another terminal
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"message": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"}'
```

Watch server logs for timestamp matching output.



# Video Recipe Feature - Implementation Plan

## Feature Overview

Add support for extracting recipes from video URLs (YouTube, TikTok, Instagram) and embedding the videos directly in recipe pages. Users can watch the cooking video while following the extracted text recipe below.

## User Benefits

- **Visual + Text Learning**: Watch the video demonstration while reading structured steps
- **Social Media Integration**: Save viral TikTok/Instagram cooking videos as structured recipes
- **In-App Experience**: No need to leave the app to watch source videos
- **Accessibility**: Text recipe available even if video fails to load
- **Searchable**: Video recipes become searchable by ingredients/steps

## Technical Implementation

### Phase 1: Video URL Embedding (No AI Processing)

**Goal**: Display embedded videos for recipes that have video URLs

#### Database Changes

```sql
-- Migration: add_video_support.sql
ALTER TABLE recipes 
  ADD COLUMN video_url TEXT,
  ADD COLUMN video_platform TEXT CHECK (video_platform IN ('youtube', 'tiktok', 'instagram', 'direct'));

CREATE INDEX idx_recipes_video_url ON recipes(video_url) WHERE video_url IS NOT NULL;
```

#### Frontend Changes

**File: `app/recipe/[id]/page.tsx`**

Add video embed section after tags, before hero image:

```typescript
// Helper function
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// In component render:
{recipe.video_url && (
  <Box
    sx={{
      width: { xs: '100%', md: '66.67%' },
      aspectRatio: '16/9',
      borderRadius: 2,
      overflow: 'hidden',
      mb: 3,
      bgcolor: 'black',
    }}
  >
    {recipe.video_platform === 'youtube' && (
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${extractYouTubeId(recipe.video_url)}`}
        title={recipe.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ display: 'block' }}
      />
    )}
    {recipe.video_platform === 'tiktok' && (
      <iframe
        width="100%"
        height="100%"
        src={recipe.video_url.replace('/video/', '/embed/')}
        title={recipe.title}
        frameBorder="0"
        allow="encrypted-media"
        allowFullScreen
        style={{ display: 'block' }}
      />
    )}
    {recipe.video_platform === 'direct' && (
      <video
        width="100%"
        height="100%"
        controls
        style={{ display: 'block' }}
      >
        <source src={recipe.video_url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    )}
  </Box>
)}

{/* Only show image if no video */}
{!recipe.video_url && recipe.image_url && (
  <Box sx={{ /* existing image box */ }}>
    <img src={recipe.image_url} alt={recipe.title} />
  </Box>
)}
```

**File: `types/index.ts`**

Update Recipe interface:
```typescript
export interface Recipe {
  // ... existing fields
  video_url?: string | null;
  video_platform?: 'youtube' | 'tiktok' | 'instagram' | 'direct' | null;
}
```

#### Manual Entry Flow

Update RecipeSidebar to allow manual video URL entry:
1. User pastes video URL
2. System asks: "I see a video URL. Would you like to embed this video with your recipe?"
3. User provides recipe text manually
4. Recipe saves with video_url field
5. Recipe page shows embedded video

**Effort**: 2-3 hours  
**Cost**: Free (no AI processing)  
**Value**: Immediate video embedding capability

---

### Phase 2: Video Transcription with Whisper

**Goal**: Automatically extract recipe from video audio

#### New API Route

**File: `app/api/recipes/extract-from-video/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { getOpenAIClient } from '@/utils/openai';
import { extractRecipeData } from '@/agents/storeRecipe';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { videoUrl } = await request.json();
  
  try {
    // 1. Detect platform and extract audio
    const platform = detectPlatform(videoUrl);
    const audioBuffer = await extractAudioFromVideo(videoUrl, platform);
    
    // 2. Transcribe with Whisper
    const client = getOpenAIClient();
    const transcript = await client.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      response_format: 'text',
    });
    
    console.log('Video transcript:', transcript);
    
    // 3. Extract recipe from transcript
    const recipe = await extractRecipeData(transcript);
    
    // 4. Add video metadata
    recipe.video_url = videoUrl;
    recipe.video_platform = platform;
    recipe.source_url = videoUrl;
    
    return NextResponse.json({
      success: true,
      recipe,
      transcript, // For review/debugging
    });
  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process video',
    }, { status: 500 });
  }
}

function detectPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'direct' {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok')) return 'tiktok';
  if (url.includes('instagram')) return 'instagram';
  return 'direct';
}

async function extractAudioFromVideo(url: string, platform: string): Promise<File> {
  // Implementation using yt-dlp or similar
  // For YouTube: yt-dlp --extract-audio --audio-format mp3 URL
  // Returns audio file buffer
}
```

#### Update Store Recipe Agent

**File: `agents/storeRecipe.ts`**

Add video URL detection:

```typescript
// In storeRecipe function, before URL detection:
const videoUrlPattern = /(?:youtube\.com\/watch|youtu\.be\/|tiktok\.com|instagram\.com\/reel)/i;

if (videoUrlPattern.test(message)) {
  console.log('Video URL detected, using video extraction...');
  
  // Call video API instead of web scraper
  const response = await fetch('/api/recipes/extract-from-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl: message }),
  });
  
  const data = await response.json();
  
  if (data.success && reviewMode) {
    return {
      success: true,
      message: generateRecipePreview(data.recipe),
      data: data.recipe,
    };
  }
  
  // Continue with save if not in review mode
}
```

#### Update RecipeSidebar UI

**File: `components/RecipeSidebar.tsx`**

Update initial message:

```typescript
const INITIAL_MESSAGE = {
  message: `Hi there! 👋

I can help you add delicious recipes in a few easy ways:

🍴 Paste a recipe URL
📺 Paste a video link (YouTube, TikTok)
📸 Upload a photo of a recipe
📝 Describe a recipe in your own words

I can even translate recipes from other languages! 🌍

What would you like to add today?`,
};
```

**Effort**: 6-8 hours  
**Cost**: ~$0.006 per minute of video  
**Value**: Full automatic extraction from videos

---

### Phase 3: Video Upload Support

**Goal**: Allow direct video file uploads

#### Storage Setup

**Supabase Storage Bucket**: `recipe-videos`

```sql
-- Row Level Security policies
CREATE POLICY "Users can upload their own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view all recipe videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-videos');

CREATE POLICY "Users can update their own videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-videos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Frontend Changes

**File: `components/RecipeSidebar.tsx`**

Add video upload input (similar to existing image upload):

```typescript
// Add video file input ref
const videoInputRef = useRef<HTMLInputElement>(null);

// Add handler
const handleVideoClick = () => {
  videoInputRef.current?.click();
};

const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const videoFile = files[0];
  
  // Validate file size (max 100MB)
  if (videoFile.size > 100 * 1024 * 1024) {
    showToast('Video file too large (max 100MB)', 'error');
    return;
  }
  
  // Validate file type
  if (!videoFile.type.startsWith('video/')) {
    showToast('Please upload a video file', 'error');
    return;
  }
  
  setUploadingVideo(true);
  
  // Upload to Supabase Storage
  const filePath = `${user.id}/${Date.now()}-${videoFile.name}`;
  const { data, error } = await supabase.storage
    .from('recipe-videos')
    .upload(filePath, videoFile);
  
  if (error) {
    showToast('Failed to upload video', 'error');
    return;
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('recipe-videos')
    .getPublicUrl(filePath);
  
  // Process video with Whisper
  const response = await fetch('/api/recipes/extract-from-video', {
    method: 'POST',
    body: JSON.stringify({ videoUrl: publicUrl }),
  });
  
  // Show preview
  setUploadingVideo(false);
};

// Add to JSX
<input
  type="file"
  ref={videoInputRef}
  style={{ display: 'none' }}
  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
  onChange={handleVideoUpload}
/>

<IconButton onClick={handleVideoClick}>
  <VideoLibraryIcon />
</IconButton>
```

**Effort**: 4-6 hours  
**Storage**: ~1GB per 100 videos (720p)  
**Value**: Complete video solution

---

## User Experience Flow

### Scenario 1: YouTube Recipe Video

```
User: "Save this: https://youtube.com/watch?v=abc123"

System: 
  1. Detects YouTube URL
  2. Downloads audio
  3. Transcribes with Whisper (30 seconds)
  4. Extracts recipe structure
  5. Shows preview with embedded video
  
User: [Reviews] → Clicks "Save"

Result: Recipe page shows:
  - Embedded YouTube player at top
  - Extracted ingredients on left
  - Extracted steps on right
  - "From: [Channel Name]" link
```

### Scenario 2: TikTok Cooking Video

```
User: Pastes TikTok URL

System:
  1. Detects TikTok
  2. Extracts audio
  3. Transcribes (15 seconds for 60s video)
  4. Parses recipe
  5. Shows TikTok embed in preview

User: Saves

Result: Full TikTok video embedded, recipe below
```

### Scenario 3: Direct Video Upload

```
User: Uploads iPhone cooking video

System:
  1. Uploads to Supabase Storage (progress bar)
  2. Extracts audio
  3. Transcribes
  4. Shows preview with video player

User: Edits/confirms → Saves

Result: Video stored and playable on recipe page
```

---

## Technical Architecture

### Audio Extraction Options

**Option A: yt-dlp (Server-side)**
- Pros: Works with YouTube, TikTok, 1000+ sites
- Cons: Requires system binary, harder deployment
- Best for: Vercel/VPS deployment

**Option B: FFmpeg (Server-side)**
- Pros: Universal audio extraction
- Cons: Large binary, complex setup
- Best for: Self-hosted or cloud functions

**Option C: Cloud Service (Cloudinary, AWS MediaConvert)**
- Pros: Managed, scalable, no server dependencies
- Cons: Additional cost, external dependency
- Best for: Production at scale

**Recommendation for MVP**: Start with yt-dlp for YouTube-only, expand later

---

## Cost Analysis

### OpenAI Whisper API
- **Price**: $0.006 per minute of audio
- **Example costs**:
  - 5-minute video = $0.03
  - 10-minute video = $0.06
  - 20-minute video = $0.12
- **Monthly budget**: 1000 videos × 10 min avg = ~$60

### Supabase Storage
- **Free tier**: 1GB storage
- **Video sizes**:
  - 720p, 10 min ≈ 200MB
  - 1080p, 10 min ≈ 500MB
- **Strategy**: 
  - Link to YouTube/TikTok when possible (0 storage)
  - Only store user uploads
  - Compress videos on upload

### Bandwidth
- Streaming from Supabase Storage included in plan
- Consider CDN for frequently watched videos

---

## Database Schema

### Updated recipes table

```sql
CREATE TABLE recipes (
  -- ... existing columns
  video_url TEXT,                    -- URL to video (YouTube, storage, etc)
  video_platform TEXT,               -- 'youtube', 'tiktok', 'instagram', 'direct'
  video_duration INTEGER,            -- Duration in seconds (optional)
  video_transcript TEXT,             -- Cached transcript (optional)
  video_processed_at TIMESTAMPTZ     -- When transcription happened
);
```

### New video_processing_queue table (optional, for async processing)

```sql
CREATE TABLE video_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transcript TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

---

## Implementation Priorities

### MVP (Minimum Viable Product) - 2-3 hours
1. Add video_url column to database
2. Detect YouTube URLs in RecipeSidebar
3. Embed YouTube player in recipe detail page
4. Manual recipe entry (user provides video + manually types recipe)

**No AI processing, just embedding**

### Phase 2 (AI Processing) - 6-8 hours
1. YouTube audio extraction (yt-dlp)
2. Whisper transcription API integration
3. Recipe extraction from transcript
4. Preview with embedded video
5. Error handling for unclear audio

### Phase 3 (Full Feature) - 12-16 hours
1. TikTok support
2. Instagram Reels support
3. Direct video file upload
4. Supabase storage integration
5. Video compression
6. Progress indicators
7. Picture-in-picture mode
8. Transcript caching

---

## Technical Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "yt-dlp-wrap": "^2.3.0",      // YouTube download wrapper
    "fluent-ffmpeg": "^2.1.2",     // Audio extraction
    "@ffmpeg/ffmpeg": "^0.12.0"    // Browser-side processing (optional)
  }
}
```

### System Requirements

For server deployment:
- yt-dlp binary installed
- ffmpeg binary installed (or use cloud service)

For Vercel:
- Consider serverless functions with longer timeout
- Or use external processing service (Cloudinary, AWS Lambda)

### API Keys Required
- OpenAI API key (already have) - for Whisper
- YouTube Data API (optional) - for video metadata

---

## Video Platform Integration Details

### YouTube

**Embed Code:**
```html
<iframe 
  src="https://www.youtube.com/embed/VIDEO_ID"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
/>
```

**Audio Extraction:**
```bash
yt-dlp --extract-audio --audio-format mp3 --output audio.mp3 VIDEO_URL
```

**Challenges:**
- Some videos have copyright restrictions
- Age-restricted content requires auth
- Very long videos (1+ hour) may timeout

### TikTok

**Embed Code:**
```html
<iframe 
  src="https://www.tiktok.com/embed/VIDEO_ID"
  allow="encrypted-media"
  allowfullscreen
/>
```

**Challenges:**
- TikTok frequently changes embed URLs
- Some videos are private
- Shorter format (60 seconds) - easier to process

### Instagram Reels

**Embed Code:**
```html
<iframe 
  src="https://www.instagram.com/reel/REEL_ID/embed"
  frameborder="0"
  allowfullscreen
/>
```

**Challenges:**
- Requires public posts only
- Instagram frequently changes API
- Audio extraction harder than YouTube

---

## Error Handling & Edge Cases

### Video Processing Failures

1. **No audio track**: Show error, ask user to manually enter recipe
2. **Unclear audio** (music, noise): Show transcript, ask user to edit
3. **Non-recipe content**: AI should detect and reject
4. **Multiple recipes**: Extract all, let user choose
5. **Different language**: Auto-detect with Whisper, translate

### Rate Limiting

- Whisper API: 50 requests per minute
- Strategy: Queue long videos, process in batches
- Show progress: "Position 3 in queue..."

### Video Unavailable

- YouTube video deleted/private
- Store transcript as backup
- Show "Video no longer available" message
- Keep extracted recipe accessible

---

## UI/UX Enhancements

### Recipe Detail Page

**Video Controls:**
- Play/pause
- Volume
- Fullscreen
- Speed (0.5x, 1x, 1.5x, 2x)
- Quality selection (YouTube)

**Layout Options:**
```
Option A: Video above recipe (current plan)
Option B: Video sticky on scroll (picture-in-picture)
Option C: Split screen - video left, recipe right
```

**Mobile Optimization:**
- Responsive video player
- Portrait mode support
- Touch-friendly controls

### RecipeSidebar

**Processing States:**
```
1. "Analyzing video..." (with progress bar)
2. "Extracting audio..."
3. "Transcribing speech..." 
4. "Parsing recipe..."
5. "Here's what I found! [Preview]"
```

**Preview with Video:**
- Show embedded video in preview card
- User can watch before saving
- Edit extracted recipe if needed

---

## Testing Checklist

### Video Embedding
- [ ] YouTube URL detection and embedding
- [ ] YouTube shorts
- [ ] TikTok URL detection and embedding
- [ ] Instagram Reels embedding
- [ ] Video plays on desktop Safari
- [ ] Video plays on mobile Safari/Chrome
- [ ] Video fullscreen mode works
- [ ] Video respects user's autoplay preferences

### Video Transcription
- [ ] Clear narration video (90%+ accuracy)
- [ ] Video with background music
- [ ] Non-English recipe videos
- [ ] Accent diversity (various English accents)
- [ ] Multiple speakers
- [ ] No speech (silent cooking video) - should fail gracefully
- [ ] Very long videos (30+ minutes) - timeout handling
- [ ] Video with multiple recipes

### Edge Cases
- [ ] Private/deleted YouTube video
- [ ] Age-restricted content
- [ ] Copyright-blocked content
- [ ] Invalid video URL
- [ ] Corrupted video file
- [ ] Video too large (>500MB)
- [ ] Video in processing queue

### Database
- [ ] Video URL stored correctly
- [ ] Platform detected correctly
- [ ] Null video_url doesn't break existing recipes
- [ ] Migration runs cleanly on production

---

## Performance Considerations

### Processing Time
- **YouTube (10 min)**: ~30-45 seconds
  - Download audio: 10s
  - Transcribe: 20-30s
  - Parse recipe: 5s

### Optimization Strategies
1. **Parallel processing**: Download while setting up Whisper
2. **Caching**: Store transcript to avoid re-processing
3. **Background jobs**: Queue long videos, email when ready
4. **Progressive disclosure**: Show partial results as they arrive

---

## Security Considerations

### Video URLs
- Validate URL format before processing
- Whitelist allowed domains (YouTube, TikTok only)
- Prevent SSRF attacks with URL validation
- Rate limit video processing per user

### Uploaded Videos
- Scan for malware
- Validate video format (not executable disguised as video)
- Limit file size per user
- Implement storage quotas

### Transcripts
- Don't expose raw transcripts in API responses
- Sanitize extracted text before AI processing
- Rate limit Whisper API calls

---

## Rollback Strategy

### If feature needs to be removed:

1. **Database**: 
```sql
ALTER TABLE recipes 
  DROP COLUMN video_url,
  DROP COLUMN video_platform,
  DROP COLUMN video_duration,
  DROP COLUMN video_transcript;

DROP TABLE IF EXISTS video_processing_queue;
```

2. **Storage**:
```sql
-- Delete storage bucket
DELETE FROM storage.buckets WHERE id = 'recipe-videos';
```

3. **Code**:
- Remove video embed code from `app/recipe/[id]/page.tsx`
- Delete `app/api/recipes/extract-from-video/route.ts`
- Remove video upload UI from `components/RecipeSidebar.tsx`
- Remove video detection from `agents/storeRecipe.ts`

4. **Dependencies**:
```bash
npm uninstall yt-dlp-wrap fluent-ffmpeg @ffmpeg/ffmpeg
```

---

## Future Enhancements

### Timestamp Linking
Link recipe steps to video timestamps:
```typescript
// Enhanced recipe schema
interface RecipeStep {
  text: string;
  videoTimestamp?: number; // seconds into video
}

// UI: Click step → jump to that moment
<Typography onClick={() => seekVideo(step.videoTimestamp)}>
  {step.text}
</Typography>
```

### Interactive Features
- Pause video automatically when user taps a step
- Highlight current step based on video timestamp
- Loop specific steps on repeat
- Slow-mo for complex techniques

### AI-Generated Clips
- Auto-detect key moments
- Generate short clips for each step
- Create GIF previews for sharing

### Community Videos
- Users can add their own video demonstration
- "Cook Along" feature with video sync
- Video ratings and comments

### Multi-Language Support
- Whisper detects 99 languages automatically
- Auto-translate transcript to user's language
- Subtitle generation for accessibility

---

## Monitoring & Analytics

### Track Metrics
- Video processing success rate
- Average processing time
- Whisper API costs per video
- Most popular video sources (YouTube vs TikTok)
- User engagement (watch time vs text-only views)

### Alerts
- Whisper API failures
- Storage approaching limit
- Processing queue backup
- High costs per user

---

## References & Resources

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [YouTube Embed Parameters](https://developers.google.com/youtube/player_parameters)
- [TikTok oEmbed API](https://developers.tiktok.com/doc/embed-videos)
- [FFmpeg Audio Extraction Guide](https://ffmpeg.org/ffmpeg.html#Audio-Options)

---

## Implementation Timeline

### Week 1: MVP (Phase 1)
- Database migration
- YouTube embed support
- Manual video URL entry
- **Deliverable**: Users can embed YouTube videos with manual recipes

### Week 2: AI Processing (Phase 2)
- Whisper API integration
- yt-dlp setup
- Automatic transcription
- Recipe extraction
- **Deliverable**: Paste YouTube URL → auto-extract recipe

### Week 3: Full Feature (Phase 3)
- TikTok support
- Direct upload
- Supabase storage
- UI polish
- **Deliverable**: Complete video recipe platform

---

## Success Criteria

- Users can save YouTube recipe videos
- Whisper accurately transcribes 80%+ of videos
- Video embeds work on all major browsers
- Processing completes in under 60 seconds
- Cost stays under $0.10 per video
- Zero disruption to existing image/URL recipe flow


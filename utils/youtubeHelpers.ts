/**
 * YouTube Helper Utilities
 * 
 * Extract video IDs, captions, and metadata from YouTube URLs
 */

import { Innertube } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/,
    /youtube\.com\/shorts\/([^&\s]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Check if URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * Get YouTube video thumbnail URL
 * Returns optimized thumbnail image (smaller size for better performance)
 */
export function getYouTubeThumbnail(videoUrl: string, size: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string | null {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;
  
  // Thumbnail sizes:
  // default = 120x90 (smallest, ~10KB)
  // mqdefault = 320x180 (medium quality, ~30KB)
  // hqdefault = 480x360 (high quality, ~50KB) - good balance
  // sddefault = 640x480 (standard def, ~80KB)
  // maxresdefault = 1920x1080 (best quality, ~200KB) - too large for cards
  // Using hqdefault as default for good quality/size balance
  return `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
}

/**
 * Get responsive YouTube thumbnail srcset
 * Returns srcset string for responsive images
 */
export function getYouTubeThumbnailSrcSet(videoUrl: string): string | null {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;
  
  // Provide multiple sizes for responsive loading
  const baseUrl = `https://img.youtube.com/vi/${videoId}`;
  return `${baseUrl}/mqdefault.jpg 320w, ${baseUrl}/hqdefault.jpg 480w, ${baseUrl}/sddefault.jpg 640w`;
}

/**
 * Fetch YouTube video captions/subtitles
 * Tries youtubei.js first, falls back to youtube-transcript-ts if it fails
 */
export async function getYouTubeCaptions(videoId: string): Promise<string | null> {
  console.log(`🎥 [youtubeHelpers] Fetching captions for YouTube video: ${videoId}`);
  console.log(`🎥 [youtubeHelpers] Full URL: https://www.youtube.com/watch?v=${videoId}`);
  
  // Try youtubei.js first (primary method)
  try {
    console.log('🎥 [youtubeHelpers] Attempt 1: Trying youtubei.js...');
    console.log('🎥 [youtubeHelpers] Initializing Innertube...');
    // Initialize Innertube (YouTube's internal API)
    const youtube = await Innertube.create();
    console.log('🎥 [youtubeHelpers] ✅ Innertube initialized');
    
    console.log('🎥 [youtubeHelpers] Getting video info...');
    // Get video info
    const info = await youtube.getInfo(videoId);
    
    console.log('🎥 [youtubeHelpers] 📹 Video info retrieved:', {
      title: info.basic_info.title,
      hasCaptions: !!info.captions,
      captionsType: typeof info.captions,
    });
    
    console.log('🎥 [youtubeHelpers] Getting transcript/captions...');
    // Get transcript/captions
    const transcriptData = await info.getTranscript();
    
    console.log('🎥 [youtubeHelpers] 📝 Transcript data:', {
      exists: !!transcriptData,
      hasContent: !!transcriptData?.transcript,
      segmentCount: transcriptData?.transcript?.content?.body?.initial_segments?.length,
      transcriptType: typeof transcriptData?.transcript,
    });
    
    if (!transcriptData || !transcriptData.transcript) {
      console.error('🎥 [youtubeHelpers] ❌ No transcript available for video:', videoId);
      throw new Error('No transcript data from youtubei.js');
    }
    
    // Extract text from transcript segments
    const content = transcriptData.transcript.content;
    if (!content || !content.body) {
      console.error('🎥 [youtubeHelpers] ❌ No transcript content available');
      throw new Error('No transcript content from youtubei.js');
    }
    
    const segments = content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.error('🎥 [youtubeHelpers] ❌ No caption segments found');
      throw new Error('No caption segments from youtubei.js');
    }
    
    console.log(`🎥 [youtubeHelpers] Found ${segments.length} caption segments`);
    
    // Combine all segments into full text
    // Try different possible text locations in the segment object
    const fullTranscript = segments
      .map((segment: any) => {
        // youtubei.js uses different structures - try multiple paths
        if (segment.snippet?.text) {
          return typeof segment.snippet.text === 'string' 
            ? segment.snippet.text 
            : segment.snippet.text.toString?.() || String(segment.snippet.text);
        }
        if (segment.text) {
          return typeof segment.text === 'string'
            ? segment.text
            : segment.text.toString?.() || String(segment.text);
        }
        // Fallback: convert whole segment to string
        return String(segment);
      })
      .join(' ')
      .trim();
    
    if (fullTranscript.length > 0) {
      console.log(`🎥 [youtubeHelpers] ✅ Extracted ${fullTranscript.length} characters of captions from YouTube video using youtubei.js`);
      console.log(`🎥 [youtubeHelpers] ${segments.length} caption segments combined`);
      console.log(`🎥 [youtubeHelpers] Preview: ${fullTranscript.substring(0, 200)}...`);
    return fullTranscript;
    }
    
    throw new Error('Empty transcript from youtubei.js');
    
  } catch (youtubeiError) {
    // Check if it's the specific 400 error we're seeing
    const isBlockedError = youtubeiError instanceof Error && 
      (youtubeiError.message.includes('400') || 
       youtubeiError.message.includes('FAILED_PRECONDITION') ||
       youtubeiError.message.includes('Precondition check failed'));
    
    if (isBlockedError) {
      console.log('🎥 [youtubeHelpers] ⚠️ youtubei.js blocked by YouTube API, trying fallback...');
    } else {
      console.log('🎥 [youtubeHelpers] ⚠️ youtubei.js failed, trying fallback...');
      console.error('🎥 [youtubeHelpers] youtubei.js error:', youtubeiError);
    }
    
    // Fallback to youtube-transcript-ts
    try {
      console.log('🎥 [youtubeHelpers] Attempt 2: Trying youtube-transcript-ts fallback...');
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.error('🎥 [youtubeHelpers] ❌ No transcript segments from youtube-transcript-ts');
        return null;
      }
      
      // Combine all transcript items into full text
      const fullTranscript = transcript
        .map(item => item.text)
        .join(' ')
        .trim();
      
      if (fullTranscript.length > 0) {
        console.log(`🎥 [youtubeHelpers] ✅ Extracted ${fullTranscript.length} characters of captions using youtube-transcript-ts fallback`);
        console.log(`🎥 [youtubeHelpers] ${transcript.length} transcript items combined`);
        console.log(`🎥 [youtubeHelpers] Preview: ${fullTranscript.substring(0, 200)}...`);
        return fullTranscript;
      }
      
      console.error('🎥 [youtubeHelpers] ❌ Empty transcript from youtube-transcript-ts');
      return null;
      
    } catch (fallbackError) {
      console.error('🎥 [youtubeHelpers] ❌ Fallback method also failed:', fallbackError);
      console.error('🎥 [youtubeHelpers] Error type:', fallbackError?.constructor?.name);
      console.error('🎥 [youtubeHelpers] Error message:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      if (fallbackError instanceof Error && fallbackError.stack) {
        console.error('🎥 [youtubeHelpers] Error stack:', fallbackError.stack);
      }
      console.log('🎥 [youtubeHelpers] 💡 Video may not have captions, captions disabled, or access restricted');
    return null;
    }
  }
}

/**
 * Get YouTube video metadata (title, thumbnail, description)
 */
export async function getYouTubeMetadata(videoId: string): Promise<{
  title?: string;
  thumbnail?: string;
  description?: string;
  descriptionLinks?: string[];
} | null> {
  try {
    console.log('📄 Fetching YouTube metadata for video:', videoId);
    
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    
    const title = info.basic_info.title;
    const description = info.basic_info.short_description || '';
    
    // Extract URLs from description
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const descriptionLinks = description.match(urlRegex) || [];
    
    console.log('📄 Video metadata:', {
      title,
      descriptionLength: description.length,
      linksFound: descriptionLinks.length,
      links: descriptionLinks.slice(0, 3), // First 3 links
    });
    
    return {
      title,
      description,
      descriptionLinks,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}


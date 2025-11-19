/**
 * YouTube Helper Utilities
 * 
 * Extract video IDs, captions, and metadata from YouTube URLs
 */

import { Innertube } from 'youtubei.js';

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
 * Transcript segment with timestamp information
 */
export interface TranscriptSegment {
  text: string;
  startMs: number; // milliseconds
  endMs: number; // milliseconds
}

/**
 * Transcript data with both text and timestamped segments
 */
export interface TranscriptData {
  text: string;
  segments: TranscriptSegment[];
}

/**
 * Fetch YouTube video captions/subtitles
 * Returns both full text and timestamped segments for section matching
 */
export async function getYouTubeCaptions(videoId: string): Promise<string | null>;
export async function getYouTubeCaptions(videoId: string, includeSegments: true): Promise<TranscriptData | null>;
export async function getYouTubeCaptions(videoId: string, includeSegments?: boolean): Promise<string | TranscriptData | null> {
  try {
    console.log(`🎥 Fetching captions for YouTube video: ${videoId}`);
    console.log(`   Full URL: https://www.youtube.com/watch?v=${videoId}`);
    
    // Initialize Innertube (YouTube's internal API)
    const youtube = await Innertube.create();
    
    // Get video info
    const info = await youtube.getInfo(videoId);
    
    console.log('📹 Video info retrieved:', {
      title: info.basic_info.title,
      hasCaptions: !!info.captions,
    });
    
    // Get transcript/captions
    const transcriptData = await info.getTranscript();
    
    console.log('📝 Transcript data:', {
      exists: !!transcriptData,
      hasContent: !!transcriptData?.transcript,
      segmentCount: transcriptData?.transcript?.content?.body?.initial_segments?.length,
    });
    
    if (!transcriptData || !transcriptData.transcript) {
      console.log('❌ No transcript available for video:', videoId);
      return null;
    }
    
    // Extract text from transcript segments
    const content = transcriptData.transcript.content;
    if (!content || !content.body) {
      console.log('❌ No transcript content available');
      return null;
    }
    
    const segments = content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.log('❌ No caption segments found');
      return null;
    }
    
    // Extract text and timestamps from segments
    const transcriptSegments: TranscriptSegment[] = [];
    const textParts: string[] = [];
    
    segments.forEach((segment: any) => {
      // Skip section headers (they don't have text)
      if (segment.type === 'TranscriptSectionHeader') {
        return;
      }
      
      // Extract text from segment
      let segmentText = '';
      if (segment.snippet?.text) {
        segmentText = typeof segment.snippet.text === 'string' 
          ? segment.snippet.text 
          : segment.snippet.text.toString?.() || String(segment.snippet.text);
      } else if (segment.text) {
        segmentText = typeof segment.text === 'string'
          ? segment.text
          : segment.text.toString?.() || String(segment.text);
      }
      
      if (!segmentText.trim()) {
        return; // Skip empty segments
      }
      
      // Extract timestamps (convert from string to number)
      const startMs = segment.start_ms ? parseInt(String(segment.start_ms), 10) : 0;
      const endMs = segment.end_ms ? parseInt(String(segment.end_ms), 10) : 0;
      
      // Only include segments with valid timestamps
      if (!isNaN(startMs) && startMs >= 0) {
        transcriptSegments.push({
          text: segmentText.trim(),
          startMs,
          endMs: !isNaN(endMs) && endMs >= startMs ? endMs : startMs,
        });
        textParts.push(segmentText);
      }
    });
    
    const fullTranscript = textParts.join(' ').trim();
    
    console.log(`✅ Extracted ${fullTranscript.length} characters of captions from YouTube video`);
    console.log(`   ${transcriptSegments.length} timestamped segments extracted`);
    console.log(`   Preview: ${fullTranscript.substring(0, 200)}...`);
    
    // Return segments if requested, otherwise just text (backward compatible)
    if (includeSegments) {
      return {
        text: fullTranscript,
        segments: transcriptSegments,
      };
    }
    
    return fullTranscript;
    
  } catch (error) {
    console.error('❌ Error fetching YouTube captions:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.log('💡 Video may not have captions, captions disabled, or access restricted');
    return null;
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


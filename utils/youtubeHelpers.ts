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
 * Fetch YouTube video captions/subtitles
 * Uses youtube-transcript library for reliable caption extraction
 */
export async function getYouTubeCaptions(videoId: string): Promise<string | null> {
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
    const segments = transcriptData.transcript.content.body.initial_segments;
    
    if (!segments || segments.length === 0) {
      console.log('❌ No caption segments found');
      return null;
    }
    
    // Log first segment structure to understand the format
    console.log('🔍 First segment structure:', JSON.stringify(segments[0], null, 2).substring(0, 500));
    
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
    
    console.log(`✅ Extracted ${fullTranscript.length} characters of captions from YouTube video`);
    console.log(`   ${segments.length} caption segments combined`);
    console.log(`   Preview: ${fullTranscript.substring(0, 200)}...`);
    
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
 * Get YouTube video metadata (title, thumbnail)
 */
export async function getYouTubeMetadata(videoId: string): Promise<{
  title?: string;
  thumbnail?: string;
  duration?: string;
} | null> {
  try {
    // Use YouTube oEmbed API (no API key required!)
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      title: data.title,
      thumbnail: data.thumbnail_url,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}


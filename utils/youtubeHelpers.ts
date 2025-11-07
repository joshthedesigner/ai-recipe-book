/**
 * YouTube Helper Utilities
 * 
 * Extract video IDs, captions, and metadata from YouTube URLs
 */

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
 * Fetch YouTube video captions/subtitles
 * Uses youtube-transcript library for reliable caption extraction
 */
export async function getYouTubeCaptions(videoId: string): Promise<string | null> {
  try {
    console.log(`🎥 Fetching captions for YouTube video: ${videoId}`);
    console.log(`   Full URL: https://www.youtube.com/watch?v=${videoId}`);
    
    // Fetch transcript using youtube-transcript library
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('📝 Transcript result:', {
      exists: !!transcript,
      isArray: Array.isArray(transcript),
      length: transcript?.length,
      firstSegment: transcript?.[0],
    });
    
    if (!transcript || transcript.length === 0) {
      console.log('❌ No captions found for video:', videoId);
      return null;
    }
    
    // Combine all transcript segments into full text
    const fullTranscript = transcript
      .map(segment => segment.text)
      .join(' ')
      .trim();
    
    console.log(`✅ Extracted ${fullTranscript.length} characters of captions from YouTube video`);
    console.log(`   ${transcript.length} caption segments combined`);
    console.log(`   Preview: ${fullTranscript.substring(0, 200)}...`);
    
    return fullTranscript;
    
  } catch (error) {
    console.error('❌ Error fetching YouTube captions:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.log('💡 Video may not have captions, captions disabled, or library issue');
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


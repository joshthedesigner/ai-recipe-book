/**
 * Video Recipe Extraction Utility
 * 
 * Extracts recipes from video URLs using captions/transcripts
 */

import OpenAI from 'openai';
import { getYouTubeCaptions, extractYouTubeId, isYouTubeUrl } from '@/utils/youtubeHelpers';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  incomplete?: boolean;
  reason?: string;
  video_url: string;
  video_platform: string;
}

async function extractRecipeFromTranscript(transcript: string): Promise<Omit<ExtractedRecipe, 'video_url' | 'video_platform'>> {
  const client = getOpenAIClient();
  
  const prompt = `You are an expert recipe extraction assistant. Extract a complete recipe from this video transcript.

Extract these fields:
- title: The recipe name
- ingredients: Array of ingredients WITH EXACT QUANTITIES
- steps: Array of detailed cooking instructions
- tags: Relevant tags (cuisine, meal type, protein, etc.)

CRITICAL RULES:
• Include ALL ingredient quantities mentioned (2 cups, 1/4 tsp, etc.)
• Preserve exact measurements and fractions
• Include specific times and temperatures in steps
• Be thorough - capture all details from the transcript
• Tags should be lowercase

If the transcript doesn't contain a recipe, set incomplete:true with a reason.

Return valid JSON only.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Extract the recipe from this video transcript:\n\n${transcript}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

export async function extractRecipeFromYouTubeVideo(videoUrl: string): Promise<ExtractedRecipe> {
  console.log('🎥 Processing YouTube video:', videoUrl);

  // Extract video ID
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  console.log('📺 YouTube video ID:', videoId);

  // Try to get captions (free!)
  const captions = await getYouTubeCaptions(videoId);
  
  if (!captions) {
    throw new Error('This video does not have captions available. Try a different video or manually enter the recipe.');
  }

  console.log(`✅ Got captions (${captions.length} characters), extracting recipe...`);

  // Extract recipe from captions
  const recipe = await extractRecipeFromTranscript(captions);

  if (recipe.incomplete) {
    throw new Error(recipe.reason || 'Could not find a recipe in this video');
  }

  // Add video metadata
  const recipeWithVideo: ExtractedRecipe = {
    ...recipe,
    video_url: videoUrl,
    video_platform: 'youtube',
  };

  console.log('✅ Recipe extracted from video:', recipeWithVideo.title);

  return recipeWithVideo;
}


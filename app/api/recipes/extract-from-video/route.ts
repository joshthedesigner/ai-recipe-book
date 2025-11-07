import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/db/supabaseServer';
import { extractYouTubeId, getYouTubeCaptions, isYouTubeUrl } from '@/utils/youtubeHelpers';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

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
}

async function extractRecipeFromTranscript(transcript: string): Promise<ExtractedRecipe> {
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

If the transcript doesn't contain a recipe, set incomplete:true.

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.recipeStore,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }

    console.log('🎥 Processing video:', videoUrl);

    // Only support YouTube for now
    if (!isYouTubeUrl(videoUrl)) {
      return NextResponse.json(
        { success: false, error: 'Currently only YouTube videos are supported' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    console.log('📺 YouTube video ID:', videoId);

    // Try to get captions (free!)
    const captions = await getYouTubeCaptions(videoId);
    
    if (!captions) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This video does not have captions available. Try a different video or manually enter the recipe.',
          needsCaptions: true,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Got captions (${captions.length} characters), extracting recipe...`);

    // Extract recipe from captions
    const recipe = await extractRecipeFromTranscript(captions);

    if (recipe.incomplete) {
      return NextResponse.json(
        {
          success: false,
          error: recipe.reason || 'Could not find a recipe in this video',
        },
        { status: 400 }
      );
    }

    // Add video metadata
    const recipeWithVideo = {
      ...recipe,
      video_url: videoUrl,
      video_platform: 'youtube',
      source_url: videoUrl,
    };

    console.log('✅ Recipe extracted from video:', recipeWithVideo.title);

    // Return response with rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return NextResponse.json({
      success: true,
      recipe: recipeWithVideo,
      transcript: captions, // Include for debugging
      method: 'captions', // Show it was free!
    }, {
      headers,
    });

  } catch (error) {
    console.error('Error processing video:', error);
    return errorResponse(error);
  }
}


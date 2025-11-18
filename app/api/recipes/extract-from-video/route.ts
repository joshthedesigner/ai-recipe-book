import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { extractRecipeFromYouTubeVideo } from '@/utils/videoExtractor';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

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

    // Use the video extractor utility (handles YouTube and sections)
    let videoRecipe;
    try {
      videoRecipe = await extractRecipeFromYouTubeVideo(videoUrl);
    } catch (videoError) {
      if (videoError instanceof Error && videoError.message === 'VIDEO_LINK_ONLY') {
        return NextResponse.json(
          {
            success: false,
            error: 'This video does not have captions available. Try a different video or manually enter the recipe.',
            needsCaptions: true,
          },
          { status: 400 }
        );
      }
      
      if (videoError instanceof Error && videoError.message.includes('Could not extract video ID')) {
        return NextResponse.json(
          { success: false, error: videoError.message },
          { status: 400 }
        );
      }
      
      throw videoError;
    }

    if (videoRecipe.incomplete) {
      return NextResponse.json(
        {
          success: false,
          error: videoRecipe.reason || 'Could not find a recipe in this video',
        },
        { status: 400 }
      );
    }

    console.log('✅ Recipe extracted from video:', videoRecipe.title);
    if (videoRecipe.sections && videoRecipe.sections.length > 0) {
      console.log(`✅ Recipe has ${videoRecipe.sections.length} sections:`, videoRecipe.sections.map(s => s.title));
    }

    // Prepare response with video metadata
    const recipeWithVideo = {
      title: videoRecipe.title,
      ingredients: videoRecipe.ingredients,
      steps: videoRecipe.steps,
      tags: videoRecipe.tags,
      sections: videoRecipe.sections, // Include sections if detected
      video_url: videoRecipe.video_url,
      video_platform: videoRecipe.video_platform,
      source_url: videoRecipe.video_url,
    };

    // Return response with rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return NextResponse.json({
      success: true,
      recipe: recipeWithVideo,
      method: 'captions', // Show it was free!
    }, {
      headers,
    });

  } catch (error) {
    console.error('Error processing video:', error);
    return errorResponse(error);
  }
}


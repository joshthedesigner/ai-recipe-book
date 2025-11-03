import { NextRequest, NextResponse } from 'next/server';
import { storeRecipe } from '@/agents/storeRecipe';
import { createClient } from '@/db/supabaseServer';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with server-side auth
    const supabase = createClient();

    // Verify authentication - recipe storage requires authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in to save recipes.' },
        { status: 401 }
      );
    }

    // Check rate limit (5 requests per minute per user - includes OpenAI and URL scraping)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.recipeStore,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const { message, reviewMode, cookbookName, cookbookPage, groupId } = await request.json();

    // Validate input
    const MAX_MESSAGE_LENGTH = 50000; // Allow longer text for recipes
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Recipe content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Use authenticated user ID from session, never trust client-provided userId
    const userId = user.id;

    // Validate groupId if provided
    if (groupId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(groupId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid groupId format' },
          { status: 400 }
        );
      }
    }

    // Call store recipe agent with groupId
    const result = await storeRecipe(message, userId, 'User', supabase, reviewMode, cookbookName, cookbookPage, groupId);

    // Create response headers with rate limit info
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        recipe: result.data,
      }, {
        headers,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message,
          message: result.message,
        },
        { 
          status: 400,
          headers,
        }
      );
    }
  } catch (error) {
    console.error('Error in store recipe route:', error);
    return errorResponse(error);
  }
}



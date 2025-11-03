/**
 * Chat API Route
 * 
 * POST /api/chat
 * 
 * Purpose: Main API endpoint for chat interactions
 * Receives user messages and returns AI responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/router';
import { ChatRequest, ChatAPIResponse } from '@/types';
import { createClient } from '@/db/supabaseServer';
import { saveConfirmedRecipe } from '@/agents/storeRecipe';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';
import { errorResponse } from '@/utils/errorHandler';

export async function POST(request: NextRequest) {
  try {
    // Create server-side Supabase client with user session
    const supabase = createClient();

    // Verify authentication - all chat operations require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in to continue.',
        } as ChatAPIResponse,
        { status: 401 }
      );
    }

    // Check rate limit (10 requests per minute per user)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.chat,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Parse the request body
    const body: ChatRequest = await request.json();
    const { message, confirmRecipe, conversationHistory, groupId } = body;

    // Use authenticated user ID from session, not from client
    const userId = user.id;

    // Validate input length to prevent resource exhaustion
    const MAX_MESSAGE_LENGTH = 10000;
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required',
        } as ChatAPIResponse,
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        } as ChatAPIResponse,
        { status: 400 }
      );
    }

    // Special handling: If user is confirming a recipe, save it directly
    if (confirmRecipe) {
      const result = await saveConfirmedRecipe(confirmRecipe, userId, supabase, groupId);
      return NextResponse.json(
        {
          success: result.success,
          response: {
            message: result.message,
            recipe: result.data,
            needsClarification: false,
          },
        } as ChatAPIResponse,
        { status: 200 }
      );
    }

    // Route the message through our system with conversation history
    const response = await routeMessage(message.trim(), userId, supabase, conversationHistory);

    // Return the response with rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return NextResponse.json(
      {
        success: true,
        response,
      } as ChatAPIResponse,
      { 
        status: 200,
        headers,
      }
    );

    } catch (error) {
      console.error('Chat API error:', error);
      return errorResponse(error);
    }
  }

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Chat API is running',
    },
    { status: 200 }
  );
}


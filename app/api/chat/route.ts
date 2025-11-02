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

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: ChatRequest = await request.json();
    const { message, userId, confirmRecipe } = body;

    // Create server-side Supabase client with user session
    const supabase = createClient();

    // Special handling: If user is confirming a recipe, save it directly
    if (confirmRecipe && userId) {
      const result = await saveConfirmedRecipe(confirmRecipe, userId, supabase);
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

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required',
        } as ChatAPIResponse,
        { status: 400 }
      );
    }

    // Route the message through our system
    const response = await routeMessage(message.trim(), userId, supabase);

    // Return the response
    return NextResponse.json(
      {
        success: true,
        response,
      } as ChatAPIResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        response: {
          message: 'Sorry, something went wrong. Please try again.',
          needsClarification: false,
        },
      } as ChatAPIResponse,
      { status: 500 }
    );
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


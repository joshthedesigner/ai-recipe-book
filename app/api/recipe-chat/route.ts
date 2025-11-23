/**
 * Recipe Chat API Route
 * 
 * POST /api/recipe-chat
 * 
 * Purpose: Chat endpoint specifically for recipe-related questions
 * Includes full recipe context in the conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { chatWithRecipeContext } from '@/agents/chatAgent';
import { RecipeChatRequest, RecipeChatAPIResponse, Recipe } from '@/types';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

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
        } as RecipeChatAPIResponse,
        { status: 401 }
      );
    }

    // Check rate limit (10 requests per minute per user)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.recipeChat,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Parse the request body
    const body: RecipeChatRequest = await request.json();
    const { message, recipeId, recipe: providedRecipe, conversationHistory } = body;

    // Use authenticated user ID from session, not from client
    const userId = user.id;

    // Validate input length
    const MAX_MESSAGE_LENGTH = 1000; // Prevent abuse
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required',
        } as RecipeChatAPIResponse,
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        } as RecipeChatAPIResponse,
        { status: 400 }
      );
    }

    // Validate recipeId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!recipeId || !uuidRegex.test(recipeId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid recipeId format',
        } as RecipeChatAPIResponse,
        { status: 400 }
      );
    }

    // Get recipe - use provided recipe if available, else fetch from database
    let recipe: Recipe | null = null;

    if (providedRecipe && providedRecipe.id === recipeId) {
      // Use provided recipe (preferred - avoids DB query)
      recipe = providedRecipe;
    } else {
      // Fetch recipe from database
      const { data: fetchedRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select('id, user_id, group_id, title, ingredients, steps, tags, sections, cookbook_name, cookbook_page, contributor_name')
        .eq('id', recipeId)
        .single();

      if (fetchError) {
        console.error('Error fetching recipe:', fetchError);
        if (fetchError.code === 'PGRST116') {
          return NextResponse.json(
            {
              success: false,
              error: 'Recipe not found',
            } as RecipeChatAPIResponse,
            { status: 404 }
          );
        }
        return errorResponse(fetchError);
      }

      if (!fetchedRecipe) {
        return NextResponse.json(
          {
            success: false,
            error: 'Recipe not found',
          } as RecipeChatAPIResponse,
          { status: 404 }
        );
      }

      recipe = fetchedRecipe as Recipe;
    }

    // Validate recipe access - user must own recipe OR have access to recipe's group
    const hasDirectAccess = recipe.user_id === userId;
    let hasGroupAccess = false;

    if (!hasDirectAccess && recipe.group_id) {
      // Check if user has access to the recipe's group
      // RLS policies will enforce this, but we check explicitly for better error messages
      const { data: groupMember, error: groupError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', recipe.group_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      hasGroupAccess = !groupError && !!groupMember;
    }

    if (!hasDirectAccess && !hasGroupAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have access to this recipe',
        } as RecipeChatAPIResponse,
        { status: 403 }
      );
    }

    // Limit conversation history to last 10 messages for token efficiency
    const limitedHistory = conversationHistory 
      ? conversationHistory.slice(-10)
      : undefined;

    // Call recipe chat agent with recipe context
    const response = await chatWithRecipeContext(
      message.trim(),
      recipe,
      limitedHistory
    );

    // Return the response with rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'Failed to get response from chat agent',
        } as RecipeChatAPIResponse,
        { 
          status: 500,
          headers,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: response.message,
      } as RecipeChatAPIResponse,
      { 
        status: 200,
        headers,
      }
    );

  } catch (error) {
    console.error('Recipe chat API error:', error);
    return errorResponse(error);
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Recipe chat API is running',
    },
    { status: 200 }
  );
}


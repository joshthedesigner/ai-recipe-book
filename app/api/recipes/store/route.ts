import { NextRequest, NextResponse } from 'next/server';
import { storeRecipe } from '@/agents/storeRecipe';
import { createClient } from '@/db/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, reviewMode, cookbookName, cookbookPage } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create Supabase client with server-side auth
    const supabase = createClient();

    // Call store recipe agent
    const result = await storeRecipe(message, userId, 'User', supabase, reviewMode, cookbookName, cookbookPage);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        recipe: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message,
          message: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in store recipe route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


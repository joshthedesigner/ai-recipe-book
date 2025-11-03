/**
 * Recipe API Route - Individual Recipe Operations
 * 
 * DELETE /api/recipes/[id] - Delete a specific recipe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { errorResponse } from '@/utils/errorHandler';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const recipeId = params.id;

    // Check authentication
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    
    if (!sessionData?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the recipe (RLS will ensure user can only delete their own recipes)
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      console.error('Error deleting recipe:', error);
      // Use centralized error handler (prevents information leakage)
      return errorResponse(error);
    }

    return NextResponse.json(
      { success: true, message: 'Recipe deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('API error deleting recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


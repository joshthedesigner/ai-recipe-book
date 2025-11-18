/**
 * Recipe API Route - Individual Recipe Operations
 * 
 * DELETE /api/recipes/[id] - Delete a specific recipe
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { errorResponse } from '@/utils/errorHandler';
import { isGroupOwner } from '@/utils/permissions';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recipeId = params.id;
  let userId: string | undefined;

  try {
    const supabase = createClient();

    // Step 1: Check authentication
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError) {
      console.error('[DELETE Recipe] Auth error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    if (!sessionData?.user) {
      console.warn('[DELETE Recipe] No user session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    userId = sessionData.user.id;
    console.log(`[DELETE Recipe] User ${userId} attempting to delete recipe ${recipeId}`);

    // Step 2: Fetch recipe to verify it exists and check permissions
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, user_id, group_id, title')
      .eq('id', recipeId)
      .single();

    if (fetchError) {
      console.error('[DELETE Recipe] Error fetching recipe:', fetchError);
      if (fetchError.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { success: false, error: 'Recipe not found' },
          { status: 404 }
        );
      }
      return errorResponse(fetchError);
    }

    if (!recipe) {
      console.warn(`[DELETE Recipe] Recipe ${recipeId} not found`);
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    console.log(`[DELETE Recipe] Recipe found: ${recipe.title}, user_id: ${recipe.user_id}, group_id: ${recipe.group_id}`);

    // Step 3: Check permission - user owns recipe OR is group owner
    const isOwner = recipe.user_id === userId;
    let isGroupOwnerUser = false;

    if (!isOwner && recipe.group_id) {
      try {
        isGroupOwnerUser = await isGroupOwner(supabase, userId, recipe.group_id);
        console.log(`[DELETE Recipe] User is group owner: ${isGroupOwnerUser}`);
      } catch (groupCheckError) {
        console.error('[DELETE Recipe] Error checking group ownership:', groupCheckError);
        // Continue - RLS will still enforce at database level
      }
    }

    if (!isOwner && !isGroupOwnerUser) {
      console.warn(`[DELETE Recipe] Permission denied: User ${userId} cannot delete recipe ${recipeId} (not owner, not group owner)`);
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this recipe' },
        { status: 403 }
      );
    }

    console.log(`[DELETE Recipe] Permission granted, proceeding with delete...`);

    // Step 4: Delete the recipe (RLS will still enforce as safety net)
    // Note: We don't use .select() here because it can conflict with RLS subqueries
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (deleteError) {
      console.error('[DELETE Recipe] Delete error:', deleteError);
      return errorResponse(deleteError);
    }

    // Step 5: Verify deletion succeeded by checking if recipe still exists
    const { data: verifyRecipe, error: verifyError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .maybeSingle();

    if (verifyError) {
      console.error('[DELETE Recipe] Verification error:', verifyError);
      // Recipe might be deleted but verification failed - assume success
      console.warn('[DELETE Recipe] Assuming delete succeeded despite verification error');
    } else if (verifyRecipe) {
      // Recipe still exists - RLS blocked the delete
      console.error(`[DELETE Recipe] Recipe ${recipeId} still exists after delete - RLS blocked`);
      return NextResponse.json(
        { success: false, error: 'Delete operation was blocked. You may not have permission to delete this recipe.' },
        { status: 403 }
      );
    }

    console.log(`[DELETE Recipe] Successfully deleted recipe ${recipeId}`);
    return NextResponse.json(
      { success: true, message: 'Recipe deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DELETE Recipe] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


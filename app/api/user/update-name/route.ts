import { createClient } from '@/db/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/update-name
 * 
 * Updates the user's display name.
 * Updates auth.user_metadata.name (single source of truth).
 * Also updates public.users.name for consistency.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    // Validate name
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Update user metadata in Supabase Auth (single source of truth)
    const { error: updateError } = await supabase.auth.updateUser({
      data: { name: name.trim() },
    });

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update name' }, { status: 500 });
    }

    // Also update in public.users table for consistency
    const { error: dbError } = await supabase
      .from('users')
      .update({ name: name.trim() })
      .eq('id', user.id);

    if (dbError) {
      console.error('Error updating users table:', dbError);
      // Not critical - metadata is source of truth
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-name route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


import { createClient } from '@/db/supabaseServer';
import { deleteUserAccount } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/utils/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/user/delete-account
 * 
 * Permanently deletes the user's account and all associated data.
 * 
 * Security:
 * - Requires authentication
 * - Rate limited (1 request per day per user)
 * - Password verification for email/password users
 * - Confirmation required for OAuth users
 * 
 * Data deleted:
 * - All recipes
 * - All chat history
 * - All group memberships
 * - All friendships
 * - User profile
 * - Auth account
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Step 1: Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Step 2: Rate limiting (prevent abuse)
    // Allow 1 deletion attempt per day per user
    const rateLimitResult = await checkRateLimit(
      request,
      { maxRequests: 1, windowMs: 24 * 60 * 60 * 1000 }, // 24 hours in milliseconds
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Step 3: Get request body
    const body = await request.json();
    const { password, confirmText } = body;

    // Step 4: Determine authentication method
    const isOAuthUser = user.app_metadata?.provider === 'google' || 
                        !user.identities?.some(i => i.provider === 'email');

    // Step 5: Verify deletion intent
    if (isOAuthUser) {
      // OAuth users: require typing "DELETE"
      if (confirmText !== 'DELETE') {
        return NextResponse.json(
          { success: false, error: 'Please type DELETE to confirm account deletion.' },
          { status: 400 }
        );
      }
    } else {
      // Email/password users: require password
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password is required to delete your account.' },
          { status: 400 }
        );
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (signInError) {
        return NextResponse.json(
          { success: false, error: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }
    }

    // Step 6: Delete the account
    console.log(`Deleting account for user: ${user.id} (${user.email})`);
    
    const result = await deleteUserAccount(user.id);

    if (!result.success) {
      console.error('Account deletion failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    // Step 7: Success - account deleted
    console.log(`Account successfully deleted: ${user.id} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted.',
    });
  } catch (error) {
    console.error('Error in delete-account route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}


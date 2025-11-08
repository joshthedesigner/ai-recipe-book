/**
 * Supabase Admin Client
 * 
 * ⚠️ WARNING: This file uses the SERVICE ROLE KEY which bypasses ALL RLS policies.
 * 
 * SECURITY REQUIREMENTS:
 * - NEVER import this in client-side code
 * - ONLY use in API routes (/app/api/**)
 * - NEVER log the service role key
 * - NEVER expose in error messages
 * 
 * The service role key grants full admin access to the database.
 * Treat it like root credentials.
 */

import { createClient } from '@supabase/supabase-js';

// Runtime check: Prevent usage in browser
if (typeof window !== 'undefined') {
  throw new Error(
    'supabaseAdmin cannot be used in browser. This file should only be imported in API routes.'
  );
}

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'Get this from: Supabase Dashboard → Settings → API → service_role key (secret)'
  );
}

// Ensure service role key is not accidentally the same as anon key
if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY should not be the same as NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'You may have copied the wrong key from Supabase dashboard.'
  );
}

/**
 * Admin client with full database access
 * Bypasses Row Level Security (RLS) policies
 * Use with extreme caution
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Delete a user account and all associated data
 * 
 * @param userId - The user ID to delete
 * @returns Success status
 * 
 * Deletion order:
 * 1. Delete from public.users (CASCADE deletes recipes, chat_history)
 * 2. Delete from auth.users (CASCADE deletes friends, groups, memberships)
 */
export async function deleteUserAccount(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Step 1: Delete from public.users first
    // This triggers CASCADE delete for:
    // - recipes (user_id references public.users)
    // - chat_history (user_id references public.users)
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (publicUserError) {
      console.error('Error deleting public user:', publicUserError);
      return {
        success: false,
        error: `Failed to delete user data: ${publicUserError.message}`,
      };
    }

    // Step 2: Delete from auth.users
    // This triggers CASCADE delete for:
    // - friends (user_a_id, user_b_id, requester_id reference auth.users)
    // - recipe_groups (owner_id references auth.users)
    // - group_members (user_id references auth.users)
    const { error: authUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authUserError) {
      console.error('Error deleting auth user:', authUserError);
      return {
        success: false,
        error: `Failed to delete authentication: ${authUserError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteUserAccount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}


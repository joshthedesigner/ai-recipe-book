import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-load Supabase client to ensure env vars are loaded first
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export a getter instead of the client directly
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return (client as any)[prop];
  }
});

// Test connection function
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('recipes').select('count').single();
    if (error) {
      console.log('Supabase connection test:', error.message);
      return false;
    }
    console.log('Supabase connected successfully!');
    return true;
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return false;
  }
}


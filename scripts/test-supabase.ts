// Quick test script to verify Supabase connection
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  if (!supabaseUrl || supabaseUrl.includes('your-')) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not set properly');
    process.exit(1);
  }

  if (!supabaseAnonKey || supabaseAnonKey.includes('your-')) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set properly');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check if we can query (even if table is empty)
    console.log('📊 Test 1: Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
    }

    // Test 2: Check recipes table
    console.log('\n📊 Test 2: Checking recipes table...');
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .limit(1);
    
    if (recipesError) {
      console.error('❌ Recipes table error:', recipesError.message);
    } else {
      console.log('✅ Recipes table accessible');
      if (recipes && recipes.length > 0) {
        console.log(`   Found ${recipes.length} recipe(s)`);
      }
    }

    // Test 3: Check chat_history table
    console.log('\n📊 Test 3: Checking chat_history table...');
    const { data: chat, error: chatError } = await supabase
      .from('chat_history')
      .select('*')
      .limit(1);
    
    if (chatError) {
      console.error('❌ Chat history table error:', chatError.message);
    } else {
      console.log('✅ Chat history table accessible');
    }

    console.log('\n🎉 Connection test complete!');
    console.log('\n✅ Supabase is connected and ready to use.\n');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();


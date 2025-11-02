/**
 * End-to-End Agent Test Script
 * 
 * Tests all 4 agents with real examples
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { routeMessage } from '@/router';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const testUserId = '00000000-0000-0000-0000-000000000001';

async function runTests() {
  console.log('🧪 Testing All Agents End-to-End\n');
  console.log('=' .repeat(80));
  
  // Test 1: Store Recipe
  console.log('\n📝 TEST 1: Store Recipe Agent');
  console.log('-'.repeat(80));
  await testStoreRecipe();
  
  // Test 2: Search Recipe
  console.log('\n\n🔍 TEST 2: Search Recipe Agent');
  console.log('-'.repeat(80));
  await testSearchRecipe();
  
  // Test 3: Generate Recipe
  console.log('\n\n🤖 TEST 3: Generate Recipe Agent');
  console.log('-'.repeat(80));
  await testGenerateRecipe();
  
  // Test 4: General Chat
  console.log('\n\n💬 TEST 4: Chat Agent');
  console.log('-'.repeat(80));
  await testChat();
  
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ All agent tests complete!');
  console.log('\nNote: Some tests may fail if database is empty or API rate limits are hit.');
}

async function testStoreRecipe() {
  const message = `Here's a simple recipe:

Title: Quick Garlic Pasta

Ingredients:
- 400g spaghetti
- 4 cloves garlic, minced
- 1/4 cup olive oil
- Red pepper flakes
- Parmesan cheese
- Fresh parsley

Steps:
1. Cook pasta according to package directions
2. Heat olive oil in a pan, add garlic
3. Drain pasta, add to garlic oil
4. Toss with pepper flakes, cheese, and parsley
5. Serve hot`;

  console.log('Message:', message.substring(0, 100) + '...');
  
  try {
    const result = await routeMessage(message, testUserId);
    console.log('\n📊 Result:');
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('\nResponse:');
    console.log(result.message.substring(0, 300) + '...');
    
    if (result.recipe) {
      console.log('\n✅ Recipe stored successfully!');
      console.log('Recipe ID:', result.recipe.id);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testSearchRecipe() {
  const message = 'Find pasta recipes';
  console.log('Message:', message);
  
  try {
    const result = await routeMessage(message, testUserId);
    console.log('\n📊 Result:');
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('\nResponse:');
    console.log(result.message.substring(0, 400));
    
    if (result.recipes) {
      console.log(`\n✅ Found ${result.recipes.length} recipe(s)`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testGenerateRecipe() {
  const message = 'Create a simple healthy smoothie recipe';
  console.log('Message:', message);
  
  try {
    const result = await routeMessage(message, testUserId);
    console.log('\n📊 Result:');
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('\nResponse (first 500 chars):');
    console.log(result.message.substring(0, 500) + '...');
    
    if (result.recipe) {
      console.log('\n✅ Recipe generated!');
      console.log('Title:', result.recipe.title);
      console.log('Ingredients:', result.recipe.ingredients.length);
      console.log('Steps:', result.recipe.steps.length);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testChat() {
  const message = 'What should I cook for dinner tonight?';
  console.log('Message:', message);
  
  try {
    const result = await routeMessage(message, testUserId);
    console.log('\n📊 Result:');
    console.log('Intent:', result.intent);
    console.log('Confidence:', result.confidence);
    console.log('\nResponse:');
    console.log(result.message);
    
    console.log('\n✅ Chat response received!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check for API keys
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
  console.error('❌ Error: OPENAI_API_KEY not set in .env.local');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-')) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local');
  process.exit(1);
}

runTests().catch(console.error);


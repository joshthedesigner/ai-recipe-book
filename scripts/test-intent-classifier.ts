/**
 * Test Script for Intent Classifier
 * 
 * Tests the intent classification with example messages from the System Summary
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { classifyIntent } from '@/agents/intentClassifier';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

// Test cases from System Summary Section 8️⃣
const testCases = [
  // store_recipe examples
  { message: "here's a link to my recipe", expected: "store_recipe" },
  { message: "Here's my grandma's lasagna recipe", expected: "store_recipe" },
  { message: "Save this recipe: Chicken pasta with cream sauce", expected: "store_recipe" },
  { message: "I want to add a recipe", expected: "store_recipe" },
  
  // search_recipe examples
  { message: "find biryani", expected: "search_recipe" },
  { message: "Show me pasta recipes", expected: "search_recipe" },
  { message: "What chicken dishes do I have?", expected: "search_recipe" },
  { message: "Do I have any desserts?", expected: "search_recipe" },
  
  // generate_recipe examples
  { message: "make biryani", expected: "generate_recipe" },
  { message: "Make a vegan shawarma", expected: "generate_recipe" },
  { message: "Create a chocolate cake recipe", expected: "generate_recipe" },
  { message: "Generate a pasta dish", expected: "generate_recipe" },
  
  // general_chat examples
  { message: "hi", expected: "general_chat" },
  { message: "What should I cook this week?", expected: "general_chat" },
  { message: "How do I cook rice?", expected: "general_chat" },
  { message: "Thanks!", expected: "general_chat" },
  
  // Edge cases
  { message: "biryani?", expected: "search_recipe" }, // Ambiguous - should ask for clarification
];

async function runTests() {
  console.log('🧪 Testing Intent Classifier\n');
  console.log('=' .repeat(80));
  
  let passed = 0;
  let failed = 0;
  let lowConfidence = 0;

  for (const testCase of testCases) {
    const { message, expected } = testCase;
    
    try {
      const result = await classifyIntent(message);
      const { intent, confidence } = result;
      
      const match = intent === expected;
      const confidentEnough = confidence >= 0.8;
      
      // Status emoji
      let status = '';
      if (match && confidentEnough) {
        status = '✅';
        passed++;
      } else if (match && !confidentEnough) {
        status = '⚠️ ';
        lowConfidence++;
      } else {
        status = '❌';
        failed++;
      }
      
      console.log(`${status} "${message}"`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Got: ${intent} (confidence: ${confidence.toFixed(2)})`);
      console.log();
      
    } catch (error) {
      console.error(`❌ Error testing "${message}":`, error);
      failed++;
    }
  }
  
  console.log('=' .repeat(80));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`⚠️  Low Confidence: ${lowConfidence}/${testCases.length}`);
  
  const passRate = (passed / testCases.length) * 100;
  console.log(`\n📈 Pass Rate: ${passRate.toFixed(1)}%`);
  
  if (passRate >= 90) {
    console.log('\n🎉 Excellent! Intent classifier is working well!');
  } else if (passRate >= 75) {
    console.log('\n👍 Good! Some improvements could be made.');
  } else {
    console.log('\n⚠️  Needs improvement. Consider adjusting prompts.');
  }
}

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
  console.error('❌ Error: OPENAI_API_KEY not set in .env.local');
  console.log('\nPlease add your OpenAI API key to .env.local:');
  console.log('OPENAI_API_KEY=sk-proj-...');
  process.exit(1);
}

runTests().catch(console.error);


/**
 * Photo Extraction Flow Pressure Test
 * 
 * Mirrors the exact flow that's breaking:
 * 1. Multiple photos uploaded → sequential API calls to /api/recipes/extract-from-image
 * 2. After extraction → /api/recipes/store with cookbook info
 * 3. Recipe confirmation → /api/chat with confirmRecipe
 * 
 * Usage: node test-photo-extraction-flow.js
 * 
 * Requirements:
 * 1. Log in to the app
 * 2. Get your session cookie from browser dev tools
 * 3. Set SESSION_COOKIE below
 * 4. Create a test image file (or use existing one)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const readline = require('readline');

const BASE_URL = 'http://localhost:3000';
let SESSION_COOKIE = process.env.SESSION_COOKIE || 'YOUR_SESSION_COOKIE_HERE'; // Can be set via env var
const TEST_IMAGE_PATH = './test-image.jpg'; // Path to a test image file

// Function to prompt for session cookie
function promptForCookie() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n📋 Session Cookie Required');
    console.log('='.repeat(70));
    console.log('To get your session cookie:');
    console.log('  1. Log in to http://localhost:3000');
    console.log('  2. Open Dev Tools (F12) → Application → Cookies');
    console.log('  3. Find cookie starting with "sb-" (Supabase auth token)');
    console.log('  4. Copy the full cookie value');
    console.log('\nOr set SESSION_COOKIE environment variable:');
    console.log('  export SESSION_COOKIE="sb-xxxxx-auth-token=eyJ..."');
    console.log('  node test-photo-extraction-flow.js\n');
    
    rl.question('Paste your session cookie here (or press Enter to skip): ', (answer) => {
      rl.close();
      if (answer.trim()) {
        SESSION_COOKIE = answer.trim();
      }
      resolve();
    });
  });
}

// Create a simple test image if it doesn't exist
function createTestImage() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.log('⚠️  No test image found. Creating a minimal test image...');
    // Create a 1x1 pixel PNG in memory
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(TEST_IMAGE_PATH, minimalPng);
    console.log('✅ Created test image');
  }
}

// Test scenario: Multiple photos in quick succession (like real user flow)
async function testMultiplePhotosFlow() {
  console.log('\n📸📸📸 Testing Multiple Photos Flow (Mirrors Real User Behavior)');
  console.log('='.repeat(70));
  console.log('This simulates: User uploads 6 photos at once');
  console.log('Expected: First 5 succeed, 6th hits rate limit (5/min)\n');
  
  const results = [];
  const numPhotos = 6; // Test with 6 photos (limit is 5/min)
  
  // Read test image
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    createTestImage();
  }
  const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
  
  console.log(`Uploading ${numPhotos} photos sequentially (like the frontend does)...\n`);
  
  for (let i = 1; i <= numPhotos; i++) {
    const start = Date.now();
    
    try {
      // Create FormData (like the frontend does)
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: `test-recipe-${i}.jpg`,
        contentType: 'image/jpeg',
      });
      formData.append('translate', 'false');
      
      // Make request using axios (like the frontend does)
      const response = await axios.post(
        `${BASE_URL}/api/recipes/extract-from-image`,
        formData,
        {
          headers: {
            'Cookie': SESSION_COOKIE,
            ...formData.getHeaders(),
          },
          validateStatus: () => true, // Don't throw on 429
        }
      );
      
      const elapsed = Date.now() - start;
      const data = response.data;
      
      const rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
        retryAfter: response.headers['retry-after'],
      };
      
      const result = {
        photo: i,
        status: response.status,
        success: data.success,
        rateLimited: response.status === 429,
        elapsed,
        rateLimitHeaders,
        error: data.error,
      };
      
      results.push(result);
      
      if (response.status === 429) {
        console.log(`   ❌ Photo ${i}: RATE LIMITED (${elapsed}ms)`);
        console.log(`      Error: ${data.error || 'Rate limit exceeded'}`);
        console.log(`      Remaining: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit}`);
        console.log(`      Retry After: ${rateLimitHeaders.retryAfter}s`);
      } else if (data.success) {
        console.log(`   ✅ Photo ${i}: Success (${elapsed}ms)`);
        console.log(`      Remaining: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit}`);
        console.log(`      Extracted text length: ${data.data?.raw_text?.length || 0} chars`);
      } else {
        console.log(`   ⚠️  Photo ${i}: Failed (${elapsed}ms)`);
        console.log(`      Error: ${data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Photo ${i}: ERROR - ${error.message}`);
      results.push({
        photo: i,
        status: 0,
        success: false,
        rateLimited: false,
        error: error.message,
      });
    }
    
    // Small delay between requests (like real user flow might have)
    if (i < numPhotos) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Test scenario: Full flow - multiple recipes from photos
async function testFullPhotoRecipeFlow() {
  console.log('\n🔄 Testing Full Photo Recipe Flow');
  console.log('='.repeat(70));
  console.log('This simulates: User adds 4 recipes from photos');
  console.log('Flow: Photo extraction → Store recipe → Confirm recipe\n');
  
  const results = [];
  const numRecipes = 4;
  
  // Read test image
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    createTestImage();
  }
  const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
  
  for (let recipeNum = 1; recipeNum <= numRecipes; recipeNum++) {
    console.log(`\n   Recipe ${recipeNum}:`);
    const recipeResult = {
      recipe: recipeNum,
      steps: {},
      success: false,
      rateLimited: false,
    };
    
    try {
      // Step 1: Photo extraction
      console.log(`   📸 Step 1: Photo Extraction (5/min limit)`);
      const formData = new FormData();
      
      formData.append('image', imageBuffer, {
        filename: `recipe-${recipeNum}.jpg`,
        contentType: 'image/jpeg',
      });
      formData.append('translate', 'false');
      
      const extractResponse = await axios.post(
        `${BASE_URL}/api/recipes/extract-from-image`,
        formData,
        {
          headers: {
            'Cookie': SESSION_COOKIE,
            ...formData.getHeaders(),
          },
          validateStatus: () => true,
        }
      );
      
      const extractData = extractResponse.data;
      const extractHeaders = {
        limit: extractResponse.headers['x-ratelimit-limit'],
        remaining: extractResponse.headers['x-ratelimit-remaining'],
      };
      
      recipeResult.steps.extraction = {
        status: extractResponse.status,
        success: extractData.success,
        rateLimited: extractResponse.status === 429,
        remaining: extractHeaders.remaining,
        limit: extractHeaders.limit,
      };
      
      if (extractResponse.status === 429) {
        console.log(`      ❌ RATE LIMITED - Remaining: ${extractHeaders.remaining}/${extractHeaders.limit}`);
        recipeResult.rateLimited = true;
        results.push(recipeResult);
        continue;
      } else if (!extractData.success) {
        console.log(`      ⚠️  Failed: ${extractData.error}`);
        results.push(recipeResult);
        continue;
      } else {
        console.log(`      ✅ Success - Remaining: ${extractHeaders.remaining}/${extractHeaders.limit}`);
      }
      
      // Step 2: Store recipe (with cookbook info)
      console.log(`   💾 Step 2: Store Recipe (5/min limit)`);
      const extractedText = extractData.data?.raw_text || 'Test recipe text';
      
      const storeResponse = await axios.post(
        `${BASE_URL}/api/recipes/store`,
        {
          message: extractedText,
          reviewMode: true,
          cookbookName: `Test Cookbook ${recipeNum}`,
          cookbookPage: recipeNum.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': SESSION_COOKIE,
          },
          validateStatus: () => true,
        }
      );
      
      const storeData = storeResponse.data;
      const storeHeaders = {
        limit: storeResponse.headers['x-ratelimit-limit'],
        remaining: storeResponse.headers['x-ratelimit-remaining'],
      };
      
      recipeResult.steps.store = {
        status: storeResponse.status,
        success: storeData.success,
        rateLimited: storeResponse.status === 429,
        remaining: storeHeaders.remaining,
        limit: storeHeaders.limit,
      };
      
      if (storeResponse.status === 429) {
        console.log(`      ❌ RATE LIMITED - Remaining: ${storeHeaders.remaining}/${storeHeaders.limit}`);
        recipeResult.rateLimited = true;
        results.push(recipeResult);
        continue;
      } else if (!storeData.success) {
        console.log(`      ⚠️  Failed: ${storeData.error}`);
        results.push(recipeResult);
        continue;
      } else {
        console.log(`      ✅ Success - Remaining: ${storeHeaders.remaining}/${storeHeaders.limit}`);
      }
      
      // Step 3: Confirm recipe
      console.log(`   ✅ Step 3: Confirm Recipe (30/min limit)`);
      const confirmRecipe = storeData.recipe || {
        title: `Test Recipe ${recipeNum}`,
        ingredients: ['1 cup flour', '2 eggs'],
        steps: ['Mix', 'Bake'],
        tags: ['test'],
      };
      
      const confirmResponse = await axios.post(
        `${BASE_URL}/api/chat`,
        {
          confirmRecipe: confirmRecipe,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': SESSION_COOKIE,
          },
          validateStatus: () => true,
        }
      );
      
      const confirmData = confirmResponse.data;
      const confirmHeaders = {
        limit: confirmResponse.headers['x-ratelimit-limit'],
        remaining: confirmResponse.headers['x-ratelimit-remaining'],
      };
      
      recipeResult.steps.confirmation = {
        status: confirmResponse.status,
        success: confirmData.success,
        rateLimited: confirmResponse.status === 429,
        remaining: confirmHeaders.remaining,
        limit: confirmHeaders.limit,
      };
      
      if (confirmResponse.status === 429) {
        console.log(`      ❌ RATE LIMITED - Remaining: ${confirmHeaders.remaining}/${confirmHeaders.limit}`);
        recipeResult.rateLimited = true;
      } else if (confirmData.success) {
        console.log(`      ✅ Success - Remaining: ${confirmHeaders.remaining}/${confirmHeaders.limit}`);
        recipeResult.success = true;
      } else {
        console.log(`      ⚠️  Failed: ${confirmData.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      recipeResult.error = error.message;
    }
    
    results.push(recipeResult);
    
    // Small delay between recipes
    if (recipeNum < numRecipes) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// Main test runner
async function runTests() {
  // Prompt for cookie if not set
  if (SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE') {
    await promptForCookie();
    
    if (SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE' || !SESSION_COOKIE.trim()) {
      console.log('\n⚠️  No session cookie provided. Exiting.');
      console.log('   You can also set it via environment variable:');
      console.log('   SESSION_COOKIE="your-cookie" node test-photo-extraction-flow.js');
      return;
    }
  }
  console.log('🧪 Photo Extraction Flow Pressure Test');
  console.log('='.repeat(70));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Session Cookie: ${SESSION_COOKIE && SESSION_COOKIE !== 'YOUR_SESSION_COOKIE_HERE' ? 'SET ✅' : 'NOT SET ⚠️'}`);
  
  // Check if form-data is available
  try {
    require('form-data');
  } catch (error) {
    console.log('\n⚠️  Missing dependency: form-data');
    console.log('   Install it with: npm install form-data');
    return;
  }
  
  const allResults = {};
  
  try {
    // Test 1: Multiple photos (the breaking scenario)
    allResults.multiplePhotos = await testMultiplePhotosFlow();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Full flow
    allResults.fullFlow = await testFullPhotoRecipeFlow();
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
  
  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('='.repeat(70));
  
  // Multiple photos summary
  const photoRateLimits = allResults.multiplePhotos?.filter(r => r.rateLimited).length || 0;
  const photoSuccesses = allResults.multiplePhotos?.filter(r => r.success).length || 0;
  console.log(`\nMultiple Photos Test:`);
  console.log(`  - Successful: ${photoSuccesses}`);
  console.log(`  - Rate Limited: ${photoRateLimits}`);
  if (photoRateLimits > 0) {
    console.log(`  ⚠️  BOTTLENECK CONFIRMED: Photo extraction rate limit (5/min) is too low`);
  }
  
  // Full flow summary
  const flowRateLimits = allResults.fullFlow?.filter(r => r.rateLimited).length || 0;
  const flowSuccesses = allResults.fullFlow?.filter(r => r.success).length || 0;
  console.log(`\nFull Flow Test:`);
  console.log(`  - Successful recipes: ${flowSuccesses}`);
  console.log(`  - Rate Limited: ${flowRateLimits}`);
  
  // Identify which step is the bottleneck
  const extractionLimits = allResults.fullFlow?.filter(r => r.steps?.extraction?.rateLimited).length || 0;
  const storeLimits = allResults.fullFlow?.filter(r => r.steps?.store?.rateLimited).length || 0;
  const confirmLimits = allResults.fullFlow?.filter(r => r.steps?.confirmation?.rateLimited).length || 0;
  
  console.log(`\nBottleneck Analysis:`);
  console.log(`  - Photo Extraction (5/min): ${extractionLimits} rate limits`);
  console.log(`  - Recipe Storage (5/min): ${storeLimits} rate limits`);
  console.log(`  - Recipe Confirmation (30/min): ${confirmLimits} rate limits`);
  
  if (extractionLimits > 0) {
    console.log(`\n  🔴 PRIMARY BOTTLENECK: Photo extraction (5/min limit)`);
  } else if (storeLimits > 0) {
    console.log(`\n  🔴 PRIMARY BOTTLENECK: Recipe storage (5/min limit)`);
  } else {
    console.log(`\n  ✅ No rate limits hit in full flow`);
  }
  
  console.log('\n✅ Tests completed');
}

// Run tests
runTests().catch(console.error);


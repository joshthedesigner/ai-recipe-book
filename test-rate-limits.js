/**
 * Rate Limit Pressure Test
 * 
 * Simulates the full photo recipe flow to identify rate limiting bottlenecks
 * 
 * Usage: node test-rate-limits.js
 * 
 * Note: This requires a valid session cookie. You'll need to:
 * 1. Log in to the app
 * 2. Get your session cookie from browser dev tools
 * 3. Set it in the SESSION_COOKIE variable below
 */

const BASE_URL = 'http://localhost:3000';
const SESSION_COOKIE = 'YOUR_SESSION_COOKIE_HERE'; // Replace with actual cookie

// Test scenarios
const scenarios = {
  // Scenario 1: Single photo recipe flow
  singlePhoto: async () => {
    console.log('\n📸 Scenario 1: Single Photo Recipe Flow');
    console.log('='.repeat(60));
    
    const results = {
      imageExtract: [],
      chatExtraction: [],
      chatConfirmation: [],
    };
    
    try {
      // Step 1: Extract from image (simulate - would need actual image file)
      console.log('\n1. Image Extraction (5/min limit)');
      console.log('   Note: Skipping actual image upload (requires file)');
      console.log('   Would call: POST /api/recipes/extract-from-image');
      console.log('   Rate Limit: 5 requests/minute');
      
      // Step 2: Chat for recipe extraction
      console.log('\n2. Recipe Extraction via Chat (10/min limit)');
      const extractionMessage = {
        message: 'Joy of Cooking, Page 245',
        conversationHistory: [],
      };
      
      for (let i = 1; i <= 12; i++) {
        const start = Date.now();
        try {
          const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': SESSION_COOKIE,
            },
            body: JSON.stringify(extractionMessage),
          });
          
          const data = await response.json();
          const elapsed = Date.now() - start;
          const rateLimitHeaders = {
            limit: response.headers.get('X-RateLimit-Limit'),
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset'),
          };
          
          results.chatExtraction.push({
            request: i,
            status: response.status,
            success: data.success,
            rateLimited: response.status === 429,
            elapsed,
            rateLimitHeaders,
          });
          
          if (response.status === 429) {
            console.log(`   ❌ Request ${i}: RATE LIMITED (${elapsed}ms)`);
            console.log(`      Remaining: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit}`);
          } else {
            console.log(`   ✅ Request ${i}: ${response.status} (${elapsed}ms) - Remaining: ${rateLimitHeaders.remaining}`);
          }
        } catch (error) {
          console.log(`   ❌ Request ${i}: ERROR - ${error.message}`);
        }
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Step 3: Recipe confirmation
      console.log('\n3. Recipe Confirmation (30/min limit)');
      const confirmRecipe = {
        confirmRecipe: {
          title: 'Test Recipe',
          ingredients: ['1 cup flour', '2 eggs'],
          steps: ['Mix ingredients', 'Bake at 350F'],
          tags: ['test'],
        },
      };
      
      for (let i = 1; i <= 32; i++) {
        const start = Date.now();
        try {
          const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': SESSION_COOKIE,
            },
            body: JSON.stringify(confirmRecipe),
          });
          
          const data = await response.json();
          const elapsed = Date.now() - start;
          const rateLimitHeaders = {
            limit: response.headers.get('X-RateLimit-Limit'),
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset'),
          };
          
          results.chatConfirmation.push({
            request: i,
            status: response.status,
            success: data.success,
            rateLimited: response.status === 429,
            elapsed,
            rateLimitHeaders,
          });
          
          if (response.status === 429) {
            console.log(`   ❌ Request ${i}: RATE LIMITED (${elapsed}ms)`);
            console.log(`      Remaining: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit}`);
          } else {
            console.log(`   ✅ Request ${i}: ${response.status} (${elapsed}ms) - Remaining: ${rateLimitHeaders.remaining}`);
          }
        } catch (error) {
          console.log(`   ❌ Request ${i}: ERROR - ${error.message}`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      console.error('Error in scenario:', error);
    }
    
    return results;
  },
  
  // Scenario 2: Multiple photos quickly
  multiplePhotos: async () => {
    console.log('\n📸📸📸 Scenario 2: Multiple Photos Quickly (5/min limit)');
    console.log('='.repeat(60));
    
    const results = [];
    
    // Simulate 7 image extraction requests (limit is 5/min)
    for (let i = 1; i <= 7; i++) {
      const start = Date.now();
      try {
        // Note: This would fail without actual image, but we can test rate limiting
        const response = await fetch(`${BASE_URL}/api/recipes/extract-from-image`, {
          method: 'POST',
          headers: {
            'Cookie': SESSION_COOKIE,
          },
          // Would need FormData with image file
        });
        
        const elapsed = Date.now() - start;
        const rateLimitHeaders = {
          limit: response.headers.get('X-RateLimit-Limit'),
          remaining: response.headers.get('X-RateLimit-Remaining'),
          reset: response.headers.get('X-RateLimit-Reset'),
        };
        
        results.push({
          request: i,
          status: response.status,
          rateLimited: response.status === 429,
          elapsed,
          rateLimitHeaders,
        });
        
        if (response.status === 429) {
          console.log(`   ❌ Request ${i}: RATE LIMITED (${elapsed}ms)`);
          console.log(`      Remaining: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit}`);
        } else {
          console.log(`   ✅ Request ${i}: ${response.status} (${elapsed}ms) - Remaining: ${rateLimitHeaders.remaining}`);
        }
      } catch (error) {
        console.log(`   ❌ Request ${i}: ERROR - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  },
  
  // Scenario 3: Full flow - multiple recipes
  multipleRecipes: async () => {
    console.log('\n🔄 Scenario 3: Multiple Recipes in Quick Succession');
    console.log('='.repeat(60));
    
    const results = [];
    
    // Simulate adding 4 recipes quickly
    for (let recipeNum = 1; recipeNum <= 4; recipeNum++) {
      console.log(`\n   Recipe ${recipeNum}:`);
      
      // Step 1: Image extraction (would be 1 request per photo)
      console.log(`   - Image extraction (5/min limit)`);
      
      // Step 2: Chat extraction
      console.log(`   - Chat extraction (10/min limit)`);
      const extractionResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': SESSION_COOKIE,
        },
        body: JSON.stringify({
          message: `Recipe ${recipeNum} from cookbook`,
          conversationHistory: [],
        }),
      });
      
      const extractionData = await extractionResponse.json();
      const extractionHeaders = {
        limit: extractionResponse.headers.get('X-RateLimit-Limit'),
        remaining: extractionResponse.headers.get('X-RateLimit-Remaining'),
      };
      
      console.log(`     Status: ${extractionResponse.status}, Remaining: ${extractionHeaders.remaining}/${extractionHeaders.limit}`);
      
      if (extractionResponse.status === 429) {
        results.push({
          recipe: recipeNum,
          step: 'extraction',
          rateLimited: true,
          limit: extractionHeaders.limit,
          remaining: extractionHeaders.remaining,
        });
        console.log(`     ❌ RATE LIMITED at extraction step`);
        continue;
      }
      
      // Step 3: Confirmation
      console.log(`   - Confirmation (30/min limit)`);
      const confirmResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': SESSION_COOKIE,
        },
        body: JSON.stringify({
          confirmRecipe: {
            title: `Test Recipe ${recipeNum}`,
            ingredients: ['1 cup flour', '2 eggs'],
            steps: ['Mix', 'Bake'],
            tags: ['test'],
          },
        }),
      });
      
      const confirmData = await confirmResponse.json();
      const confirmHeaders = {
        limit: confirmResponse.headers.get('X-RateLimit-Limit'),
        remaining: confirmResponse.headers.get('X-RateLimit-Remaining'),
      };
      
      console.log(`     Status: ${confirmResponse.status}, Remaining: ${confirmHeaders.remaining}/${confirmHeaders.limit}`);
      
      if (confirmResponse.status === 429) {
        results.push({
          recipe: recipeNum,
          step: 'confirmation',
          rateLimited: true,
          limit: confirmHeaders.limit,
          remaining: confirmHeaders.remaining,
        });
        console.log(`     ❌ RATE LIMITED at confirmation step`);
      } else {
        results.push({
          recipe: recipeNum,
          step: 'complete',
          rateLimited: false,
        });
        console.log(`     ✅ Recipe ${recipeNum} completed`);
      }
      
      // Small delay between recipes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  },
};

// Main test runner
async function runTests() {
  console.log('🧪 Rate Limit Pressure Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Session Cookie: ${SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE' ? 'NOT SET - Please set SESSION_COOKIE variable' : 'SET'}`);
  
  if (SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE') {
    console.log('\n⚠️  WARNING: Session cookie not set. Tests will fail.');
    console.log('   To get your session cookie:');
    console.log('   1. Log in to the app');
    console.log('   2. Open browser dev tools (F12)');
    console.log('   3. Go to Application/Storage > Cookies');
    console.log('   4. Copy the session cookie value');
    console.log('   5. Update SESSION_COOKIE in this file');
    return;
  }
  
  const allResults = {};
  
  // Run scenarios
  try {
    allResults.singlePhoto = await scenarios.singlePhoto();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between scenarios
    
    allResults.multiplePhotos = await scenarios.multiplePhotos();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    allResults.multipleRecipes = await scenarios.multipleRecipes();
  } catch (error) {
    console.error('Test error:', error);
  }
  
  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('='.repeat(60));
  
  // Count rate limits
  const rateLimitCounts = {
    chatExtraction: allResults.singlePhoto?.chatExtraction?.filter(r => r.rateLimited).length || 0,
    chatConfirmation: allResults.singlePhoto?.chatConfirmation?.filter(r => r.rateLimited).length || 0,
    multipleRecipes: allResults.multipleRecipes?.filter(r => r.rateLimited).length || 0,
  };
  
  console.log('\nRate Limits Hit:');
  console.log(`  - Chat Extraction: ${rateLimitCounts.chatExtraction}`);
  console.log(`  - Chat Confirmation: ${rateLimitCounts.chatConfirmation}`);
  console.log(`  - Multiple Recipes Flow: ${rateLimitCounts.multipleRecipes}`);
  
  console.log('\n✅ Tests completed');
}

// Run tests
runTests().catch(console.error);


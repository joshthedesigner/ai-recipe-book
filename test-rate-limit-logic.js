/**
 * Rate Limit Logic Test (No Auth Required)
 * 
 * Tests the rate limiting logic directly without needing authentication
 * This helps identify rate limit issues without requiring a session cookie
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test rate limiting by making requests that will fail auth but still hit rate limit
async function testRateLimitLogic() {
  console.log('🧪 Testing Rate Limit Logic (No Auth Required)');
  console.log('='.repeat(70));
  console.log('This test makes requests without auth to test rate limit tracking');
  console.log('Requests will fail auth (401) but rate limits should still apply\n');
  
  const results = [];
  
  // Test 1: Image extraction endpoint (5/min limit)
  console.log('📸 Test 1: Image Extraction Rate Limit (5/min)');
  console.log('Making 7 requests (limit is 5/min)...\n');
  
  for (let i = 1; i <= 7; i++) {
    const start = Date.now();
    
    try {
      // Create minimal FormData (will fail auth but hit rate limit)
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', Buffer.from('fake-image-data'), {
        filename: `test-${i}.jpg`,
        contentType: 'image/jpeg',
      });
      
      const response = await axios.post(
        `${BASE_URL}/api/recipes/extract-from-image`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          validateStatus: () => true, // Don't throw on any status
          timeout: 5000, // 5 second timeout
        }
      );
      
      const elapsed = Date.now() - start;
      const rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
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
      } else if (response.status === 401) {
        console.log(`   ⚠️  Request ${i}: Auth failed (expected) - ${elapsed}ms`);
        console.log(`      Rate limit: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit || 'N/A'}`);
      } else {
        console.log(`   ✅ Request ${i}: ${response.status} - ${elapsed}ms`);
        console.log(`      Rate limit: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request ${i}: ERROR - ${error.message}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 Summary:');
  const rateLimited = results.filter(r => r.rateLimited).length;
  const authFailed = results.filter(r => r.status === 401).length;
  
  console.log(`  - Total requests: ${results.length}`);
  console.log(`  - Rate limited (429): ${rateLimited}`);
  console.log(`  - Auth failed (401): ${authFailed}`);
  
  if (rateLimited > 0) {
    console.log(`\n  ✅ Rate limiting is working! ${rateLimited} requests were rate limited.`);
  } else {
    console.log(`\n  ⚠️  No rate limits hit. This could mean:`);
    console.log(`     - Rate limits are per-user (need auth to test)`);
    console.log(`     - Rate limits reset between requests`);
    console.log(`     - Rate limit window is longer than test duration`);
  }
  
  console.log('\n💡 Note: For full testing with authentication, use test-photo-extraction-flow.js');
  console.log('   with a valid session cookie.\n');
}

// Run test
testRateLimitLogic().catch(console.error);


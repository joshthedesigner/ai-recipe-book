/**
 * Rate Limit Bug Detection
 * 
 * Tests if rate limits are being shared incorrectly between endpoints
 */

console.log('🔍 Testing Rate Limit Key Generation\n');
console.log('='.repeat(70));

// Simulate the rate limit key generation
function simulateRateLimitKey(identifier, options) {
  // This is what the code does (line 145 in rateLimit.ts)
  const key = `${identifier}:${options.windowMs}`;
  return key;
}

// Test scenarios
const userId = 'user:test-user-123';
const imageExtractOptions = { windowMs: 60000, maxRequests: 5 };
const recipeStoreOptions = { windowMs: 60000, maxRequests: 5 };
const chatOptions = { windowMs: 60000, maxRequests: 10 };

console.log('Rate Limit Keys Generated:\n');

const imageKey = simulateRateLimitKey(userId, imageExtractOptions);
const storeKey = simulateRateLimitKey(userId, recipeStoreOptions);
const chatKey = simulateRateLimitKey(userId, chatOptions);

console.log(`Image Extraction: ${imageKey}`);
console.log(`Recipe Storage:   ${storeKey}`);
console.log(`Chat:             ${chatKey}`);
console.log('');

// Check if keys collide
if (imageKey === storeKey) {
  console.log('❌ BUG FOUND: Image extraction and Recipe storage share the SAME rate limit key!');
  console.log('   This means they count against the same limit bucket.');
  console.log('   If you make 3 image requests and 3 store requests, you\'ve used 6/5 limit!\n');
} else {
  console.log('✅ Keys are different');
}

if (imageKey === chatKey) {
  console.log('❌ BUG FOUND: Image extraction and Chat share the SAME rate limit key!');
} else {
  console.log('✅ Image and Chat have different keys (different maxRequests)');
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 The Problem:');
console.log('   Rate limit keys only include: identifier + windowMs');
console.log('   They do NOT include: maxRequests or endpoint name');
console.log('   This means endpoints with the same window size share limits!\n');

console.log('🔧 The Fix:');
console.log('   Include maxRequests in the key:');
console.log('   const key = `${identifier}:${options.windowMs}:${options.maxRequests}`;\n');

console.log('📊 Impact:');
console.log('   - Image extraction (5/min) and Recipe storage (5/min) share the same bucket');
console.log('   - If you add 3 recipes, you\'ve used 3/5 of the image extraction limit');
console.log('   - If you then try to add a photo, you might hit the limit!\n');


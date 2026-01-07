/**
 * Test: Why does ONE photo hit rate limit?
 * 
 * Scenarios to check:
 * 1. Previous requests in same minute window
 * 2. Rate limit not resetting properly
 * 3. Multiple API calls for one photo
 */

console.log('🔍 Testing: Why ONE photo hits rate limit?\n');
console.log('='.repeat(70));

// Simulate the rate limit logic
const rateLimitStore = new Map();

function simulateRequest(userId, windowMs, maxRequests) {
  const key = `${userId}:${windowMs}:${maxRequests}`; // With the fix
  const now = Date.now();
  const resetTime = now + windowMs;
  
  let entry = rateLimitStore.get(key);
  
  // If entry doesn't exist or has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > maxRequests) {
    rateLimitStore.set(key, entry);
    return {
      success: false,
      count: entry.count,
      limit: maxRequests,
      resetTime: entry.resetTime,
      timeUntilReset: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  // Within limit
  rateLimitStore.set(key, entry);
  return {
    success: true,
    count: entry.count,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
  };
}

// Scenario 1: User adds ONE photo (fresh start)
console.log('Scenario 1: User adds ONE photo (no previous requests)');
console.log('─'.repeat(70));
rateLimitStore.clear();
const result1 = simulateRequest('user:123', 60000, 5);
console.log(`  Request 1: ${result1.success ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Count: ${result1.count}/${result1.limit}`);
console.log(`  Remaining: ${result1.remaining || 0}`);
console.log('');

// Scenario 2: User added recipes earlier (within same minute)
console.log('Scenario 2: User added 5 recipes earlier (same minute window)');
console.log('─'.repeat(70));
rateLimitStore.clear();

// Add 5 recipe storage requests (5/min limit, 60000ms window)
console.log('  Adding 5 recipe storage requests...');
for (let i = 1; i <= 5; i++) {
  const result = simulateRequest('user:123', 60000, 5);
  console.log(`    Recipe ${i}: ${result.success ? '✅' : '❌'} (count: ${result.count}/5)`);
}

// Now try to add ONE photo
console.log('\n  Now trying to add ONE photo...');
const photoResult = simulateRequest('user:123', 60000, 5);
console.log(`  Photo request: ${photoResult.success ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Count: ${photoResult.count}/${photoResult.limit}`);

if (!photoResult.success) {
  console.log(`\n  ❌ BUG: Photo failed because count is ${photoResult.count}`);
  console.log(`  This is the OLD bug (before fix) - recipe storage and photo extraction share the same bucket`);
} else {
  console.log(`\n  ✅ With the fix: Photo has separate bucket, so it passes`);
}
console.log('');

// Scenario 3: User added recipes earlier, but with the fix
console.log('Scenario 3: With the fix (separate buckets)');
console.log('─'.repeat(70));
rateLimitStore.clear();

// Add 5 recipe storage requests (separate bucket: 60000:5)
console.log('  Adding 5 recipe storage requests (bucket: 60000:5)...');
for (let i = 1; i <= 5; i++) {
  const result = simulateRequest('user:123', 60000, 5); // Recipe storage
  console.log(`    Recipe ${i}: ${result.success ? '✅' : '❌'} (count: ${result.count}/5)`);
}

// Now try to add ONE photo (separate bucket: 60000:5 but different... wait, same!)
console.log('\n  Now trying to add ONE photo (bucket: 60000:5)...');
const photoResult2 = simulateRequest('user:123', 60000, 5);
console.log(`  Photo request: ${photoResult2.success ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  Count: ${photoResult2.count}/${photoResult2.limit}`);

if (!photoResult2.success) {
  console.log(`\n  ❌ STILL A BUG: Even with maxRequests in key, they share bucket!`);
  console.log(`  Both have: windowMs=60000, maxRequests=5`);
  console.log(`  Key: user:123:60000:5 (SAME for both!)`);
  console.log(`\n  💡 Need to include endpoint name in key!`);
} else {
  console.log(`\n  ✅ Photo passes because... wait, they still share the same key!`);
  console.log(`  This shouldn't work unless the buckets are actually separate`);
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 The Real Issue:');
console.log('   Even with maxRequests in the key, image extraction and recipe storage');
console.log('   have the SAME windowMs (60000) and SAME maxRequests (5)');
console.log('   So they STILL share the same bucket: user:xxx:60000:5');
console.log('\n🔧 Better Fix:');
console.log('   Include endpoint identifier in the key, OR');
console.log('   Use different rate limit configs (different maxRequests)');


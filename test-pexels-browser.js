/**
 * Browser-based Pexels Image Search Test
 * 
 * Run this in your browser console while logged into your app
 * Tests the actual API endpoint to see if images exist
 */

async function testImageSearch(recipeTitle) {
  try {
    const response = await fetch('/api/recipes/search-dish-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeTitle }),
    });
    
    const data = await response.json();
    console.log(`\n🔍 Recipe: "${recipeTitle}"`);
    console.log(`   Success: ${data.success ? '✅' : '❌'}`);
    console.log(`   Found Image: ${data.url ? '✅ YES' : '❌ NO'}`);
    if (data.url) {
      console.log(`   URL: ${data.url.substring(0, 80)}...`);
    }
    if (data.error) {
      console.log(`   Error: ${data.error}`);
    }
    return data;
  } catch (error) {
    console.error(`   ❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test multiple recipes
const testRecipes = [
  'Chicken Tikka Masala',
  'Spaghetti Carbonara',
  'Pad Thai',
  'Chocolate Chip Cookies',
  'Beef Stroganoff',
  'Sushi Rolls',
  'Tacos',
  'Pizza Margherita',
  'Shawarma',
  'Fish Molee',
  'Japanese Sake Steamed Clams',
  'Korean Bibimbap',
];

async function runAllTests() {
  console.log('🧪 Testing Pexels Image Search via API');
  console.log('=====================================\n');
  
  const results = [];
  
  for (const recipe of testRecipes) {
    const result = await testImageSearch(recipe);
    results.push({ recipe, ...result });
    
    // Wait 1 second between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  console.log('\n\n📊 Summary');
  console.log('=====================================');
  const foundCount = results.filter(r => r.success && r.url).length;
  const notFoundCount = results.filter(r => !r.success || !r.url).length;
  
  console.log(`✅ Found images: ${foundCount}/${testRecipes.length} (${Math.round(foundCount/testRecipes.length*100)}%)`);
  console.log(`❌ Not found: ${notFoundCount}/${testRecipes.length}`);
  
  console.log('\n✅ Recipes with images:');
  results.filter(r => r.success && r.url).forEach(r => {
    console.log(`   - ${r.recipe}`);
  });
  
  console.log('\n❌ Recipes without images:');
  results.filter(r => !r.success || !r.url).forEach(r => {
    console.log(`   - ${r.recipe}${r.error ? ` (${r.error})` : ''}`);
  });
}

// Run tests
runAllTests();


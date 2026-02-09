/**
 * Test Pexels Image Search
 * 
 * Tests if Pexels API has images for various recipe titles
 * Run with: npx tsx test-pexels-images.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

// Test with real recipe titles from your database
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
  'Greek Moussaka',
  'French Coq au Vin',
  'Indian Butter Chicken',
];

interface TestResult {
  recipe: string;
  found: boolean;
  count: number;
  total?: number;
  url?: string;
  error?: string;
  query?: string;
}

async function testPexelsSearch(recipeTitle: string): Promise<TestResult> {
  // Clean title (same logic as your API)
  const cleanedTitle = recipeTitle
    .toLowerCase()
    .replace(/\b(recipe|dish|food|meal)\b/gi, '')
    .trim();
  
  const searchQuery = cleanedTitle 
    ? `${cleanedTitle} food dish`
    : `${recipeTitle.toLowerCase()} food dish`;
  
  console.log(`\n🔍 Testing: "${recipeTitle}"`);
  console.log(`   Query: "${searchQuery}"`);
  
  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=3&orientation=landscape`,
      {
        method: 'GET',
        headers: {
          'Authorization': PEXELS_API_KEY!,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ API Error: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText.substring(0, 200)}`);
      return { 
        recipe: recipeTitle, 
        found: false, 
        count: 0, 
        error: `${response.status} ${response.statusText}`,
        query: searchQuery,
      };
    }
    
    const data = await response.json();
    const photoCount = data.photos?.length || 0;
    const totalResults = data.total_results || 0;
    
    if (photoCount > 0) {
      const firstPhoto = data.photos[0];
      const imageUrl = firstPhoto.src?.large || firstPhoto.src?.medium || firstPhoto.src?.original;
      console.log(`   ✅ Found ${photoCount} results (${totalResults} total)`);
      console.log(`   📸 First image: ${imageUrl?.substring(0, 80)}...`);
      console.log(`   📝 Photographer: ${firstPhoto.photographer || 'N/A'}`);
      return { 
        recipe: recipeTitle, 
        found: true, 
        count: photoCount, 
        total: totalResults, 
        url: imageUrl,
        query: searchQuery,
      };
    } else {
      console.log(`   ❌ No images found (${totalResults} total)`);
      return { 
        recipe: recipeTitle, 
        found: false, 
        count: 0, 
        total: totalResults,
        query: searchQuery,
      };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { 
      recipe: recipeTitle, 
      found: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown',
      query: searchQuery,
    };
  }
}

async function runTests() {
  if (!PEXELS_API_KEY) {
    console.error('❌ PEXELS_API_KEY not set in environment');
    console.error('   Set it in .env.local or export it: export PEXELS_API_KEY=your_key');
    process.exit(1);
  }
  
  console.log('🧪 Testing Pexels API Image Search');
  console.log('=====================================\n');
  
  const results: TestResult[] = [];
  
  for (const recipe of testRecipes) {
    const result = await testPexelsSearch(recipe);
    results.push(result);
    
    // Small delay to avoid rate limiting (200 requests/hour free tier)
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }
  
  // Summary
  console.log('\n\n📊 Summary');
  console.log('=====================================');
  const foundCount = results.filter(r => r.found).length;
  const notFoundCount = results.filter(r => !r.found).length;
  
  console.log(`✅ Found images: ${foundCount}/${testRecipes.length} (${Math.round(foundCount/testRecipes.length*100)}%)`);
  console.log(`❌ Not found: ${notFoundCount}/${testRecipes.length} (${Math.round(notFoundCount/testRecipes.length*100)}%)`);
  
  console.log('\n✅ Recipes with images:');
  results.filter(r => r.found).forEach(r => {
    console.log(`   - ${r.recipe}`);
    console.log(`     Query: "${r.query}" → ${r.total} total results`);
  });
  
  console.log('\n❌ Recipes without images:');
  results.filter(r => !r.found).forEach(r => {
    if (r.total && r.total > 0) {
      console.log(`   - ${r.recipe} (${r.total} results but query may need refinement)`);
      console.log(`     Query: "${r.query}"`);
    } else {
      console.log(`   - ${r.recipe} (no results found)`);
      console.log(`     Query: "${r.query}"`);
    }
    if (r.error) {
      console.log(`     Error: ${r.error}`);
    }
  });
  
  // Average results
  const avgResults = results
    .filter(r => r.total !== undefined)
    .reduce((sum, r) => sum + (r.total || 0), 0) / results.length;
  console.log(`\n📈 Average results per query: ${Math.round(avgResults)}`);
}

runTests().catch(console.error);


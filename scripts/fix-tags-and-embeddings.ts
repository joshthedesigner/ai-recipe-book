/**
 * Script to fix recipe tags and regenerate embeddings
 * 
 * Usage:
 *   npx tsx scripts/fix-tags-and-embeddings.ts [options]
 * 
 * Options:
 *   --limit=N        Process only N recipes (default: 10 for testing)
 *   --groupId=ID     Process only recipes in this group
 *   --batchSize=N    Process N recipes per batch (default: 50)
 *   --all            Process all recipes (overrides --limit)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);

// Parse arguments
let limit: number | null = 10; // Default to 10 for safety
let groupId: string | null = null;
let batchSize = 50;
let processAll = false;

for (const arg of args) {
  if (arg === '--all') {
    processAll = true;
    limit = null;
  } else if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--groupId=')) {
    groupId = arg.split('=')[1];
  } else if (arg.startsWith('--batchSize=')) {
    batchSize = parseInt(arg.split('=')[1], 10);
  }
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const endpoint = '/api/recipes/fix-tags-and-embeddings';

async function runFix() {
  console.log('🔧 Fixing recipe tags and regenerating embeddings...\n');
  
  const params = new URLSearchParams();
  if (limit && !processAll) {
    params.append('limit', limit.toString());
    console.log(`📊 Processing ${limit} recipes (test mode)`);
  } else {
    console.log('📊 Processing ALL recipes');
  }
  if (groupId) {
    params.append('groupId', groupId);
    console.log(`📁 Group ID: ${groupId}`);
  }
  params.append('batchSize', batchSize.toString());
  
  const url = `${baseUrl}${endpoint}?${params.toString()}`;
  console.log(`\n🌐 Calling: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: In a real scenario, you'd need to include authentication cookies
      // This script assumes you're running it in a context where auth is handled
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!\n');
      console.log(`📝 ${result.message}\n`);
      console.log('📊 Statistics:');
      console.log(`   Total recipes: ${result.stats.total}`);
      console.log(`   Processed: ${result.stats.processed}`);
      console.log(`   Fixed: ${result.stats.fixed}`);
      console.log(`   Unchanged: ${result.stats.unchanged}`);
      console.log(`   Errors: ${result.stats.errors}`);
    } else {
      console.error('❌ Error:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to run fix:', error);
    console.error('\n💡 Note: This script requires authentication.');
    console.error('   Run this from the browser console instead, or ensure you have valid session cookies.');
    process.exit(1);
  }
}

runFix();


import { config } from 'dotenv';
import { resolve } from 'path';
import { routeMessage } from '@/router';

config({ path: resolve(__dirname, '../.env.local') });

async function quickTest() {
  console.log('Quick test of Store Recipe agent...\n');
  
  const message = `Save this recipe:
  
Title: Test Pasta
Ingredients: pasta, garlic, oil
Steps: Cook pasta, add garlic
Tags: quick, italian`;

  const result = await routeMessage(message, '00000000-0000-0000-0000-000000000001');
  
  console.log('Intent:', result.intent);
  console.log('Success:', result.recipe ? 'YES' : 'NO');
  console.log('\nMessage:', result.message.substring(0, 200));
}

quickTest().catch(console.error);


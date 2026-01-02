/**
 * Test Image Scraping Utility
 * 
 * Checks if images can be scraped from recipe URLs
 * Tests both schema.org data and HTML image extraction
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

interface ImageCheckResult {
  url: string;
  hasSchemaOrg: boolean;
  schemaImageUrl?: string;
  htmlImages: string[];
  canScrapeImage: boolean;
  method: 'schema' | 'html' | 'none';
}

/**
 * Strip HTML tags and decode HTML entities
 */
function stripHtml(text: string): string {
  const decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  const withoutTags = decoded.replace(/<[^>]*>/g, '');
  return withoutTags.trim();
}

/**
 * Check if URL has extractable images
 */
async function checkImageAvailability(url: string): Promise<ImageCheckResult> {
  console.log(`\n🔍 Checking: ${url}`);
  console.log('─'.repeat(80));
  
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeAssistBot/1.0)',
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Check 1: Schema.org Recipe data with image
    let schemaImageUrl: string | undefined;
    let hasSchemaOrg = false;
    
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonText = $(jsonLdScripts[i]).html();
        if (!jsonText) continue;

        const data = JSON.parse(jsonText);
        const recipes = Array.isArray(data) ? data : data['@graph'] || [data];
        
        for (const item of recipes) {
          if (item['@type'] === 'Recipe') {
            hasSchemaOrg = true;
            
            // Extract image from schema
            if (item.image) {
              if (typeof item.image === 'string') {
                schemaImageUrl = item.image;
              } else if (Array.isArray(item.image) && item.image[0]) {
                schemaImageUrl = item.image[0].url || item.image[0];
              } else if (item.image.url) {
                schemaImageUrl = item.image.url;
              }
            }
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Check 2: HTML image tags (common recipe image locations)
    const htmlImages: string[] = [];
    
    // Common selectors for recipe images
    const imageSelectors = [
      'img.recipe-image',
      'img[class*="recipe"]',
      'img[class*="hero"]',
      'article img',
      '.entry-content img',
      '.recipe-content img',
      'main img',
      'img[src*="recipe"]',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, el) => {
        const src = $(el).attr('src');
        const dataSrc = $(el).attr('data-src'); // Lazy loading
        const srcSet = $(el).attr('srcset');
        
        if (src && !src.startsWith('data:')) {
          // Convert relative URLs to absolute
          const absoluteUrl = src.startsWith('http') ? src : new URL(src, url).toString();
          if (!htmlImages.includes(absoluteUrl)) {
            htmlImages.push(absoluteUrl);
          }
        }
        
        if (dataSrc && !dataSrc.startsWith('data:')) {
          const absoluteUrl = dataSrc.startsWith('http') ? dataSrc : new URL(dataSrc, url).toString();
          if (!htmlImages.includes(absoluteUrl)) {
            htmlImages.push(absoluteUrl);
          }
        }
        
        // Parse srcset
        if (srcSet) {
          const urls = srcSet.split(',').map(s => s.trim().split(' ')[0]);
          urls.forEach(imgUrl => {
            if (!imgUrl.startsWith('data:')) {
              const absoluteUrl = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, url).toString();
              if (!htmlImages.includes(absoluteUrl)) {
                htmlImages.push(absoluteUrl);
              }
            }
          });
        }
      });
    }

    // Determine result
    const canScrapeImage = !!schemaImageUrl || htmlImages.length > 0;
    const method = schemaImageUrl ? 'schema' : (htmlImages.length > 0 ? 'html' : 'none');

    return {
      url,
      hasSchemaOrg,
      schemaImageUrl,
      htmlImages: htmlImages.slice(0, 5), // Limit to first 5 for display
      canScrapeImage,
      method,
    };

  } catch (error) {
    console.error(`❌ Error checking URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      url,
      hasSchemaOrg: false,
      htmlImages: [],
      canScrapeImage: false,
      method: 'none',
    };
  }
}

/**
 * Print formatted results
 */
function printResults(results: ImageCheckResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMAGE SCRAPING CHECK RESULTS');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`);
    console.log('─'.repeat(80));
    
    if (result.hasSchemaOrg) {
      console.log('✅ Schema.org Recipe data: FOUND');
      if (result.schemaImageUrl) {
        console.log(`   📸 Image URL: ${result.schemaImageUrl}`);
      } else {
        console.log('   ⚠️  No image in schema.org data');
      }
    } else {
      console.log('❌ Schema.org Recipe data: NOT FOUND');
    }
    
    if (result.htmlImages.length > 0) {
      console.log(`✅ HTML Images found: ${result.htmlImages.length}`);
      result.htmlImages.slice(0, 3).forEach((img, i) => {
        console.log(`   ${i + 1}. ${img}`);
      });
      if (result.htmlImages.length > 3) {
        console.log(`   ... and ${result.htmlImages.length - 3} more`);
      }
    } else {
      console.log('❌ HTML Images: NONE FOUND');
    }
    
    console.log(`\n🎯 CAN SCRAPE IMAGE: ${result.canScrapeImage ? 'YES ✅' : 'NO ❌'}`);
    if (result.canScrapeImage) {
      console.log(`   Method: ${result.method === 'schema' ? 'Schema.org (currently supported)' : 'HTML (not currently supported)'}`);
    } else {
      console.log('   Reason: No images found in schema.org data or common HTML locations');
    }
  });
  
  // Summary
  const scrapableCount = results.filter(r => r.canScrapeImage).length;
  const schemaScrapable = results.filter(r => r.method === 'schema').length;
  const htmlOnly = results.filter(r => r.method === 'html').length;
  
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total URLs checked: ${results.length}`);
  console.log(`✅ Can scrape images: ${scrapableCount}`);
  console.log(`   - Via schema.org: ${schemaScrapable} (currently supported)`);
  console.log(`   - Via HTML only: ${htmlOnly} (not currently supported)`);
  console.log(`❌ Cannot scrape: ${results.length - scrapableCount}`);
}

/**
 * Main function
 */
async function main() {
  // Get URLs from command line arguments
  const urls = process.argv.slice(2);
  
  if (urls.length === 0) {
    console.log('Usage: npx tsx scripts/test-image-scraping.ts <url1> [url2] [url3] ...');
    console.log('\nExample:');
    console.log('  npx tsx scripts/test-image-scraping.ts https://example.com/recipe https://another.com/recipe');
    process.exit(1);
  }
  
  console.log('🔍 Image Scraping Check Utility');
  console.log('='.repeat(80));
  console.log(`Checking ${urls.length} URL(s)...`);
  
  const results: ImageCheckResult[] = [];
  
  for (const url of urls) {
    const result = await checkImageAvailability(url);
    results.push(result);
  }
  
  printResults(results);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { checkImageAvailability };
export type { ImageCheckResult };


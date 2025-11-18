/**
 * Video Recipe Extraction Utility
 * 
 * Extracts recipes from video URLs using captions/transcripts
 */

import OpenAI from 'openai';
import { getYouTubeCaptions, extractYouTubeId, isYouTubeUrl, getYouTubeMetadata } from '@/utils/youtubeHelpers';
import { scrapeRecipe } from '@/utils/recipeScraper';
import { extractSectionHeaderHints } from '@/utils/sectionDetector';
import { RecipeSection } from '@/types';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  sections?: RecipeSection[]; // Optional structured sections
  incomplete?: boolean;
  reason?: string;
  video_url: string;
  video_platform: string;
}

async function extractRecipeFromTranscript(
  transcript: string,
  sectionHints?: string[]
): Promise<Omit<ExtractedRecipe, 'video_url' | 'video_platform'>> {
  const client = getOpenAIClient();
  
  // Build section detection instructions
  let sectionHintsText = '';
  if (sectionHints && sectionHints.length > 0) {
    sectionHintsText = `\n\nPotential section headers detected: ${sectionHints.map(h => `"${h}"`).join(', ')}`;
  }
  
  const prompt = `You are an expert recipe extraction assistant. Extract a complete recipe from this VIDEO TRANSCRIPT (spoken narration).

EXTRACTION SOURCE:
- Primary source: Video transcript (spoken narration)
- Secondary reference: Video description may contain section headers and ingredient lists${sectionHintsText ? `\n\nIMPORTANT: The following section headers were detected in the description/video:\n${sectionHints.map(h => `  - "${h}"`).join('\n')}\n\nYou MUST extract ALL of these sections if they appear in the transcript. Do not miss any sections!` : ''}
- Follow the transcript carefully - extract exactly what ingredients are listed under each section

OUTPUT STRUCTURE:
- title: The recipe name
- tags: Relevant tags (cuisine, meal type, protein, etc.)
- ingredients: Array of ALL ingredients WITH EXACT QUANTITIES (use this if no sections, or as fallback)
- steps: Array of detailed cooking instructions (use this if no sections, or as fallback if sections incomplete)
- sections: (OPTIONAL) Array of structured sections if recipe has multiple components

CRITICAL: SECTION STRUCTURE RULES (if sections are detected):
1. SECTIONS MUST MIRROR: If you create ingredient sections, create matching instruction sections with the SAME titles
2. ORDER: All ingredient sections FIRST, then all instruction sections (in matching order)
3. SEPARATION: Each section contains EITHER ingredients OR steps, NEVER both
4. STRUCTURE: { title: string, ingredients?: string[] } OR { title: string, steps?: string[] }
5. COMPLETENESS: Extract ALL ingredients listed under each section header - don't miss any items
6. ALL SECTIONS: Extract ALL sections mentioned in the description or transcript. If you see section headers like "Chicken Soup", "Dashi Stock", "Shoyu Tare", etc., you MUST create sections for ALL of them - do not skip any
7. SECTION BOUNDARIES: Ingredients listed under a section header belong ONLY to that section - don't mix or merge ingredients between different sections
8. TITLE CHECK: If a section title contains an ingredient name (e.g., "Shoyu Tare" contains "Shoyu"), ensure that ingredient is included in that section's ingredients array
9. EXAMPLE:
   If recipe has "Stock" and "Aroma Oil" sections:
   sections: [
     { title: "Stock", ingredients: ["1.1 kg pork bones", ...] },
     { title: "Aroma Oil", ingredients: ["500g pork fat", ...] },
     { title: "Stock", steps: ["Pre-boil pork bones...", ...] },
     { title: "Aroma Oil", steps: ["Boil pork fat...", ...] }
   ]
10. If sections exist and are complete, prefer sections. However, ALWAYS include flat "ingredients" and "steps" arrays as a backup even when sections exist, to ensure data completeness.

QUANTITY EXTRACTION RULES:
• Extract EXACT quantities - use FIRST mentioned amount
• Ignore filler words: "about", "roughly", "around", "maybe", "approximately"
• Handle ranges: "3 to 4 tablespoons" → "3-4 tablespoons"
• "A couple" = 2, "a few" = 3, "half" = 1/2
• If speaker gives options ("2 or 3 tablespoons"), use the first: "2 tablespoons"

EXAMPLES:
• "I use about 3 tablespoons palm sugar" → "3 tablespoons palm sugar"
• "Add 2, maybe 3 tablespoons fish sauce" → "2-3 tablespoons fish sauce"
• "Around a quarter cup of oil" → "1/4 cup oil"
• "Half a cup of peanuts" → "1/2 cup peanuts"

If the transcript doesn't contain a recipe, set incomplete:true with a reason.

Return valid JSON only.`;

  // First, log the full transcript so we can review it
  console.log('\n📜 FULL VIDEO TRANSCRIPT:');
  console.log('='.repeat(80));
  console.log(transcript);
  console.log('='.repeat(80));
  console.log(`Total transcript length: ${transcript.length} characters\n`);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Extract the recipe from this video transcript:\n\n${transcript}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const extracted = JSON.parse(content);
  
  // Store original flat arrays in case OpenAI included them despite sections
  const originalSteps = extracted.steps && Array.isArray(extracted.steps) ? extracted.steps : [];
  const originalIngredients = extracted.ingredients && Array.isArray(extracted.ingredients) ? extracted.ingredients : [];
  
  // Post-process: Handle sections vs flat arrays
  if (extracted.sections && Array.isArray(extracted.sections) && extracted.sections.length > 0) {
    console.log(`📋 Sections detected (${extracted.sections.length}), processing separated structure...`);
    
    // Sections are now separated: ingredient sections first, then instruction sections
    // Populate flat arrays from sections for database compatibility (NOT NULL constraint)
    const allIngredients: string[] = [];
    const allSteps: string[] = [];
    
    extracted.sections.forEach((section: any) => {
      if (section.ingredients && Array.isArray(section.ingredients)) {
        allIngredients.push(...section.ingredients);
      }
      if (section.steps && Array.isArray(section.steps)) {
        allSteps.push(...section.steps);
      }
    });
    
    // Log section structure
    const ingredientSections = extracted.sections.filter((s: any) => s.ingredients && s.ingredients.length > 0);
    const stepSections = extracted.sections.filter((s: any) => s.steps && s.steps.length > 0);
    console.log(`   Structure: ${ingredientSections.length} ingredient sections, ${stepSections.length} instruction sections`);
    console.log(`   Consolidated: ${allIngredients.length} ingredients, ${allSteps.length} steps`);
    
    // Validate sections: Only remove if sections are CERTAINLY malformed (no instruction sections AND no steps)
    // Check both consolidated steps AND original flat steps (in case OpenAI included them)
    const hasStepsFromSections = allSteps.length > 0;
    const hasStepsFromFlat = originalSteps.length > 0;
    const hasAnySteps = hasStepsFromSections || hasStepsFromFlat;
    
    if (stepSections.length === 0 && !hasAnySteps) {
      // Sections have no instruction sections AND no steps anywhere - truly malformed
      console.warn(`⚠️  Sections detected but no instruction sections found AND no steps available. Removing sections and using flat arrays only.`);
      delete extracted.sections; // Remove malformed sections
      // Use original flat arrays if available, otherwise empty
      extracted.ingredients = originalIngredients.length > 0 ? originalIngredients : allIngredients;
      extracted.steps = originalSteps.length > 0 ? originalSteps : [];
    } else {
      // Sections are valid OR we have steps from flat arrays - use consolidated data
      // Prefer steps from sections, fall back to original flat steps if sections didn't have steps
      extracted.ingredients = allIngredients.length > 0 ? allIngredients : originalIngredients;
      extracted.steps = hasStepsFromSections ? allSteps : originalSteps;
      
      // If sections don't have steps but flat arrays do, keep sections but they'll render with fallback
      if (stepSections.length === 0 && hasStepsFromFlat) {
        console.warn(`⚠️  Sections detected but no instruction sections found. Using flat steps array as fallback while keeping sections for ingredient organization.`);
      }
    }
  } else {
    // No sections detected - ensure flat arrays exist (backwards compatibility)
    if (!extracted.ingredients || !Array.isArray(extracted.ingredients)) {
      extracted.ingredients = [];
    }
    if (!extracted.steps || !Array.isArray(extracted.steps)) {
      extracted.steps = [];
    }
  }
  
  // Log extraction results
  if (extracted.sections && extracted.sections.length > 0) {
    console.log('\n📋 EXTRACTED SECTIONS:');
    console.log('='.repeat(80));
    
    const ingredientSections = extracted.sections.filter((s: any) => s.ingredients && s.ingredients.length > 0);
    const stepSections = extracted.sections.filter((s: any) => s.steps && s.steps.length > 0);
    
    if (ingredientSections.length > 0) {
      console.log('\n📦 INGREDIENT SECTIONS:');
      ingredientSections.forEach((section: any, index: number) => {
        console.log(`\n${index + 1}. ${section.title} (${section.ingredients.length} ingredients)`);
        section.ingredients.slice(0, 3).forEach((ing: string) => console.log(`   - ${ing}`));
        if (section.ingredients.length > 3) {
          console.log(`   ... and ${section.ingredients.length - 3} more`);
        }
      });
    }
    
    if (stepSections.length > 0) {
      console.log('\n📝 INSTRUCTION SECTIONS:');
      stepSections.forEach((section: any, index: number) => {
        console.log(`\n${index + 1}. ${section.title} (${section.steps.length} steps)`);
        section.steps.slice(0, 2).forEach((step: string) => console.log(`   - ${step.substring(0, 60)}...`));
        if (section.steps.length > 2) {
          console.log(`   ... and ${section.steps.length - 2} more steps`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  } else {
    // Log flat extraction (backwards compatibility)
    console.log('\n🔍 FLAT EXTRACTION (no sections):');
    console.log('='.repeat(80));
    if (extracted.ingredients && Array.isArray(extracted.ingredients)) {
      console.log(`\nExtracted ${extracted.ingredients.length} ingredients`);
      extracted.ingredients.slice(0, 5).forEach((ingredient: string, index: number) => {
        console.log(`   ${index + 1}. ${ingredient}`);
      });
      if (extracted.ingredients.length > 5) {
        console.log(`   ... and ${extracted.ingredients.length - 5} more`);
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');
  }

  return extracted;
}

/**
 * Validate URL is safe to scrape (SSRF protection)
 * Blocks localhost, private IPs, and non-HTTP protocols
 */
function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    // Block localhost and private IP ranges
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') || // 172.20-29
      hostname.startsWith('172.30') ||
      hostname.startsWith('172.31.') ||
      hostname.includes('::1') || // IPv6 localhost
      hostname.includes('169.254.') // Link-local
    ) {
      return false;
    }
    
    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

export async function extractRecipeFromYouTubeVideo(videoUrl: string): Promise<ExtractedRecipe> {
  console.log('🎥 Processing YouTube video:', videoUrl);

  // Extract video ID
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  console.log('📺 YouTube video ID:', videoId);

  // First, check video description for recipe links
  const metadata = await getYouTubeMetadata(videoId);
  
  if (metadata?.descriptionLinks && metadata.descriptionLinks.length > 0) {
    console.log('🔗 Found links in video description, trying to scrape recipe...');
    
    // Try each link to see if it has a recipe
    for (const link of metadata.descriptionLinks) {
      // Skip social media and YouTube links
      if (link.includes('youtube.com') || link.includes('youtu.be') || 
          link.includes('instagram.com') || link.includes('facebook.com') ||
          link.includes('twitter.com') || link.includes('tiktok.com')) {
        continue;
      }
      
      // SSRF Protection: Validate URL is safe before scraping
      if (!isSafeUrl(link)) {
        console.log(`   🛡️ Skipping unsafe URL: ${link}`);
        continue;
      }
      
      try {
        console.log(`   Trying to scrape recipe from: ${link}`);
        const scrapedRecipe = await scrapeRecipe(link);
        
        if (scrapedRecipe.ingredients.length > 0 && scrapedRecipe.steps.length > 0) {
          console.log(`✅ Found complete recipe in description link!`);
          
          // Return scraped recipe with video URL
          return {
            title: scrapedRecipe.title,
            ingredients: scrapedRecipe.ingredients,
            steps: scrapedRecipe.steps,
            tags: scrapedRecipe.tags,
            incomplete: false,
            video_url: videoUrl,
            video_platform: 'youtube',
          };
        }
      } catch (scrapeError) {
        console.log(`   Failed to scrape ${link}:`, scrapeError instanceof Error ? scrapeError.message : 'Unknown error');
        // Continue to next link
      }
    }
    
    console.log('   No valid recipes found in description links');
  }

  // Fall back to caption extraction
  console.log('📝 Attempting caption-based extraction...');
  const captions = await getYouTubeCaptions(videoId);
  
  if (!captions) {
    // No captions and no description recipe - offer to save video-only
    throw new Error('VIDEO_LINK_ONLY');
  }

  console.log(`✅ Got captions (${captions.length} characters), extracting recipe...`);

  // Try to get section hints from description first (usually better formatted)
  let sectionHints: string[] | undefined;
  if (metadata?.description) {
    console.log('🔍 Detecting sections from video description...');
    sectionHints = extractSectionHeaderHints(metadata.description);
    console.log(`📋 Found ${sectionHints.length} potential section headers:`, sectionHints);
  }
  
  // If no hints from description, try transcript
  if (!sectionHints || sectionHints.length === 0) {
    console.log('🔍 Detecting sections from transcript...');
    sectionHints = extractSectionHeaderHints(captions);
    console.log(`📋 Found ${sectionHints.length} potential section headers:`, sectionHints);
  }

  // Extract recipe from captions with section hints
  const recipe = await extractRecipeFromTranscript(captions, sectionHints.length > 0 ? sectionHints : undefined);

  if (recipe.incomplete) {
    throw new Error(recipe.reason || 'Could not find a recipe in this video');
  }

  // Add video metadata
  const recipeWithVideo: ExtractedRecipe = {
    ...recipe,
    video_url: videoUrl,
    video_platform: 'youtube',
  };

  console.log('✅ Recipe extracted from video:', recipeWithVideo.title);

  return recipeWithVideo;
}


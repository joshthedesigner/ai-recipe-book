/**
 * Video Recipe Extraction Utility
 * 
 * Extracts recipes from video URLs using captions/transcripts
 */

import OpenAI from 'openai';
import { getYouTubeCaptions, extractYouTubeId, isYouTubeUrl, getYouTubeMetadata } from '@/utils/youtubeHelpers';
import { scrapeRecipe } from '@/utils/recipeScraper';

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
  incomplete?: boolean;
  reason?: string;
  video_url: string;
  video_platform: string;
}

async function extractRecipeFromTranscript(transcript: string): Promise<Omit<ExtractedRecipe, 'video_url' | 'video_platform'>> {
  const client = getOpenAIClient();
  
  const prompt = `You are an expert recipe extraction assistant. Extract a complete recipe from this VIDEO TRANSCRIPT (spoken narration).

Extract these fields:
- title: The recipe name
- ingredients: Array of ingredients WITH EXACT QUANTITIES as spoken
- steps: Array of detailed cooking instructions
- tags: Relevant tags (cuisine, meal type, protein, etc.)

CRITICAL RULES FOR VIDEO TRANSCRIPTS:
• Extract EXACT quantities the speaker states - use FIRST mentioned amount
• Ignore filler words: "about", "roughly", "around", "maybe", "approximately"
• Handle ranges precisely: "3 to 4 tablespoons" → "3-4 tablespoons"
• "A couple" = 2, "a few" = 3, "half" = 1/2
• Watch for base recipe context: "for 8 ounces of noodles" or "for 4 servings"
• Use the PRIMARY quantity mentioned, not alternatives or suggestions
• If speaker gives options ("2 or 3 tablespoons"), use the first: "2 tablespoons"
• Pay attention to "per serving" vs "total batch" context

QUANTITY EXTRACTION EXAMPLES:
• "I use about 3 tablespoons palm sugar" → "3 tablespoons palm sugar"
• "Add 2, maybe 3 tablespoons fish sauce" → "2-3 tablespoons fish sauce"  
• "Around a quarter cup of oil" → "1/4 cup oil"
• "Half a cup of peanuts" → "1/2 cup peanuts"
• "A couple eggs" → "2 eggs"
• "Three to four tablespoons" → "3-4 tablespoons"

MEASUREMENT PRECISION:
• Preserve exact measurements - don't round or estimate
• Include units exactly as stated (cups, tablespoons, teaspoons, grams)
• Keep fractions precise (1/2, 1/4, 3/4)
• Note if "for 8 oz noodles" or similar base amount is mentioned

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
  
  // Log each extracted ingredient with context from transcript
  console.log('\n🔍 INGREDIENT EXTRACTION ANALYSIS:');
  console.log('='.repeat(80));
  if (extracted.ingredients && Array.isArray(extracted.ingredients)) {
    extracted.ingredients.forEach((ingredient: string, index: number) => {
      console.log(`\n${index + 1}. INGREDIENT: "${ingredient}"`);
      
      // Find mentions in transcript
      const ingredientName = ingredient.replace(/^\d+[\s\/-]*(?:cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|ml|l)?\s*/i, '').split(',')[0].trim();
      const searchTerms = ingredientName.split(/\s+/).filter(word => word.length > 3);
      
      if (searchTerms.length > 0) {
        const mainTerm = searchTerms[0];
        // Escape special regex characters
        const escapedTerm = mainTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`.{0,80}${escapedTerm}.{0,80}`, 'gi');
        const matches = transcript.match(regex);
        
        if (matches && matches.length > 0) {
          console.log(`   TRANSCRIPT MENTIONS (${matches.length}):`);
          matches.forEach((match, i) => {
            console.log(`   ${i + 1}) "...${match.trim()}..."`);
          });
        } else {
          console.log('   ⚠️ Not found in transcript');
        }
      }
    });
  }
  console.log('\n' + '='.repeat(80) + '\n');

  return extracted;
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

  // Extract recipe from captions
  const recipe = await extractRecipeFromTranscript(captions);

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


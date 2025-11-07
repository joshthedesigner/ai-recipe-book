/**
 * Store Recipe Agent
 * 
 * Purpose: Extract structured recipe data and save to database
 * 
 * Key Rules:
 * - Must not invent missing fields
 * - Generates embeddings for semantic search
 * - Returns JSON + human-readable summary
 * - Validates required fields (title, ingredients, steps)
 */

import OpenAI from 'openai';
import { Recipe, AgentResponse } from '@/types';
import { generateEmbedding, createRecipeSearchText } from '@/vector/embed';
import { SupabaseClient } from '@supabase/supabase-js';
import { containsURL, extractURL, scrapeRecipe } from '@/utils/recipeScraper';
import { mergeAutoTags } from '@/utils/autoTag';
import { getUserDefaultGroup, canUserAddRecipes, hasGroupAccess } from '@/utils/permissions';
import { isYouTubeUrl, extractYouTubeId } from '@/utils/youtubeHelpers';

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

const INTENT_CHECK_PROMPT = `You are checking if a user message contains actual recipe content or just expresses an intent to save a recipe.

Return JSON with:
- "has_recipe_content": true if the message contains actual recipe details (ingredients, steps, food items), false if it's just expressing intent
- "reason": brief explanation

Examples:

"I want to save a recipe" → {"has_recipe_content": false, "reason": "Just expressing intent, no recipe details"}
"Can you save this recipe for me?" → {"has_recipe_content": false, "reason": "Just expressing intent, no recipe details"}
"Save this: Pasta with garlic and oil" → {"has_recipe_content": true, "reason": "Contains recipe title and ingredients"}
"Here's a recipe: 1 cup flour, 2 eggs, mix and bake" → {"has_recipe_content": true, "reason": "Contains ingredients and steps"}`;

const EXTRACTION_PROMPT = `You are an expert recipe extraction assistant. Extract recipes with MAXIMUM detail and accuracy preservation.

Extract these fields:
- title: The name of the recipe
- ingredients: Array of ingredient strings WITH EXACT QUANTITIES
- steps: Array of detailed cooking instructions
- tags: Array of relevant tags (cuisine type, meal type, dietary, main ingredient, etc.)

CRITICAL RULES FOR INGREDIENTS:
• ALWAYS include quantities: "2 cups all-purpose flour" NOT "flour"
• Preserve exact measurements: "1/2 teaspoon salt" NOT "salt"
• Include all units: "200g sugar" NOT "200 sugar"  
• Keep preparations: "1 large onion, diced" NOT "1 onion"
• Never drop amounts - if unclear, write "(amount unclear)" but keep ingredient
• Extract fractions precisely: 1/2, 1/4, 3/4, 1/3, 2/3

CRITICAL RULES FOR STEPS:
• Include specific times: "Bake for 25-30 minutes" NOT "Bake until done"
• Include temperatures: "Preheat oven to 350°F" NOT "Preheat oven"
• Include technique details: "Whisk on medium speed" NOT "Whisk"
• Preserve timing cues: "Let rest for 10 minutes" NOT "Let rest"

QUALITY STANDARDS:
• Be thorough, not concise - detail is critical for recipes
• More information is better than less
• If measurements exist in source text, they MUST appear in output
• Only set incomplete:true if there is NO recipe content at all
• Work with partial data - extract everything available

IMPORTANT:
- Extract information that is explicitly provided in the text
- If quantity is mentioned, include it exactly as stated
- If unsure, include the ingredient with note rather than dropping it
- Tags should be lowercase (e.g., "italian", "dessert", "chicken")
- Return valid JSON only

AUTO-TAGGING RULES FOR MAIN INGREDIENTS:
- Always analyze the ingredients and automatically add category tags based on protein/main ingredient
- Add "fish" tag if ingredients include: salmon, tuna, cod, halibut, tilapia, trout, bass, mackerel, sardines, anchovies, or any other fish
- Add "seafood" tag if ingredients include: shrimp, prawns, crab, lobster, scallops, mussels, clams, oysters, squid, octopus
- Add "chicken" tag if ingredients include: chicken, poultry (but not for other birds)
- Add "beef" tag if ingredients include: beef, steak, ground beef, brisket
- Add "pork" tag if ingredients include: pork, bacon, ham, sausage, prosciutto, pancetta
- Add "lamb" tag if ingredients include: lamb, mutton
- Add "vegetarian" tag if there are NO meat, fish, or seafood ingredients
- Add "vegan" tag if there are no animal products at all (no meat, fish, seafood, dairy, eggs, honey)
- You can add multiple protein tags if the recipe contains multiple proteins

Example output (complete recipe with auto-tags):
{
  "title": "Spaghetti Carbonara",
  "ingredients": ["400g spaghetti", "200g pancetta", "4 eggs", "100g Pecorino cheese", "Black pepper", "Salt"],
  "steps": ["Boil pasta", "Fry pancetta", "Mix eggs and cheese", "Combine with hot pasta", "Serve immediately"],
  "tags": ["pasta", "italian", "dinner", "quick", "pork"],
  "incomplete": false
}

Example output (fish recipe with auto-tags):
{
  "title": "Grilled Salmon",
  "ingredients": ["2 salmon fillets", "olive oil", "lemon", "garlic", "herbs"],
  "steps": ["Season salmon", "Grill for 4-5 minutes per side", "Serve with lemon"],
  "tags": ["grilled", "fish", "healthy", "dinner"],
  "incomplete": false
}

Example output (partial recipe - STILL VALID):
{
  "title": "Cabbage Salad",
  "ingredients": ["cabbage", "carrots", "dressing"],
  "steps": ["Shred cabbage", "Mix ingredients"],
  "tags": ["salad", "vegetarian", "side dish"],
  "incomplete": false
}

ONLY mark as incomplete if there's absolutely nothing usable:
{
  "title": "Unknown Recipe",
  "ingredients": [],
  "steps": [],
  "tags": [],
  "incomplete": true,
  "reason": "No recipe content found in text"
}`;

/**
 * Save a confirmed recipe directly to the database
 * Used after user confirms a previewed recipe
 */
export async function saveConfirmedRecipe(
  recipe: Recipe,
  userId: string,
  supabase: SupabaseClient,
  groupId?: string | null  // Optional groupId - if not provided, uses default group
): Promise<AgentResponse> {
  try {
    console.log('Saving confirmed recipe to database...');

    // Use provided groupId or fall back to default group
    let activeGroupId = groupId;
    if (!activeGroupId) {
      activeGroupId = await getUserDefaultGroup(supabase, userId);
    }

    if (!activeGroupId) {
      return {
        success: false,
        message: 'You are not a member of any recipe group. Please contact your administrator.',
        error: 'No group found for user',
      };
    }

    // Validate user has access to the specified group
    const hasAccess = await hasGroupAccess(supabase, userId, activeGroupId);
    if (!hasAccess) {
      return {
        success: false,
        message: 'You do not have access to this recipe book.',
        error: 'User lacks access to group',
      };
    }

    const hasPermission = await canUserAddRecipes(supabase, userId, activeGroupId);
    if (!hasPermission) {
      return {
        success: false,
        message: 'You do not have permission to add recipes. Please contact your administrator for write access.',
        error: 'User lacks write permission',
      };
    }

    // Generate embedding
    let embedding;
    try {
      const searchText = createRecipeSearchText(recipe);
      embedding = await generateEmbedding(searchText);
    } catch (embedError) {
      console.error('Error generating embedding:', embedError);
      return {
        success: false,
        message: 'Sorry, I had trouble processing the recipe for search.',
        error: embedError instanceof Error ? embedError.message : 'Embedding failed',
      };
    }

    // Check authentication
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    if (!sessionData?.user) {
      return {
        success: false,
        message: 'Authentication session not found. Please try logging out and back in.',
        error: 'No authenticated user in session',
      };
    }

    if (sessionData.user.id !== userId) {
      return {
        success: false,
        message: 'User authentication mismatch. Please refresh the page and try again.',
        error: 'User ID does not match session',
      };
    }

    // Save to database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        group_id: activeGroupId,
        title: recipe.title,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags,
        source_url: recipe.source_url || null,
        image_url: recipe.image_url || null,
        cookbook_name: recipe.cookbook_name || null,
        cookbook_page: recipe.cookbook_page || null,
        contributor_name: recipe.contributor_name,
        embedding: embedding,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `Database error: ${error.message}`,
        error: error.message,
      };
    }

    const summary = generateRecipeSummary(data);

    return {
      success: true,
      message: `✅ Recipe saved successfully!\n\n${summary}`,
      data: data,
    };
  } catch (error) {
    console.error('Error in saveConfirmedRecipe:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error saving your recipe.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function storeRecipe(
  message: string,
  userId: string,
  contributorName: string = 'User',
  supabase?: SupabaseClient,
  reviewMode: boolean = true,  // Default to requiring review for URLs
  cookbookName?: string | null,
  cookbookPage?: string | null,
  groupId?: string | null  // Optional groupId - if not provided, uses default group
): Promise<AgentResponse> {
  try {
    // Step 0: Check permissions and get group_id
    if (!supabase) {
      return {
        success: false,
        message: 'Database connection required',
        error: 'No Supabase client provided',
      };
    }

    // Use provided groupId or fall back to default group
    let activeGroupId = groupId;
    if (!activeGroupId) {
      activeGroupId = await getUserDefaultGroup(supabase, userId);
    }

    if (!activeGroupId) {
      return {
        success: false,
        message: 'You are not a member of any recipe group. Please contact your administrator.',
        error: 'No group found for user',
      };
    }

    // Validate user has access to the specified group
    const hasAccess = await hasGroupAccess(supabase, userId, activeGroupId);
    if (!hasAccess) {
      return {
        success: false,
        message: 'You do not have access to this recipe book.',
        error: 'User lacks access to group',
      };
    }

    const hasPermission = await canUserAddRecipes(supabase, userId, activeGroupId);
    if (!hasPermission) {
      return {
        success: false,
        message: 'You do not have permission to add recipes. Please contact your administrator for write access.',
        error: 'User lacks write permission',
      };
    }

    // Step 1: Check if message contains a URL
    if (containsURL(message)) {
      const url = extractURL(message);
      if (url) {
        // Check if it's a YouTube video URL
        if (isYouTubeUrl(url)) {
          const videoId = extractYouTubeId(url);
          if (videoId) {
            console.log('YouTube video detected:', videoId);
            
            // Call video extraction API
            try {
              const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/recipes/extract-from-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: url }),
              });
              
              const videoData = await videoResponse.json();
              
              if (videoData.success) {
                console.log('✅ Recipe extracted from YouTube video (using captions - FREE!)');
                
                // Add cookbook info if provided
                const recipeWithMetadata = {
                  ...videoData.recipe,
                  cookbook_name: cookbookName || null,
                  cookbook_page: cookbookPage || null,
                  contributor_name: contributorName,
                };
                
                // If in review mode, return for confirmation
                if (reviewMode) {
                  const preview = generateRecipePreview(recipeWithMetadata);
                  return {
                    success: true,
                    message: preview,
                    data: recipeWithMetadata,
                  };
                }
                
                // Otherwise save directly (continue to embedding step below)
                const extractedRecipe = recipeWithMetadata;
                
                // Generate embedding
                console.log('Generating embedding for video recipe...');
                let embedding;
                try {
                  const searchText = createRecipeSearchText(extractedRecipe);
                  embedding = await generateEmbedding(searchText);
                } catch (embedError) {
                  console.error('Error generating embedding:', embedError);
                  return {
                    success: false,
                    message: 'Sorry, I had trouble processing the recipe for search.',
                    error: embedError instanceof Error ? embedError.message : 'Embedding failed',
                  };
                }
                
                // Save to database
                console.log('Saving video recipe to database...');
                const { data, error } = await supabase
                  .from('recipes')
                  .insert([{
                    user_id: userId,
                    group_id: activeGroupId,
                    title: extractedRecipe.title,
                    ingredients: extractedRecipe.ingredients,
                    steps: extractedRecipe.steps,
                    tags: extractedRecipe.tags,
                    source_url: extractedRecipe.source_url,
                    image_url: extractedRecipe.image_url,
                    video_url: extractedRecipe.video_url,
                    video_platform: extractedRecipe.video_platform,
                    cookbook_name: extractedRecipe.cookbook_name,
                    cookbook_page: extractedRecipe.cookbook_page,
                    contributor_name: contributorName,
                    embedding: embedding,
                  }])
                  .select()
                  .single();

                if (error) throw error;
                
                const summary = generateRecipeSummary(data);
                console.log('✅ Video recipe saved successfully');

                return {
                  success: true,
                  message: summary,
                  data: data,
                };
              } else {
                // Video extraction failed, fall through to regular URL scraping
                console.log('Video extraction failed:', videoData.error);
                if (videoData.needsCaptions) {
                  return {
                    success: false,
                    message: `This YouTube video doesn't have captions available. ${videoData.error}`,
                  };
                }
                // Fall through to try regular scraping
              }
            } catch (videoError) {
              console.error('Error processing video:', videoError);
              // Fall through to try regular URL scraping
            }
          }
        }
        
        console.log('URL detected, scraping recipe from:', url);
        try {
          const scrapedRecipe = await scrapeRecipe(url);
          
          // Use the scraped recipe directly
          const extractedRecipe = {
            title: scrapedRecipe.title,
            ingredients: scrapedRecipe.ingredients,
            steps: scrapedRecipe.steps,
            tags: scrapedRecipe.tags,
            source_url: scrapedRecipe.source_url,
            image_url: scrapedRecipe.image_url,
            incomplete: false,
          };

          // Validate we got required fields
          if (!extractedRecipe.ingredients || extractedRecipe.ingredients.length === 0 ||
              !extractedRecipe.steps || extractedRecipe.steps.length === 0) {
            return {
              success: false,
              message: `I found a webpage but couldn't extract a complete recipe from it. The site might not have proper recipe formatting. Try copying and pasting the recipe text instead!`,
            };
          }

          // If in review mode, return the recipe for confirmation
          if (reviewMode) {
            console.log('Review mode enabled - returning recipe for confirmation');
            const previewRecipe: Recipe = {
              title: extractedRecipe.title,
              ingredients: extractedRecipe.ingredients,
              steps: extractedRecipe.steps,
              tags: extractedRecipe.tags,
              source_url: extractedRecipe.source_url || url,
              image_url: extractedRecipe.image_url || null,
              cookbook_name: cookbookName || null,
              cookbook_page: cookbookPage || null,
              contributor_name: contributorName,
            };

            const preview = generateRecipePreview(previewRecipe);

            return {
              success: true,
              message: preview,
              data: previewRecipe,
            };
          }

          // Skip to embedding generation (Step 3)
          console.log('Generating embedding for scraped recipe...');
          let embedding;
          try {
            const searchText = createRecipeSearchText(extractedRecipe);
            embedding = await generateEmbedding(searchText);
          } catch (embedError) {
            console.error('Error generating embedding:', embedError);
            return {
              success: false,
              message: 'Sorry, I had trouble processing the recipe for search. The recipe might be too long. Try using a shorter version.',
              error: embedError instanceof Error ? embedError.message : 'Embedding failed',
            };
          }

          // Save to database (Step 4)
          console.log('Saving scraped recipe to database...');
          if (!supabase) {
            throw new Error('Supabase client not provided');
          }
          
          // Debug: Check if we have an authenticated session
          const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
          console.log('Auth check - User ID from session:', sessionData?.user?.id);
          console.log('Auth check - User ID we are trying to insert:', userId);
          
          if (!sessionData?.user) {
            return {
              success: false,
              message: 'Authentication session not found. Please try logging out and back in.',
              error: 'No authenticated user in session',
            };
          }
          
          if (sessionData.user.id !== userId) {
            console.error('User ID mismatch!', {
              sessionUserId: sessionData.user.id,
              providedUserId: userId
            });
            return {
              success: false,
              message: 'User authentication mismatch. Please refresh the page and try again.',
              error: 'User ID does not match session',
            };
          }
          
          const { data, error } = await supabase
            .from('recipes')
            .insert({
              user_id: userId,
              group_id: activeGroupId,
              title: extractedRecipe.title,
              ingredients: extractedRecipe.ingredients,
              steps: extractedRecipe.steps,
              tags: extractedRecipe.tags,
              source_url: extractedRecipe.source_url || url,
              image_url: extractedRecipe.image_url || null,
              cookbook_name: cookbookName || null,
              cookbook_page: cookbookPage || null,
              contributor_name: contributorName,
              embedding: embedding,
            })
            .select()
            .single();

          if (error) {
            console.error('Error saving recipe to database:', error);
            return {
              success: false,
              message: `Database error: ${error.message}. This might happen if the recipe is too large or has invalid data.`,
              error: error.message,
            };
          }

          // Generate human-readable summary
          const summary = generateRecipeSummary(data);

          return {
            success: true,
            message: `✅ Recipe scraped from website and saved!\n\n${summary}`,
            data: data,
          };

        } catch (scrapeError) {
          console.error('Error scraping URL:', scrapeError);
          return {
            success: false,
            message: `Sorry, I couldn't scrape the recipe from that URL. ${scrapeError instanceof Error ? scrapeError.message : 'Unknown error'}\n\nTry copying and pasting the recipe text instead!`,
            error: scrapeError instanceof Error ? scrapeError.message : 'Scraping failed',
          };
        }
      }
    }

    // Step 1: Check if message contains actual recipe content or just intent
    console.log('Checking if message contains recipe content...');
    const contentCheck = await checkForRecipeContent(message);
    
    if (!contentCheck.has_recipe_content) {
      return {
        success: true,
        message: `Great! I'd love to help you save a recipe. 😊\n\nPlease paste or describe the recipe you'd like to save. Include:\n- **Title** (or I can suggest one)\n- **Ingredients** (with quantities)\n- **Steps** (how to make it)\n- **Tags** (optional - like "italian", "dessert", "quick")\n\nYou can also paste a recipe URL from a website, or describe it in your own words!`,
      };
    }
    
    console.log('Extracting recipe from message...');
    
    // Step 2: Extract structured recipe data using AI
    let extractedRecipe;
    try {
      extractedRecipe = await extractRecipeData(message);
    } catch (extractError) {
      console.error('Error extracting recipe:', extractError);
      return {
        success: false,
        message: 'Sorry, I had trouble understanding the recipe format. This might happen with very long recipes. Try breaking it into smaller sections or simplifying the format.',
        error: extractError instanceof Error ? extractError.message : 'Extraction failed',
      };
    }
    
    // Step 2: Validate the extraction - only reject if absolutely nothing usable
    if (extractedRecipe.incomplete) {
      return {
        success: false,
        message: `I couldn't extract any recipe content from your message. ${extractedRecipe.reason || 'Please provide at least a title and some ingredients or steps.'}`,
      };
    }

    // Check if we have minimum viable content
    const hasTitle = extractedRecipe.title && extractedRecipe.title !== 'Unknown Recipe';
    const hasIngredients = extractedRecipe.ingredients && extractedRecipe.ingredients.length > 0;
    const hasSteps = extractedRecipe.steps && extractedRecipe.steps.length > 0;

    if (!hasTitle || (!hasIngredients && !hasSteps)) {
      return {
        success: false,
        message: `I found some content, but need a bit more to save the recipe. Please provide:\n- A recipe title\n- At least some ingredients OR cooking steps\n\nFeel free to share what you have, even if it's not complete!`,
      };
    }

    // If in review mode, return the recipe for confirmation
    if (reviewMode) {
      console.log('Review mode enabled - returning recipe for confirmation');
      const previewRecipe: Recipe = {
        title: extractedRecipe.title,
        ingredients: extractedRecipe.ingredients,
        steps: extractedRecipe.steps,
        tags: extractedRecipe.tags,
        source_url: null,
        image_url: null,
        cookbook_name: cookbookName || null,
        cookbook_page: cookbookPage || null,
        contributor_name: contributorName,
      };

      const preview = generateRecipePreview(previewRecipe);

      return {
        success: true,
        message: preview,
        data: previewRecipe,
      };
    }

    // Step 3: Generate embedding for semantic search
    console.log('Generating embedding for recipe...');
    let embedding;
    try {
      const searchText = createRecipeSearchText(extractedRecipe);
      embedding = await generateEmbedding(searchText);
    } catch (embedError) {
      console.error('Error generating embedding:', embedError);
      return {
        success: false,
        message: 'Sorry, I had trouble processing the recipe for search. The recipe might be too long. Try using a shorter version.',
        error: embedError instanceof Error ? embedError.message : 'Embedding failed',
      };
    }

    // Step 4: Save to database
    console.log('Saving recipe to database...');
    if (!supabase) {
      throw new Error('Supabase client not provided');
    }
    
    // Debug: Check if we have an authenticated session
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
    console.log('Auth check - User ID from session:', sessionData?.user?.id);
    console.log('Auth check - User ID we are trying to insert:', userId);
    
    if (!sessionData?.user) {
      return {
        success: false,
        message: 'Authentication session not found. Please try logging out and back in.',
        error: 'No authenticated user in session',
      };
    }
    
    if (sessionData.user.id !== userId) {
      console.error('User ID mismatch!', {
        sessionUserId: sessionData.user.id,
        providedUserId: userId
      });
      return {
        success: false,
        message: 'User authentication mismatch. Please refresh the page and try again.',
        error: 'User ID does not match session',
      };
    }
    
    const { data, error} = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        group_id: activeGroupId,
        title: extractedRecipe.title,
        ingredients: extractedRecipe.ingredients,
        steps: extractedRecipe.steps,
        tags: extractedRecipe.tags,
        source_url: extractedRecipe.source_url || null,
        image_url: null,
        cookbook_name: cookbookName || null,
        cookbook_page: cookbookPage || null,
        contributor_name: contributorName,
        embedding: embedding,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `Database error: ${error.message}. This might happen if the recipe is too large or has invalid data.`,
        error: error.message,
      };
    }

    // Step 5: Generate human-readable summary
    const summary = generateRecipeSummary(data);

    return {
      success: true,
      message: summary,
      data: data,
    };

  } catch (error) {
    console.error('Error in storeRecipe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Sorry, I encountered an error: ${errorMessage}. If the recipe is very long, try shortening it or splitting it into parts.`,
      error: errorMessage,
    };
  }
}

/**
 * Check if message contains actual recipe content or just intent
 */
async function checkForRecipeContent(text: string): Promise<{ has_recipe_content: boolean; reason: string }> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INTENT_CHECK_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    console.log('Recipe content check:', result);
    
    return result;

  } catch (error) {
    console.error('Error checking for recipe content:', error);
    // If check fails, assume it has content and proceed with extraction
    return { has_recipe_content: true, reason: 'Error during check, proceeding with extraction' };
  }
}

/**
 * Extract structured recipe data from text using AI
 */
async function extractRecipeData(text: string): Promise<any> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const extracted = JSON.parse(content);
    console.log('Extracted recipe:', extracted);
    
    // Quality validation: Check for missing quantities
    if (extracted.ingredients && Array.isArray(extracted.ingredients)) {
      const ingredientsWithoutQuantities = extracted.ingredients.filter((ing: string) => {
        // Check if ingredient has a number or common fraction
        return !ing.match(/\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞|1\/2|1\/4|3\/4|1\/3|2\/3|1\/8/);
      });
      
      if (ingredientsWithoutQuantities.length > 0) {
        console.warn('⚠️ Quality Check: Found ingredients without quantities:');
        console.warn(ingredientsWithoutQuantities);
        console.warn(`${ingredientsWithoutQuantities.length}/${extracted.ingredients.length} ingredients missing quantities`);
      } else {
        console.log('✅ Quality Check: All ingredients have quantities');
      }
      
      // Apply auto-tagging to ensure all protein/ingredient categories are tagged
      extracted.tags = mergeAutoTags(extracted.tags || [], extracted.ingredients);
      console.log('Auto-tags applied:', extracted.tags);
    }
    
    return extracted;

  } catch (error) {
    console.error('Error extracting recipe data:', error);
    throw error;
  }
}

/**
 * Generate a detailed preview of the recipe for review
 */
function generateRecipePreview(recipe: Recipe): string {
  const ingredientList = recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n');
  const stepList = recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  const tagList = recipe.tags.join(', ');

  return `📋 **Recipe Preview**

**${recipe.title}**
${recipe.source_url ? `🔗 Source: ${recipe.source_url}` : ''}

🏷️ **Tags:** ${tagList}

📝 **Ingredients** (${recipe.ingredients.length}):
${ingredientList}

👨‍🍳 **Instructions** (${recipe.steps.length}):
${stepList}

---
✅ **Does this look correct?** Click the buttons below to save or cancel.`;
}

/**
 * Generate a human-readable summary of the saved recipe
 */
function generateRecipeSummary(recipe: Recipe): string {
  const ingredientCount = recipe.ingredients.length;
  const stepCount = recipe.steps.length;
  const tagList = recipe.tags.join(', ');

  return `✅ Recipe saved successfully!

**${recipe.title}**

📝 ${ingredientCount} ingredient${ingredientCount !== 1 ? 's' : ''}
👨‍🍳 ${stepCount} step${stepCount !== 1 ? 's' : ''}
🏷️ Tags: ${tagList}

Your recipe has been added to your collection and is now searchable!`;
}


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

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Your job is to extract structured recipe information from user input.

Extract the following fields:
- title: The name of the recipe
- ingredients: Array of ingredient strings (with quantities)
- steps: Array of cooking steps (in order)
- tags: Array of relevant tags (cuisine type, meal type, dietary, main ingredient, etc.)

IMPORTANT RULES:
- Extract ONLY information that is explicitly provided
- Do NOT invent or assume missing information
- If title is missing, use a descriptive name based on ingredients
- If ingredients or steps are incomplete, note that in your response
- Tags should be lowercase and simple (e.g., "italian", "dessert", "chicken", "vegetarian")
- Return valid JSON only

Example output:
{
  "title": "Spaghetti Carbonara",
  "ingredients": ["400g spaghetti", "200g pancetta", "4 eggs", "100g Pecorino cheese", "Black pepper", "Salt"],
  "steps": ["Boil pasta", "Fry pancetta", "Mix eggs and cheese", "Combine with hot pasta", "Serve immediately"],
  "tags": ["pasta", "italian", "dinner", "quick"],
  "incomplete": false
}

If the recipe is incomplete or missing critical information:
{
  "title": "Recipe needs more details",
  "ingredients": [],
  "steps": [],
  "tags": [],
  "incomplete": true,
  "reason": "Missing ingredients and cooking instructions"
}`;

export async function storeRecipe(
  message: string,
  userId: string,
  contributorName: string = 'User',
  supabase?: SupabaseClient
): Promise<AgentResponse> {
  try {
    // Step 0: Check if message contains actual recipe content or just intent
    console.log('Checking if message contains recipe content...');
    const contentCheck = await checkForRecipeContent(message);
    
    if (!contentCheck.has_recipe_content) {
      return {
        success: true,
        message: `Great! I'd love to help you save a recipe. 😊\n\nPlease paste or describe the recipe you'd like to save. Include:\n- **Title** (or I can suggest one)\n- **Ingredients** (with quantities)\n- **Steps** (how to make it)\n- **Tags** (optional - like "italian", "dessert", "quick")\n\nYou can also paste a recipe from a website or just describe it in your own words!`,
      };
    }
    
    console.log('Extracting recipe from message...');
    
    // Step 1: Extract structured recipe data using AI
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
    
    // Step 2: Validate the extraction
    if (extractedRecipe.incomplete) {
      return {
        success: false,
        message: `I couldn't extract a complete recipe from your message. ${extractedRecipe.reason || 'Please provide the recipe title, ingredients, and cooking steps.'}`,
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
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        title: extractedRecipe.title,
        ingredients: extractedRecipe.ingredients,
        steps: extractedRecipe.steps,
        tags: extractedRecipe.tags,
        source_url: extractedRecipe.source_url || null,
        image_url: null,
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
    
    return extracted;

  } catch (error) {
    console.error('Error extracting recipe data:', error);
    throw error;
  }
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


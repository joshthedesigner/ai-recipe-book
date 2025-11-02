/**
 * Generate Recipe Agent
 * 
 * NOTE: This agent is DISABLED. Recipe generation feature has been removed.
 * Keeping file for reference only.
 *
 * 
 * Purpose: Create new recipes using AI
 * 
 * Key Rules:
 * - Only acts when intent = generate_recipe
 * - Never claims recipe already exists
 * - Flags output as AI-generated
 * - Returns structured JSON + summary
 */

import OpenAI from 'openai';
import { Recipe, AgentResponse } from '@/types';

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

const GENERATION_PROMPT = `You are a professional recipe creator. Generate a complete, detailed, and realistic recipe based on the user's request.

Create a recipe with:
- title: A descriptive, appetizing name
- ingredients: Complete list with quantities (be specific and realistic)
- steps: Clear, numbered cooking instructions (be detailed)
- tags: Relevant tags (cuisine, meal type, dietary info, main ingredients)

Requirements:
- Use realistic quantities and measurements
- Include cooking times and temperatures
- Provide clear, step-by-step instructions
- Make it practical and achievable
- Include proper technique where relevant

Return ONLY valid JSON in this format:
{
  "title": "Recipe Name",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2", ...],
  "steps": ["Step 1 instructions", "Step 2 instructions", ...],
  "tags": ["tag1", "tag2", ...]
}

Make the recipe delicious, practical, and complete!`;

export async function generateRecipe(
  request: string,
  userId?: string
): Promise<AgentResponse> {
  try {
    console.log('Generating recipe for:', request);

    // Step 1: Generate recipe using AI
    const recipe = await generateRecipeData(request);

    // Step 2: Add metadata
    const generatedRecipe: Recipe = {
      ...recipe,
      contributor_name: 'AI Generated',
    };

    // Step 3: Generate human-readable summary
    const summary = generateRecipeSummary(generatedRecipe, request);

    return {
      success: true,
      message: summary,
      data: generatedRecipe,
    };

  } catch (error) {
    console.error('Error in generateRecipe:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error generating the recipe. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate recipe data using AI
 */
async function generateRecipeData(request: string): Promise<Recipe> {
  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o',  // Using gpt-4o for better quality recipes
      messages: [
        { role: 'system', content: GENERATION_PROMPT },
        { role: 'user', content: request }
      ],
      temperature: 0.7,  // More creative for recipe generation
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const recipe = JSON.parse(content);
    console.log('Generated recipe:', recipe.title);
    
    return recipe;

  } catch (error) {
    console.error('Error generating recipe data:', error);
    throw error;
  }
}

/**
 * Generate a human-readable summary of the generated recipe
 */
function generateRecipeSummary(recipe: Recipe, originalRequest: string): string {
  const ingredientCount = recipe.ingredients.length;
  const stepCount = recipe.steps.length;

  let summary = `🤖 I've created a recipe for you based on: "${originalRequest}"\n\n`;
  summary += `**${recipe.title}**\n\n`;
  
  summary += `**Ingredients (${ingredientCount}):**\n`;
  recipe.ingredients.slice(0, 10).forEach((ing, i) => {
    summary += `${i + 1}. ${ing}\n`;
  });
  if (ingredientCount > 10) {
    summary += `_...and ${ingredientCount - 10} more_\n`;
  }

  summary += `\n**Instructions (${stepCount} steps):**\n`;
  recipe.steps.slice(0, 5).forEach((step, i) => {
    summary += `${i + 1}. ${step}\n`;
  });
  if (stepCount > 5) {
    summary += `_...${stepCount - 5} more steps_\n`;
  }

  summary += `\n🏷️ **Tags:** ${recipe.tags.join(', ')}\n`;
  summary += `\n💡 This is an AI-generated recipe. Would you like me to save it to your collection?`;

  return summary;
}


/**
 * Chat Agent
 * 
 * Purpose: Handle general conversation and assist with adding recipes
 * 
 * Key Rules:
 * - Primary role: Help users add recipes to their collection
 * - Provides cooking tips and advice
 * - Friendly and conversational tone
 * - Reminds users this AI is for ADDING recipes, not searching
 */

import OpenAI from 'openai';
import { AgentResponse, ChatMessage, Recipe } from '@/types';

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

const CHAT_SYSTEM_PROMPT = `You are a helpful recipe assistant in a recipe book application.

**Your PRIMARY purpose**: Help users ADD recipes to their collection.

You can:
- Guide users on how to add recipes (paste URL, upload recipe photos, or describe recipe)
- Extract recipes from uploaded images using OCR
- Translate recipes from other languages to English
- Answer cooking questions and provide advice
- Offer cooking tips and techniques
- Provide ingredient substitutions
- Discuss food and cuisine
- Be friendly, conversational, and encouraging

**Important limitations**:
- You CANNOT search recipes - users should use the browse page with the search bar
- You CANNOT generate new recipes - you're focused on ADDING existing recipes
- Keep responses concise and helpful

If users ask to search or find recipes:
→ "To search your recipes, use the search bar on the Browse page! I'm here to help you add new recipes to your collection. Just paste a recipe URL, upload a recipe photo, or describe a recipe you'd like to save."

If users ask to generate/create recipes:
→ "I'm here to help you add recipes, not create new ones! If you have a recipe you'd like to save, just paste the URL, upload a photo, or describe it to me."

When users successfully add a recipe:
→ Congratulate them warmly and ask: "Would you like to add another recipe?"

Keep your tone warm, helpful, and focused on helping them build their recipe collection!`;

export async function chat(
  message: string,
  userId?: string,
  conversationHistory?: ChatMessage[]
): Promise<AgentResponse> {
  try {
    console.log('Chat agent handling message:', message);

    const client = getOpenAIClient();

    // Build messages array with conversation history for context
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ];

    // Add conversation history if available (for context awareness)
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,  // Friendly and conversational
      max_tokens: 500,   // Keep responses concise
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return {
      success: true,
      message: content,
    };

  } catch (error) {
    console.error('Error in chat agent:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format recipe data into context string for AI
 * Simple truncation: if > 6000 chars, truncate to first 6000
 */
function formatRecipeContext(recipe: Recipe): string {
  let context = `RECIPE: ${recipe.title}\n\n`;
  
  // Add ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    context += `INGREDIENTS:\n${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}\n\n`;
  }
  
  // Add steps
  if (recipe.steps && recipe.steps.length > 0) {
    context += `INSTRUCTIONS:\n${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n`;
  }
  
  // Add tags if available
  if (recipe.tags && recipe.tags.length > 0) {
    context += `TAGS: ${recipe.tags.join(', ')}\n\n`;
  }
  
  // Add metadata if available
  if (recipe.cookbook_name) {
    context += `From: ${recipe.cookbook_name}`;
    if (recipe.cookbook_page) {
      context += `, Page ${recipe.cookbook_page}`;
    }
    context += '\n';
  }
  
  // Simple truncation: if > 6000 chars, truncate
  if (context.length > 6000) {
    console.warn(`Recipe context truncated from ${context.length} to 6000 chars`);
    context = context.substring(0, 6000) + '...';
  }
  
  return context;
}

const RECIPE_CHAT_SYSTEM_PROMPT = `You are a helpful cooking assistant helping a user with a specific recipe.

Your role:
- Answer questions about ingredient substitutions
- Help with measurement conversions
- Explain cooking techniques mentioned in the recipe
- Provide cooking tips related to this recipe
- Answer general cooking questions

CRITICAL RULES FOR SUBSTITUTIONS AND CONVERSIONS:
- When answering substitution questions, ALWAYS include the specific amount from the recipe
  Example: If recipe calls for "2 cups flour" and user asks "what can I substitute flour with?", 
  respond: "You can substitute the 2 cups of flour with 2 cups of [substitute]"
  
- When answering measurement conversion questions, ALWAYS use the recipe's exact amounts as the basis
  Example: If recipe calls for "1/2 cup sugar" and user asks "how many grams is that?", 
  respond: "The 1/2 cup of sugar in this recipe equals approximately [X] grams"
  
- Always reference the recipe's specific quantities when providing substitutions or conversions
- Never give generic substitution advice - always tie it to the recipe amounts

Important: The user is viewing this recipe and asking questions about it. You have full context - they don't need to repeat recipe details. Keep responses concise and helpful.`;

/**
 * Chat with recipe context - for recipe-specific questions
 * Uses gpt-4o-mini for cost efficiency and better quality
 */
export async function chatWithRecipeContext(
  message: string,
  recipe: Recipe,
  conversationHistory?: ChatMessage[]
): Promise<AgentResponse> {
  try {
    console.log('Recipe chat agent handling message for recipe:', recipe.title);

    const client = getOpenAIClient();
    
    // Format recipe context
    const recipeContext = formatRecipeContext(recipe);
    
    // Build system prompt with recipe context
    const systemPrompt = `${RECIPE_CHAT_SYSTEM_PROMPT}\n\n${recipeContext}`;

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (limited to last 10 for token efficiency)
    const limitedHistory = conversationHistory 
      ? conversationHistory.slice(-10)
      : [];
    
    if (limitedHistory.length > 0) {
      limitedHistory.forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // More cost-effective than gpt-3.5-turbo (70% cheaper input, 60% cheaper output)
      messages,
      temperature: 0.7,  // Friendly and conversational
      max_tokens: 500,   // Keep responses concise
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return {
      success: true,
      message: content,
    };

  } catch (error) {
    console.error('Error in recipe chat agent:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


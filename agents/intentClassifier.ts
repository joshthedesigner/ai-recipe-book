/**
 * Intent Classifier Agent
 * 
 * Purpose: Classifies user messages into one of four intents:
 * - store_recipe: User wants to add/save a recipe
 * - search_recipe: User wants to find existing recipes
 * - generate_recipe: User wants AI to create a new recipe
 * - general_chat: General conversation/cooking advice
 * 
 * Key Rules:
 * - Returns JSON only (intent + confidence)
 * - No actions taken by this agent
 * - Must be confident before routing
 */

import OpenAI from 'openai';
import { IntentClassification, IntentType } from '@/types';

// Lazy-load OpenAI client to ensure env vars are loaded first
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

const SYSTEM_PROMPT = `You are an intent classifier for an AI recipe book application.

Your ONLY job is to classify user messages into ONE of these intents:

1. "store_recipe" - User wants to ADD or SAVE a recipe
   Examples: 
   - "Here's my grandma's lasagna recipe"
   - "Save this recipe: [recipe text]"
   - "Add this to my collection"
   - "I have a recipe to store"

2. "search_recipe" - User wants to FIND recipes OR is asking about ANY recipe
   Examples:
   - "Show me pasta recipes"
   - "Find recipes with chicken"
   - "What desserts do I have?"
   - "Do I have any vegetarian meals?"
   - "Make me miso soup" (search for miso soup)
   - "I want chicken dinner" (search for chicken)
   - "Create a vegan recipe" (search for vegan)
   - "Recipe for chocolate cake" (search for chocolate cake)

3. "general_chat" - General conversation, questions, or cooking advice (NOT recipe requests)
   Examples:
   - "What should I cook this week?"
   - "How do I cook rice?"
   - "Hello"
   - "Thanks!"
   - "What's your name?"

IMPORTANT RULES:
- Return ONLY valid JSON with "intent" and "confidence" (0-1)
- Be very confident in your classification (aim for 0.8+)
- ANY recipe request = "search_recipe" (even if user says "make", "create", "generate")
- Words like "find", "show", "search", "make", "create", "recipe for" = search_recipe
- Words like "save", "add", "here's a recipe" = store_recipe  
- NEVER use "generate_recipe" intent - it's disabled
- When user asks for a recipe, they want to search their collection

Return format:
{
  "intent": "search_recipe",
  "confidence": 0.95
}`;

export async function classifyIntent(message: string): Promise<IntentClassification> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for classification
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      temperature: 0.3, // Low temperature for consistent classification
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const classification = JSON.parse(content) as IntentClassification;

    // Validate the response
    const validIntents: IntentType[] = ['store_recipe', 'search_recipe', 'generate_recipe', 'general_chat'];
    if (!validIntents.includes(classification.intent)) {
      console.error('Invalid intent returned:', classification.intent);
      // Default to general_chat if invalid
      return { intent: 'general_chat', confidence: 0.5 };
    }

    // Ensure confidence is between 0 and 1
    if (classification.confidence < 0 || classification.confidence > 1) {
      classification.confidence = Math.max(0, Math.min(1, classification.confidence));
    }

    console.log('Intent classified:', classification);
    return classification;

  } catch (error) {
    console.error('Error classifying intent:', error);
    // Default to general_chat with low confidence on error
    return {
      intent: 'general_chat',
      confidence: 0.3,
      reasoning: 'Error during classification'
    };
  }
}

// Helper function to determine if confidence is high enough to proceed
export function isConfidentClassification(confidence: number): boolean {
  return confidence >= 0.8;
}

// Helper function to get clarification message
export function getClarificationMessage(message: string, classification: IntentClassification): string {
  const { intent, confidence } = classification;
  
  if (confidence >= 0.8) {
    return ''; // No clarification needed
  }

  // Provide helpful clarification based on likely intent
  const clarifications: Record<IntentType, string> = {
    store_recipe: "I'm not sure if you want to save a recipe. If you'd like to add a recipe to your collection, please say 'save this recipe' or 'here's a recipe to add'.",
    search_recipe: "I'm not sure if you want to search for recipes. If you'd like to find recipes in your collection, please say 'find recipes with [ingredient]' or 'show me [type] recipes'.",
    generate_recipe: "I'm not sure if you want me to create a new recipe. If you'd like me to generate a recipe, please say 'create a recipe for [dish]' or 'make a [type] recipe'.",
    general_chat: "I'm not sure what you'd like to do. You can:\n- Search recipes: 'find pasta recipes'\n- Save a recipe: 'save this recipe: [recipe text]'\n- Generate a recipe: 'create a vegan curry recipe'\n- Ask me anything about cooking!"
  };

  return clarifications[intent] || clarifications.general_chat;
}


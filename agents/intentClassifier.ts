/**
 * Intent Classifier Agent
 * 
 * Purpose: Classifies user messages into one of two intents:
 * - store_recipe: User wants to add/save a recipe
 * - general_chat: General conversation/cooking advice
 * 
 * Key Rules:
 * - Returns JSON only (intent + confidence)
 * - No actions taken by this agent
 * - Must be confident before routing
 * - This AI is focused on ADDING recipes, not searching or generating
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

const SYSTEM_PROMPT = `You are an intent classifier for an AI recipe assistant.

IMPORTANT: This AI is designed to help users ADD recipes to their collection. 
It is NOT for searching recipes or generating new ones.

Your ONLY job is to classify user messages into ONE of these intents:

1. "store_recipe" - User wants to ADD or SAVE a recipe
   Examples: 
   - "Here's my grandma's lasagna recipe"
   - "Save this recipe: [recipe text]"
   - "Add this to my collection"
   - "I have a recipe to store"
   - "https://www.example.com/recipe" (any URL by itself = store)
   - A URL with no other context = store
   - Pasting recipe text = store

2. "general_chat" - General conversation, questions, or cooking advice
   Examples:
   - "What should I cook this week?"
   - "How do I cook rice?"
   - "Hello"
   - "Thanks!"
   - "What's your name?"
   - "Can you help me add a recipe?"
   - "How does this work?"

CRITICAL RULES:
- Return ONLY valid JSON with "intent" and "confidence" (0-1)
- Be very confident in your classification (aim for 0.8+)
- **If message contains ONLY a URL (https://...) = "store_recipe"**
- **URLs = store_recipe**
- Words like "save", "add", "here's a recipe", "paste", "store" = store_recipe  
- This assistant does NOT search or generate recipes - redirect those to general_chat
- When user seems to want search/generate features, classify as general_chat so AI can explain its purpose

Return format:
{
  "intent": "store_recipe",
  "confidence": 0.95
}`;

export async function classifyIntent(message: string): Promise<IntentClassification> {
  try {
    // Quick check: If message is just a URL, it's always store_recipe
    const urlRegex = /^https?:\/\/[^\s]+$/i;
    if (urlRegex.test(message.trim())) {
      return {
        intent: 'store_recipe',
        confidence: 0.99,
      };
    }

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

    // Validate the response - only store_recipe and general_chat are valid
    const validIntents: IntentType[] = ['store_recipe', 'general_chat'];
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
    store_recipe: "I'm not sure if you want to save a recipe. If you'd like to add a recipe to your collection, please paste a recipe URL or say 'here's a recipe to add'.",
    search_recipe: "", // Not used anymore
    general_chat: "I'm not sure what you'd like to do. I'm here to help you add recipes to your collection. You can:\n- Paste a recipe URL\n- Describe a recipe to save\n- Ask me questions about cooking!"
  };

  return clarifications[intent] || clarifications.general_chat;
}


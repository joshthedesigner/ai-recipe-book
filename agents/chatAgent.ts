/**
 * Chat Agent
 * 
 * Purpose: Handle general conversation and cooking advice
 * 
 * Key Rules:
 * - No database access
 * - Provides cooking tips, meal planning, advice
 * - Friendly and conversational tone
 * - Can answer cooking questions
 */

import OpenAI from 'openai';
import { AgentResponse } from '@/types';

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

const CHAT_SYSTEM_PROMPT = `You are a helpful cooking assistant for an AI recipe book application.

Your role:
- Answer cooking questions and provide advice
- Help with meal planning and suggestions
- Offer cooking tips and techniques
- Be friendly, conversational, and encouraging
- Keep responses concise and helpful

You can:
- Explain cooking techniques
- Suggest meal ideas
- Provide ingredient substitutions
- Share cooking tips
- Discuss food and cuisine

You cannot:
- Access the user's recipe database (they need to use search for that)
- Store or save recipes (they need to use the store function)
- Generate full recipes (they need to use the generate function)

If users ask to search, store, or generate recipes, politely remind them:
- "To search your recipes, just ask 'find [ingredient/dish]'"
- "To save a recipe, say 'here's a recipe to add' and paste it"
- "To create a new recipe, say 'make a recipe for [dish]'"

Keep responses warm, helpful, and conversational!`;

export async function chat(
  message: string,
  userId?: string
): Promise<AgentResponse> {
  try {
    console.log('Chat agent handling message:', message);

    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
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


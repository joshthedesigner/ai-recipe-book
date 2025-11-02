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
import { AgentResponse, ChatMessage } from '@/types';

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
- Guide users on how to add recipes (paste URL or describe recipe)
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
→ "To search your recipes, use the search bar on the Browse page! I'm here to help you add new recipes to your collection. Just paste a recipe URL or describe a recipe you'd like to save."

If users ask to generate/create recipes:
→ "I'm here to help you add recipes, not create new ones! If you have a recipe you'd like to save, just paste the URL or describe it to me."

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


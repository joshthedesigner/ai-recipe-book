/**
 * Message Router
 * 
 * Purpose: Routes all user messages to the appropriate agent
 * 
 * Flow:
 * 1. Receive user message
 * 2. Call Intent Classifier
 * 3. Check confidence threshold
 * 4. Route to appropriate agent OR ask for clarification
 * 5. Return response to user
 */

import { 
  classifyIntent, 
  isConfidentClassification, 
  getClarificationMessage 
} from '@/agents/intentClassifier';
import { storeRecipe } from '@/agents/storeRecipe';
import { chat } from '@/agents/chatAgent';
import { ChatResponse, IntentType, ChatMessage } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export async function routeMessage(
  message: string,
  userId?: string,
  supabase?: SupabaseClient,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  try {
    // Step 1: Classify the intent
    console.log('Routing message:', message);
    const classification = await classifyIntent(message);
    const { intent, confidence } = classification;

    console.log(`Intent: ${intent}, Confidence: ${confidence}`);

    // Step 2: Check if confidence is high enough
    if (!isConfidentClassification(confidence)) {
      // Low confidence - ask for clarification
      const clarification = getClarificationMessage(message, classification);
      return {
        message: clarification,
        intent,
        confidence,
        needsClarification: true,
      };
    }

    // Step 3: Route to appropriate agent based on intent (with conversation history)
    const response = await handleIntent(intent, message, userId, supabase, conversationHistory);
    
    return {
      ...response,
      intent,
      confidence,
    };

  } catch (error) {
    console.error('Error routing message:', error);
    return {
      message: 'Sorry, I encountered an error processing your message. Please try again.',
      needsClarification: false,
    };
  }
}

async function handleIntent(
  intent: IntentType,
  message: string,
  userId?: string,
  supabase?: SupabaseClient,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  
  switch (intent) {
    case 'store_recipe':
      return handleStoreRecipe(message, userId, supabase);
    
    case 'general_chat':
      return handleGeneralChat(message, userId, conversationHistory);
    
    // Search and generate are no longer supported - handled by browse UI
    case 'search_recipe':
    case 'generate_recipe':
      console.log(`${intent} request redirected to general chat`);
      return handleGeneralChat(message, userId, conversationHistory);
    
    default:
      return {
        message: 'I\'m not sure how to handle that request.',
        needsClarification: true,
      };
  }
}

// ========================================
// AGENT HANDLERS
// ========================================

async function handleStoreRecipe(
  message: string,
  userId?: string,
  supabase?: SupabaseClient
): Promise<ChatResponse> {
  if (!userId) {
    return {
      message: 'You must be logged in to save recipes.',
      needsClarification: false,
    };
  }
  
  const result = await storeRecipe(message, userId, 'User', supabase, true); // Enable review mode
  
  // Check if the recipe needs review (scraped from URL)
  if (result.success && result.data && result.message.includes('📋 **Recipe Preview**')) {
    return {
      message: result.message,
      pendingRecipe: result.data,
      needsReview: true,
      needsClarification: false,
      // Don't set 'recipe' field - we don't want to display the RecipeCard yet
    };
  }
  
  return {
    message: result.message,
    recipe: result.data,
    needsClarification: false,
  };
}

// Search and generate handlers removed - now handled by browse UI

async function handleGeneralChat(
  message: string,
  userId?: string,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  const result = await chat(message, userId, conversationHistory);
  
  return {
    message: result.message,
    needsClarification: false,
  };
}


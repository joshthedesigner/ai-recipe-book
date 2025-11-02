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
import { searchRecipe } from '@/agents/searchRecipe';
import { generateRecipe } from '@/agents/generateRecipe';
import { chat } from '@/agents/chatAgent';
import { ChatResponse, IntentType } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export async function routeMessage(
  message: string,
  userId?: string,
  supabase?: SupabaseClient
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

    // Step 3: Route to appropriate agent based on intent
    const response = await handleIntent(intent, message, userId, supabase);
    
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
  supabase?: SupabaseClient
): Promise<ChatResponse> {
  
  switch (intent) {
    case 'store_recipe':
      return handleStoreRecipe(message, userId, supabase);
    
    case 'search_recipe':
      return handleSearchRecipe(message, userId);
    
    case 'generate_recipe':
      // Recipe generation is disabled - redirect to search
      console.log('Generate recipe request redirected to search');
      return handleSearchRecipe(message, userId);
    
    case 'general_chat':
      return handleGeneralChat(message, userId);
    
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
  
  const result = await storeRecipe(message, userId, 'User', supabase);
  
  return {
    message: result.message,
    recipe: result.data,
    needsClarification: false,
  };
}

async function handleSearchRecipe(
  message: string,
  userId?: string
): Promise<ChatResponse> {
  const result = await searchRecipe(message, userId);
  
  return {
    message: result.message,
    recipes: result.data,
    needsClarification: false,
  };
}

async function handleGenerateRecipe(
  message: string,
  userId?: string
): Promise<ChatResponse> {
  const result = await generateRecipe(message, userId);
  
  return {
    message: result.message,
    recipe: result.data,
    needsClarification: false,
  };
}

async function handleGeneralChat(
  message: string,
  userId?: string
): Promise<ChatResponse> {
  const result = await chat(message, userId);
  
  return {
    message: result.message,
    needsClarification: false,
  };
}


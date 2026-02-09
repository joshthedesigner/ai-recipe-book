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
    console.log('🎥 [Router] Routing message:', message.substring(0, 100));
    const classification = await classifyIntent(message);
    const { intent, confidence } = classification;

    console.log(`🎥 [Router] Intent classified: ${intent}, Confidence: ${confidence}`);

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
    
    // Search is no longer supported - handled by browse UI
    case 'search_recipe':
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
  console.log('🎥 [Router] handleStoreRecipe called', { userId, messageLength: message.length });
  
  if (!userId) {
    console.log('🎥 [Router] No userId, returning error');
    return {
      message: 'You must be logged in to save recipes.',
      needsClarification: false,
    };
  }
  
  console.log('🎥 [Router] Calling storeRecipe with reviewMode=true');
  const result = await storeRecipe(message, userId, 'User', supabase, true); // Enable review mode
  
  console.log('🎥 [Router] storeRecipe result:', {
    success: result.success,
    hasData: !!result.data,
    messagePreview: result.message.substring(0, 200),
    hasPreview: result.message.includes('📋 **Recipe Preview**'),
    messageLength: result.message.length,
    dataKeys: result.data ? Object.keys(result.data) : null,
    fullResult: result,
  });
  
  // Check if the recipe needs review (scraped from URL)
  if (result.success && result.data && result.message.includes('📋 **Recipe Preview**')) {
    console.log('🎥 [Router] Recipe needs review, returning pendingRecipe');
    return {
      message: result.message,
      pendingRecipe: result.data,
      needsReview: true,
      needsClarification: false,
      // Don't set 'recipe' field - we don't want to display the RecipeCard yet
    };
  }
  
  console.log('🎥 [Router] Recipe does not need review, returning directly');
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


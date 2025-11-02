// Type definitions for the AI Recipe Book

// ========================================
// INTENT TYPES
// ========================================

export type IntentType = 
  | 'store_recipe'      // User wants to add/save a recipe
  | 'search_recipe'     // User wants to find existing recipes
  | 'general_chat';     // General conversation/cooking advice

export interface IntentClassification {
  intent: IntentType;
  confidence: number;    // 0-1 scale
  reasoning?: string;    // Optional explanation for debugging
}

// ========================================
// RECIPE TYPES
// ========================================

export interface Recipe {
  id?: string;
  user_id?: string;
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  source_url?: string | null;
  image_url?: string | null;
  contributor_name: string;
  created_at?: string;
  updated_at?: string;
}

// ========================================
// CHAT TYPES
// ========================================

export interface ChatMessage {
  id?: string;
  user_id?: string;
  message: string;
  role: 'user' | 'assistant';
  created_at?: string;
}

export interface ChatResponse {
  message: string;
  intent?: IntentType;
  confidence?: number;
  recipe?: Recipe;
  recipes?: Recipe[];
  needsClarification?: boolean;
  needsReview?: boolean;           // Recipe needs user review before saving
  pendingRecipe?: Recipe;          // Recipe awaiting confirmation
}

// ========================================
// AGENT TYPES
// ========================================

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// ========================================
// API TYPES
// ========================================

export interface ChatRequest {
  message: string;
  userId?: string;
  confirmRecipe?: Recipe;          // Recipe to confirm and save
  conversationHistory?: ChatMessage[];  // Recent conversation context
}

export interface ChatAPIResponse {
  success: boolean;
  response: ChatResponse;
  error?: string;
}


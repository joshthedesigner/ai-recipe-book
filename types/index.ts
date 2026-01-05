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

export interface RecipeSection {
  title: string;
  ingredients?: string[];
  steps?: string[];
}

export interface Recipe {
  id?: string;
  user_id?: string;
  group_id?: string;
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  source_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  video_platform?: 'youtube' | 'tiktok' | 'instagram' | 'direct' | null;
  cookbook_name?: string | null;
  cookbook_page?: string | null;
  contributor_name: string;
  created_at?: string;
  updated_at?: string;
  friend_name?: string; // Added by feed API for display
  group_name?: string; // Added by feed API for display
  is_new?: boolean; // Added by feed API to indicate new recipe since last view
  sections?: RecipeSection[]; // Optional structured sections when detected
  is_favorite?: boolean; // Whether the current user has favorited this recipe
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
  groupId?: string | null;          // Optional groupId for recipe operations
}

export interface ChatAPIResponse {
  success: boolean;
  response: ChatResponse;
  error?: string;
}

// ========================================
// RECIPE CHAT TYPES
// ========================================

export interface RecipeChatRequest {
  message: string;
  recipeId: string;
  recipe?: Recipe; // Optional - preferred to avoid DB query
  conversationHistory?: ChatMessage[]; // Limited to last 10 messages
}

export interface RecipeChatAPIResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ========================================
// GROUP & PERMISSIONS TYPES
// ========================================

export interface RecipeGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string | null;
  email: string;
  role: 'read' | 'write';
  status: 'active' | 'pending' | 'inactive';
  invited_by: string;
  invited_at: string;
  joined_at?: string | null;
}

export type UserRole = 'owner' | 'write' | 'read' | null;

// ========================================
// RECIPE NOTES TYPES
// ========================================

export interface RecipeNote {
  id: string;
  recipe_id: string;
  user_id: string;
  note_text: string;
  photo_urls: string[];
  recipe_title?: string; // Denormalized from recipes table
  recipe_image_url?: string; // Denormalized from recipes table
  created_at: string;
  updated_at: string;
  user_name?: string; // For feed display
}

// ========================================
// FEED TYPES
// ========================================

export interface FeedItem {
  type: 'recipe' | 'note';
  id: string;
  created_at: string;
  // For notes
  note_text?: string;
  photo_urls?: string[];
  recipe_id?: string;
  recipe_title?: string;
  recipe_image_url?: string;
  user_name?: string;
  // For recipes (existing Recipe fields)
  title?: string;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
  source_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  video_platform?: 'youtube' | 'tiktok' | 'instagram' | 'direct' | null;
  cookbook_name?: string | null;
  cookbook_page?: string | null;
  contributor_name?: string;
  friend_name?: string;
  group_name?: string;
  is_new?: boolean;
}


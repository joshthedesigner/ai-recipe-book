/**
 * Chat History Utilities
 * 
 * Purpose: Save and load chat history from database
 * Provides conversation context for AI
 */

import { ChatMessage } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Save a chat message to the database
 */
export async function saveChatMessage(
  supabase: SupabaseClient,
  userId: string,
  message: string,
  role: 'user' | 'assistant'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        message: message,
        role: role,
      });

    if (error) {
      logger.error('Error saving chat message:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in saveChatMessage:', error);
    return false;
  }
}

/**
 * Load recent chat history for a user
 * Returns most recent N messages
 */
export async function loadChatHistory(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id, user_id, message, role, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error loading chat history:', error);
      return [];
    }

    // Reverse to get chronological order (oldest first)
    return (data || []).reverse();
  } catch (error) {
    logger.error('Error in loadChatHistory:', error);
    return [];
  }
}

/**
 * Get recent conversation context (last N messages)
 * Used to provide context to AI agents
 */
export function getConversationContext(
  messages: ChatMessage[],
  contextLength: number = 10
): ChatMessage[] {
  // Return last N messages for context
  const start = Math.max(0, messages.length - contextLength);
  return messages.slice(start);
}

/**
 * Clear chat history for a user
 */
export async function clearChatHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Error clearing chat history:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in clearChatHistory:', error);
    return false;
  }
}


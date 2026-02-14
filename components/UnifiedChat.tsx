'use client';

/**
 * Unified Chat Component
 * 
 * Context-aware chat that works across the entire app
 * - Browse page: Focuses on adding recipes
 * - Recipe page: Focuses on recipe questions + can add recipes
 * - Single chat instance with different welcome messages
 * - Drawer-style on all devices for consistency
 */

import { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MessageBubble from '@/components/MessageBubble';
import { Recipe, ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UnifiedChatProps {
  open: boolean;
  onClose: () => void;
  // Context props
  context?: 'browse' | 'recipe';
  recipeId?: string;
  recipe?: Recipe;
  onRecipeAdded?: () => void;
}

const getWelcomeMessage = (context: 'browse' | 'recipe', recipe?: Recipe): ChatMessage => {
  if (context === 'browse') {
    return {
      message: `Hi! 👋 I'm your recipe assistant.

I can help you add recipes through:
• URLs from recipe websites
• Photos of recipe cards or cookbook pages
• Raw text - just paste it in

I can also answer any recipe questions you might have!

What would you like to do?`,
      role: 'assistant' as const,
      created_at: new Date().toISOString(),
    };
  }
  
  // Recipe context - personalize with recipe name
  const recipeName = recipe?.title || 'this recipe';
  return {
    message: `Hi! 👋 I'm your recipe assistant, can I assist you with **${recipeName}**?

I can help with:
• Ingredient substitutions
• Measurement conversions
• Cooking techniques and tips
• Recipe modifications
• Answering questions about the recipe

I can also help you add new recipes if you'd like!

What would you like to know?`,
    role: 'assistant' as const,
    created_at: new Date().toISOString(),
  };
};

export default function UnifiedChat({
  open,
  onClose,
  context = 'browse',
  recipeId,
  recipe,
  onRecipeAdded,
}: UnifiedChatProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  const welcomeMessage = getWelcomeMessage(context, recipe);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionState, setExtractionState] = useState<'idle' | 'extracting' | 'reviewing'>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([welcomeMessage]);

  // Reset messages when context or recipe changes
  useEffect(() => {
    const newWelcome = getWelcomeMessage(context, recipe);
    setMessages([newWelcome]);
    conversationHistoryRef.current = [newWelcome];
  }, [context, recipe]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      message: input.trim(),
      role: 'user',
      created_at: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    conversationHistoryRef.current = newMessages;

    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Determine which API endpoint based on context
      const endpoint = context === 'recipe' && recipeId 
        ? '/api/recipe-chat'
        : '/api/chat';

      const body: any = {
        message: userMessage.message,
        conversationHistory: conversationHistoryRef.current.slice(-10),
        userId: user?.id,
      };

      // Add context-specific data
      if (context === 'recipe' && recipeId) {
        body.recipeId = recipeId;
        body.recipe = recipe;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      if (!data.success) {
        throw new Error(data.error || 'Chat request failed');
      }

      // Handle different response types
      let assistantMessage: ChatMessage;

      if (data.response?.needsReview) {
        // Recipe extraction - needs review
        setExtractionState('reviewing');
        assistantMessage = {
          message: data.response.message || data.message,
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
      } else if (data.response?.intent === 'extracting_video') {
        // Video extraction in progress
        setExtractionState('extracting');
        setProgressMessage('Extracting recipe from video...');
        assistantMessage = {
          message: data.response.message || 'Extracting recipe from video...',
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
      } else {
        // Normal message response
        assistantMessage = {
          message: data.message || data.response?.message || 'Sorry, I encountered an error.',
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
      }

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      conversationHistoryRef.current = updatedMessages;

      // If recipe was added, notify parent
      if (data.response?.recipeAdded && onRecipeAdded) {
        setTimeout(() => {
          onRecipeAdded();
        }, 1500);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setExtractionState('idle');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 450,
          maxWidth: '100%',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Recipe Assistant
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} role={msg.role} message={msg.message} />
          ))}
          
          {loading && !progressMessage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Thinking...
              </Typography>
            </Box>
          )}

          {progressMessage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {progressMessage}
              </Typography>
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              context === 'recipe'
                ? 'Ask about this recipe...'
                : 'Add a recipe or ask a question...'
            }
            disabled={loading}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  color="primary"
                >
                  <SendIcon />
                </IconButton>
              ),
            }}
          />
        </Box>
      </Box>
    </Drawer>
  );
}


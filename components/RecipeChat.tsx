'use client';

/**
 * Recipe Chat Component
 * 
 * Floating Action Button (FAB) with chat window for recipe-specific questions
 * - FAB in bottom-right corner with drop shadow
 * - Chat window opens on click (no backdrop, drop shadow, non-blocking)
 * - Full screen on mobile, fixed window on desktop
 * - Recipe-aware: includes full recipe context
 * - Uses same UI patterns as main chat (MessageBubble component)
 * - Uses Portal + Paper for non-blocking floating window
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Fab,
  Badge,
  Paper,
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
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MessageBubble from '@/components/MessageBubble';
import { Recipe, ChatMessage } from '@/types';

interface RecipeChatProps {
  recipeId: string;
  recipe?: Recipe; // Optional - preferred to avoid extra API calls
  // Controlled mode props (optional)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Layout mode: 'inline' for side-by-side column, 'overlay' for floating
  mode?: 'inline' | 'overlay';
}

const INITIAL_MESSAGE: ChatMessage = {
  message: `Hi! 👋 I'm here to help you with this recipe.

I can assist with:
• Ingredient substitutions
• Measurement conversions
• Cooking techniques and tips
• Recipe modifications
• Answering questions about the recipe

What would you like to know?`,
  role: 'assistant',
  created_at: new Date().toISOString(),
};

export default function RecipeChat({ 
  recipeId, 
  recipe: providedRecipe,
  isOpen: controlledIsOpen,
  onOpenChange,
  mode = 'overlay',
}: RecipeChatProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Controlled/uncontrolled pattern
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === 'boolean';
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([INITIAL_MESSAGE]);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Handle SSR - Portal only works client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset unread when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  const handleOpen = () => {
    if (!isControlled) {
      setInternalIsOpen(true);
    }
    onOpenChange?.(true);
    setHasUnread(false);
    // Reset to initial message when opening
    setMessages([INITIAL_MESSAGE]);
    conversationHistoryRef.current = [INITIAL_MESSAGE];
  };

  const handleClose = () => {
    if (!isControlled) {
      setInternalIsOpen(false);
    }
    onOpenChange?.(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      message: input.trim(),
      role: 'user',
    };

    // Add user message immediately (optimistic UI)
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    conversationHistoryRef.current = newMessages;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recipe-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.message,
          recipeId,
          recipe: providedRecipe, // Pass recipe if available
          conversationHistory: conversationHistoryRef.current.slice(-10), // Last 10 messages
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      if (!data.success) {
        throw new Error(data.error || 'Chat request failed');
      }

      const assistantMessage: ChatMessage = {
        message: data.message || 'Sorry, I encountered an error.',
        role: 'assistant',
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      conversationHistoryRef.current = updatedMessages;

      // If chat is closed, mark as unread
      if (!isOpen) {
        setHasUnread(true);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      
      // Remove the user message on error (or keep it and show error state)
      // For now, keep it and show error
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle click outside to close (optional - can be removed if not desired)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        // Check if click is not on the FAB
        const target = event.target as HTMLElement;
        if (!target.closest('.recipe-chat-fab')) {
          handleClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // FAB Button with drop shadow
  const fabButton = (
    <Fab
      color="primary"
      aria-label="Open recipe chat"
      onClick={handleOpen}
      className="recipe-chat-fab"
      sx={{
        position: 'fixed',
        bottom: { xs: 16, sm: 24 },
        right: { xs: 16, sm: 24 },
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <Badge
        badgeContent={hasUnread ? 1 : 0}
        color="error"
        invisible={!hasUnread}
      >
        <ChatBubbleIcon />
      </Badge>
    </Fab>
  );

  // Chat Window Content
  const chatContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        pb: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Recipe Chat
        </Typography>
        <Box>
          <IconButton
            size="small"
            onClick={handleClose}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        p: 3,
      }}>
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            role={msg.role}
            message={msg.message}
            timestamp={msg.created_at}
          />
        ))}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body1" color="text.secondary">
                Thinking...
              </Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'error.light', 
            color: 'error.contrastText',
            borderRadius: 1,
            mb: 3,
          }}>
            <Typography variant="body2">{error}</Typography>
            <Button
              size="small"
              onClick={() => {
                setError(null);
                if (messages.length > 0) {
                  handleSend();
                }
              }}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about this recipe..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          multiline
          maxRows={4}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );

  // Don't render Portal until mounted (SSR safety)
  if (!mounted) {
    return mode === 'overlay' ? fabButton : null;
  }

  // Inline mode: render as a normal in-flow component (no Portal, no FAB)
  if (mode === 'inline') {
    if (!isOpen) return null;
    
    return (
      <Paper
        ref={chatWindowRef}
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-label="Recipe chat"
      >
        {chatContent}
      </Paper>
    );
  }

  // Overlay mode (original behavior)
  // Mobile: Full screen window
  if (isMobile && isOpen) {
    return (
      <>
        {createPortal(
          <Paper
            ref={chatWindowRef}
            elevation={0}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              height: '100dvh', // Use dynamic viewport height - adjusts when keyboard appears
              width: '100vw',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            }}
            role="dialog"
            aria-label="Recipe chat"
          >
            {chatContent}
          </Paper>,
          document.body
        )}
      </>
    );
  }

  // Desktop: Fixed size floating window
  return (
    <>
      {fabButton}
      {isOpen && createPortal(
        <Paper
          ref={chatWindowRef}
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            zIndex: 9999,
            width: '400px',
            height: 'calc(100vh - 150px)',
            maxHeight: '750px',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
          role="dialog"
          aria-label="Recipe chat"
        >
          {chatContent}
        </Paper>,
        document.body
      )}
    </>
  );
}


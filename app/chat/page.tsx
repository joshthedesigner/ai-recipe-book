'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Typography,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TopNav from '@/components/TopNav';
import MessageBubble from '@/components/MessageBubble';
import RecipeCard from '@/components/RecipeCard';
import { ChatResponse, Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/db/supabaseClient';
import { loadChatHistory, saveChatMessage, getConversationContext } from '@/utils/chatHistory';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  chatResponse?: ChatResponse;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      message: 'Hello! I\'m your AI recipe assistant. I can help you:\n\n**Save recipes** - Just paste a recipe or say "save this recipe"\n\n**Find recipes** - Ask me "show me pasta recipes" or "find chicken dishes"\n\n**Cooking advice** - Ask me anything about cooking\n\nWhat would you like to do?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auth protection: redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load chat history from database when user is authenticated
  useEffect(() => {
    async function fetchHistory() {
      if (!user?.id) {
        setLoadingHistory(false);
        return;
      }

      try {
        const history = await loadChatHistory(supabase, user.id, 50);
        
        if (history.length > 0) {
          // Convert database history to message format
          const historyMessages: Message[] = history.map((h) => ({
            id: h.id || Date.now().toString(),
            role: h.role,
            message: h.message,
            timestamp: h.created_at || new Date().toISOString(),
          }));

          // Keep welcome message, add history
          setMessages((prev) => [prev[0], ...historyMessages]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistory();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get conversation context (last 10 messages, excluding welcome message)
      const allMessages = [...messages, userMessage];
      const conversationHistory = getConversationContext(
        allMessages.filter(m => m.id !== '0').map(m => ({
          message: m.message,
          role: m.role,
          user_id: user?.id,
          created_at: m.timestamp,
        })),
        10
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.message,
          userId: user?.id,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: data.response.message,
          timestamp: new Date().toISOString(),
          chatResponse: data.response,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save both messages to database (async, don't block UI)
        if (user?.id) {
          saveChatMessage(supabase, user.id, userMessage.message, 'user');
          saveChatMessage(supabase, user.id, assistantMessage.message, 'assistant');
        }

        // Check if recipe needs review
        if (data.response.needsReview && data.response.pendingRecipe) {
          setPendingRecipe(data.response.pendingRecipe);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: 'Sorry, I encountered an error connecting to the server. Please check your internet connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmRecipe = async () => {
    if (!pendingRecipe || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'confirm',
          userId: user?.id,
          confirmRecipe: pendingRecipe,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: data.response.message,
          timestamp: new Date().toISOString(),
          chatResponse: data.response,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setPendingRecipe(null); // Clear pending recipe
        showToast('Recipe saved successfully! 🎉', 'success');
      } else {
        throw new Error(data.error || 'Failed to save recipe');
      }
    } catch (error) {
      console.error('Error confirming recipe:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: 'Sorry, I encountered an error saving the recipe. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast('Failed to save recipe. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRecipe = () => {
    setPendingRecipe(null);
    const cancelMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      message: 'No problem! Recipe not saved. Is there anything else I can help you with?',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopNav />

      {/* Chat Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ maxWidth: '768px', mx: 'auto', px: 3, py: 4 }}>
          {messages.map((msg) => (
            <Box key={msg.id}>
              <MessageBubble role={msg.role} message={msg.message} timestamp={msg.timestamp} />

              {/* Display recipe if present */}
              {msg.chatResponse?.recipe && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: '600px', width: '100%' }}>
                    <RecipeCard recipe={msg.chatResponse.recipe} />
                  </Box>
                </Box>
              )}

              {/* Display search results if present */}
              {msg.chatResponse?.recipes && msg.chatResponse.recipes.length > 0 && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: '600px', width: '100%' }}>
                    {msg.chatResponse.recipes.slice(0, 3).map((recipe) => (
                      <Box key={recipe.id} sx={{ mb: 1 }}>
                        <RecipeCard recipe={recipe} compact />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ))}

          {/* Recipe Confirmation Buttons */}
          {pendingRecipe && !isLoading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  maxWidth: '600px',
                  width: '100%',
                  display: 'flex',
                  gap: 2,
                }}
              >
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={handleConfirmRecipe}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                  }}
                >
                  Yes, Save Recipe
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CloseIcon />}
                  onClick={handleCancelRecipe}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                  }}
                >
                  No, Cancel
                </Button>
              </Box>
            </Box>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  maxWidth: '600px',
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

          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          p: 2, // 16px padding
        }}
      >
        <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  sx={{
                    bgcolor: input.trim() && !isLoading ? 'primary.main' : 'transparent',
                    color: input.trim() && !isLoading ? 'white' : 'text.disabled',
                    '&:hover': { 
                      bgcolor: input.trim() && !isLoading ? 'primary.dark' : 'transparent',
                    },
                    width: 36,
                    height: 36,
                    mr: -0.5,
                  }}
                >
                  <SendIcon sx={{ fontSize: 20 }} />
                </IconButton>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: '#ffffff',
                borderRadius: '12px',
                p: 1.5, // 12px padding
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                '& fieldset': {
                  borderColor: '#d1d5db',
                },
                '&:hover fieldset': {
                  borderColor: '#9ca3af',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                  boxShadow: '0 0 0 3px rgba(75,156,226,0.1)',
                },
              },
              '& .MuiInputBase-input': {
                fontSize: '16px',
                lineHeight: '24px',
                '&::placeholder': {
                  color: 'text.secondary',
                  opacity: 1,
                },
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}


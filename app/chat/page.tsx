'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Paper,
  CircularProgress,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import TopNav from '@/components/TopNav';
import MessageBubble from '@/components/MessageBubble';
import RecipeCard from '@/components/RecipeCard';
import { ChatResponse } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  chatResponse?: ChatResponse;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      message: 'Hello! I\'m your AI recipe assistant. I can help you:\n\n**Save recipes** - Just paste a recipe or say "save this recipe"\n\n**Find recipes** - Ask me "show me pasta recipes" or "find chicken dishes"\n\n**Generate recipes** - Say "create a vegan curry recipe"\n\n**Cooking advice** - Ask me anything about cooking\n\nWhat would you like to do?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.message,
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
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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


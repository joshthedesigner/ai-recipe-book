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
import ImageIcon from '@mui/icons-material/Image';
import MessageBubble from '@/components/MessageBubble';
import { Recipe, ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';

interface UnifiedChatProps {
  open: boolean;
  onClose: () => void;
  // Context props
  context?: 'browse' | 'recipe';
  recipeId?: string;
  recipe?: Recipe;
  onRecipeAdded?: () => void;
}

interface ImageQueueItem {
  file: File;
  preview: string;
  id: string;
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
  const { showToast } = useToast();
  const { activeGroup } = useGroup();
  
  const welcomeMessage = getWelcomeMessage(context, recipe);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionState, setExtractionState] = useState<'idle' | 'extracting' | 'reviewing'>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([welcomeMessage]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_IMAGES = 5;

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

  // Image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check if adding these files would exceed limit
    const remainingSlots = MAX_IMAGES - imageQueue.length;
    if (remainingSlots === 0) {
      showToast(`Maximum ${MAX_IMAGES} images allowed`, 'warning');
      return;
    }

    // Process each selected file
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: ImageQueueItem = {
          file,
          preview: reader.result as string,
          id: `${Date.now()}-${Math.random()}`,
        };
        setImageQueue((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (filesToAdd.length < files.length) {
      showToast(`Added ${filesToAdd.length} of ${files.length} images (max ${MAX_IMAGES})`, 'info');
    }
  };

  const handleRemoveImage = (id: string) => {
    setImageQueue((prev) => prev.filter((img) => img.id !== id));
  };

  const processImages = async (files: File[]) => {
    setUploadingImage(true);
    setImageQueue([]); // Clear image queue immediately

    // Add user message showing the images
    const userMessage: ChatMessage = {
      message: input.trim() || 'Here are some recipe photos:',
      role: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    conversationHistoryRef.current = [...conversationHistoryRef.current, userMessage];
    setInput('');

    try {
      // Process all images and extract text
      const extractedTexts: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('translate', 'false');

        const response = await fetch('/api/recipes/extract-from-image', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.extractedText) {
          extractedTexts.push(data.extractedText);
        }
      }

      if (extractedTexts.length === 0) {
        throw new Error('Could not extract text from images');
      }

      // Combine all extracted text
      const combinedText = extractedTexts.join('\n\n---\n\n');

      // Send combined text to chat API
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: combinedText,
          conversationHistory: conversationHistoryRef.current.slice(-10),
          userId: user?.id,
          groupId: activeGroup?.id || null,
        }),
      });

      const chatData = await chatResponse.json();

      if (chatData.success) {
        const assistantMessage: ChatMessage = {
          message: chatData.message || chatData.response?.message || 'Recipe extracted successfully!',
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        conversationHistoryRef.current = [...conversationHistoryRef.current, assistantMessage];

        // If recipe was added, notify parent
        if (chatData.response?.recipeAdded && onRecipeAdded) {
          setTimeout(() => {
            onRecipeAdded();
          }, 1500);
        }
      } else {
        throw new Error(chatData.error || 'Failed to process recipe');
      }
    } catch (err) {
      console.error('Error processing images:', err);
      const errorMessage: ChatMessage = {
        message: err instanceof Error ? err.message : 'Sorry, I encountered an error processing the images. Please try again.',
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, errorMessage];
      showToast('Failed to process images. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && imageQueue.length === 0) || loading) return;
    
    // If there are images, process them first
    if (imageQueue.length > 0) {
      await processImages(imageQueue.map(img => img.file));
      return;
    }

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
      sx={{
        zIndex: 10001,
      }}
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
          
          {(loading || uploadingImage) && !progressMessage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {uploadingImage ? 'Processing images...' : 'Thinking...'}
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
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          {/* Image Thumbnails Preview */}
          {imageQueue.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mb: 1.5,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {imageQueue.map((img) => (
                <Box
                  key={img.id}
                  sx={{
                    position: 'relative',
                    width: 60,
                    height: 60,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    component="img"
                    src={img.preview}
                    alt="Preview"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(img.id)}
                    sx={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      width: 20,
                      height: 20,
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
              {imageQueue.length < MAX_IMAGES && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {imageQueue.length}/{MAX_IMAGES} images
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Image Upload Button */}
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingImage || imageQueue.length >= MAX_IMAGES}
              sx={{
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                width: 40,
                height: 40,
              }}
            >
              <ImageIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {/* Text Input */}
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
              disabled={loading || uploadingImage}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleSend}
                    disabled={(!input.trim() && imageQueue.length === 0) || loading || uploadingImage}
                    sx={{
                      bgcolor: (input.trim() || imageQueue.length > 0) && !loading && !uploadingImage ? 'primary.main' : 'transparent',
                      color: (input.trim() || imageQueue.length > 0) && !loading && !uploadingImage ? 'white' : 'text.disabled',
                      '&:hover': { 
                        bgcolor: (input.trim() || imageQueue.length > 0) && !loading && !uploadingImage ? 'primary.dark' : 'transparent',
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
            />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}


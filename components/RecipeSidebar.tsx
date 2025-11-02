'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  TextField,
  IconButton,
  CircularProgress,
  Typography,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import MessageBubble from '@/components/MessageBubble';
import RecipeCard from '@/components/RecipeCard';
import { ChatResponse, Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getConversationContext } from '@/utils/chatHistory';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  chatResponse?: ChatResponse;
}

interface RecipeSidebarProps {
  open: boolean;
  onClose: () => void;
  onRecipeAdded?: () => void;
}

const INITIAL_MESSAGE: Message = {
  id: '0',
  role: 'assistant',
  message: 'Hi! I can help you add recipes. Paste a URL or describe a recipe to get started.',
  timestamp: new Date().toISOString(),
};

export default function RecipeSidebar({ open, onClose, onRecipeAdded }: RecipeSidebarProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingTranslation, setPendingTranslation] = useState<{
    text: string;
    language: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset conversation when sidebar opens
  useEffect(() => {
    if (open) {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setPendingRecipe(null);
      setIsLoading(false);
      setSelectedImage(null);
      setImagePreview(null);
      setPendingTranslation(null);
      setUploadingImage(false);
    }
  }, [open]);

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
          message: '✅ Recipe saved! Would you like to add another?',
          timestamp: new Date().toISOString(),
          chatResponse: data.response,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setPendingRecipe(null);
        showToast('Recipe saved successfully! 🎉', 'success');
        
        // Notify parent to refresh recipe list
        if (onRecipeAdded) {
          onRecipeAdded();
        }
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Process image immediately
      processImage(file);
    }
  };

  const processImage = async (file: File, translate: boolean = false) => {
    setUploadingImage(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: translate ? `[Translating recipe from ${pendingTranslation?.language}...]` : `[Uploaded image: ${file.name}]`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('translate', translate.toString());

      const response = await fetch('/api/recipes/extract-from-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract recipe from image');
      }

      const { raw_text, translated_text, language, language_name, needs_translation } = data.data;

      // If needs translation, ask user
      if (needs_translation) {
        setPendingTranslation({ text: raw_text, language: language_name });
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: `This recipe appears to be in **${language_name}**. Would you like me to translate it to English before saving?`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Process the extracted text (translated or English)
        const textToProcess = translate ? translated_text : raw_text;
        
        // Send extracted text directly to store recipe endpoint with review mode
        const storeResponse = await fetch('/api/recipes/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: textToProcess,
            userId: user?.id,
            reviewMode: true, // Enable review mode for confirmation
          }),
        });

        const storeData = await storeResponse.json();

        if (storeData.success) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            message: storeData.message,
            timestamp: new Date().toISOString(),
            chatResponse: {
              message: storeData.message,
              needsReview: true,
              pendingRecipe: storeData.recipe,
            },
          };

          setMessages((prev) => [...prev, assistantMessage]);

          // Set pending recipe for confirmation
          if (storeData.recipe) {
            setPendingRecipe(storeData.recipe);
          }
        } else {
          throw new Error(storeData.error || 'Failed to process recipe');
        }

        // Clear image state
        setSelectedImage(null);
        setImagePreview(null);
        setPendingTranslation(null);
      }

    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error processing the image. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast('Failed to process image. Please try again.', 'error');
      setSelectedImage(null);
      setImagePreview(null);
      setPendingTranslation(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTranslateYes = () => {
    if (selectedImage && pendingTranslation) {
      processImage(selectedImage, true);
    }
  };

  const handleTranslateNo = () => {
    setPendingTranslation(null);
    setSelectedImage(null);
    setImagePreview(null);
    const cancelMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      message: 'Okay, skipping translation. Feel free to upload another image or paste a recipe!',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: '500px' },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Recipe
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Chat Messages Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
          }}
        >
          {messages.map((msg) => (
            <Box key={msg.id}>
              <MessageBubble role={msg.role} message={msg.message} timestamp={msg.timestamp} />

              {/* Display recipe if present */}
              {msg.chatResponse?.recipe && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{ maxWidth: '100%', width: '100%' }}>
                    <RecipeCard recipe={msg.chatResponse.recipe} />
                  </Box>
                </Box>
              )}
            </Box>
          ))}

          {/* Recipe Confirmation Buttons */}
          {pendingRecipe && !isLoading && !uploadingImage && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
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
          )}

          {/* Translation Confirmation Buttons */}
          {pendingTranslation && !uploadingImage && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckIcon />}
                onClick={handleTranslateYes}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                Yes, Translate
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<CloseIcon />}
                onClick={handleTranslateNo}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                No, Skip
              </Button>
            </Box>
          )}

          {/* Loading indicator */}
          {(isLoading || uploadingImage) && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="body1" color="text.secondary">
                  {uploadingImage ? 'Processing image...' : 'Thinking...'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 3,
              }}
            >
              <Box
                component="img"
                src={imagePreview}
                alt="Recipe preview"
                sx={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            {/* Image Upload Button */}
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadingImage}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                width: 40,
                height: 40,
                mb: 0.25,
              }}
            >
              <ImageIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {/* Text Input */}
            <TextField
              fullWidth
              multiline
              maxRows={5}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading || uploadingImage}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || uploadingImage}
                    sx={{
                      bgcolor: input.trim() && !isLoading && !uploadingImage ? 'primary.main' : 'transparent',
                      color: input.trim() && !isLoading && !uploadingImage ? 'white' : 'text.disabled',
                      '&:hover': { 
                        bgcolor: input.trim() && !isLoading && !uploadingImage ? 'primary.dark' : 'transparent',
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
                p: 1.5,
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
    </Drawer>
  );
}


'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  TextField,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import AppButton from './AppButton';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import MessageBubble from '@/components/MessageBubble';
import RecipeCard from '@/components/RecipeCard';
import { ChatResponse, Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';
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
  message: `Hi there! 👋

I can help you add delicious recipes in a few easy ways:

🍴 Paste a recipe URL
📸 Upload a photo of a recipe
📝 Describe a recipe in your own words

I can even translate recipes from other languages! 🌍

What would you like to add today?`,
  timestamp: new Date().toISOString(),
};

interface ImageQueueItem {
  file: File;
  preview: string;
  id: string;
}

export default function RecipeSidebar({ open, onClose, onRecipeAdded }: RecipeSidebarProps) {
  const { user } = useAuth();
  const { activeGroup } = useGroup();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);
  const [pendingTranslation, setPendingTranslation] = useState<{
    text: string;
    language: string;
    images: File[];
  } | null>(null);
  const [pendingCookbookInfo, setPendingCookbookInfo] = useState<{
    extractedText: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 5;

  // Reset conversation when sidebar opens
  useEffect(() => {
    if (open) {
      setMessages([INITIAL_MESSAGE]);
      setInput('');
      setPendingRecipe(null);
      setIsLoading(false);
      setImageQueue([]);
      setPendingTranslation(null);
      setPendingCookbookInfo(null);
      setUploadingImage(false);
    }
  }, [open]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    // Check if we have either text or images
    if ((!input.trim() && imageQueue.length === 0) || isLoading || uploadingImage) return;

    // If we're waiting for cookbook info, process it
    if (pendingCookbookInfo) {
      await processCookbookInfo(input.trim());
      return;
    }

    // If images are queued, process them
    if (imageQueue.length > 0) {
      await processImages(imageQueue.map(img => img.file));
      return;
    }

    // Otherwise, send text message normally
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
          groupId: activeGroup?.id || null,
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

  const handleClearImages = () => {
    setImageQueue([]);
  };

  const processImages = async (files: File[], translate: boolean = false) => {
    setUploadingImage(true);
    
    // Clear image queue immediately so thumbnails disappear
    setImageQueue([]);

    try {
      // Process all images and extract text
      const extractedTexts: string[] = [];
      let detectedLanguage = 'en';
      let detectedLanguageName = 'English';
      let hasTranslationWarning = false;

      for (const file of files) {
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

        const { raw_text, translated_text, language, language_name, needs_translation, translation_warning } = data.data;

        // Store language from first non-English image
        if (needs_translation && detectedLanguage === 'en') {
          detectedLanguage = language;
          detectedLanguageName = language_name;
        }

        // Store translation warning if present
        if (translation_warning) {
          console.warn('Translation warning:', translation_warning);
          hasTranslationWarning = true;
        }

        // Collect extracted or translated text
        const textToAdd = translate ? translated_text : raw_text;
        extractedTexts.push(textToAdd);
      }

      // Combine all extracted texts
      const combinedText = extractedTexts.join('\n\n---\n\n');

      // If any image needs translation and we haven't translated yet, ask user
      if (detectedLanguage !== 'en' && !translate) {
        setPendingTranslation({ 
          text: combinedText, 
          language: detectedLanguageName,
          images: files,
        });
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: `${files.length > 1 ? 'These recipes appear' : 'This recipe appears'} to be in **${detectedLanguageName}**. Would you like me to translate to English before saving?`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Ask for cookbook information
        setPendingCookbookInfo({ extractedText: combinedText });
        
        let cookbookMessage = 'Great! I extracted the recipe from your photo. 📖';
        
        // Add warning if translation was incomplete
        if (hasTranslationWarning && translate) {
          cookbookMessage += '\n\n⚠️ **Note:** Translation may be incomplete. Please review the recipe carefully before saving.';
        }
        
        cookbookMessage += '\n\nWhich cookbook is this from? Please provide the name and page number.\n\n*Example: "Joy of Cooking, Page 245" or just "Joy of Cooking" if you don\'t know the page.*';
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: cookbookMessage,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

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
      showToast('Failed to process images. Please try again.', 'error');
      setImageQueue([]);
      setPendingTranslation(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const processCookbookInfo = async (userInput: string) => {
    console.log('🟡 processCookbookInfo CALLED', {
      userInput,
      hasPendingCookbookInfo: !!pendingCookbookInfo,
      extractedText: pendingCookbookInfo?.extractedText?.substring(0, 100),
    });
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: userInput,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Parse cookbook name and page from user input
      // Expected format: "Book Name, Page 123" or "Book Name, p123" or just "Book Name"
      let cookbookName = userInput;
      let cookbookPage: string | null = null;

      // Try to extract page number
      const pageMatch = userInput.match(/,\s*(p\.?|page)\s*(\d+)/i);
      if (pageMatch) {
        cookbookPage = pageMatch[2];
        cookbookName = userInput.substring(0, pageMatch.index).trim();
      }

      console.log('🟡 Calling /api/recipes/store with:', {
        cookbookName,
        cookbookPage,
        messageLength: pendingCookbookInfo!.extractedText.length,
        groupId: activeGroup?.id,
      });

      // Store the recipe with cookbook info
      const storeResponse = await fetch('/api/recipes/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: pendingCookbookInfo!.extractedText,
          userId: user?.id,
          reviewMode: true,
          cookbookName: cookbookName || null,
          cookbookPage: cookbookPage || null,
          groupId: activeGroup?.id || null,
        }),
      });

      const storeData = await storeResponse.json();
      
      console.log('🟡 Store API response:', {
        success: storeData.success,
        hasRecipe: !!storeData.recipe,
        error: storeData.error,
      });

      if (storeData.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: '', // No text message, just show the recipe card
          timestamp: new Date().toISOString(),
          chatResponse: {
            message: '',
            needsReview: true,
            pendingRecipe: storeData.recipe,
            recipe: storeData.recipe,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Set pending recipe for confirmation
        if (storeData.recipe) {
          setPendingRecipe(storeData.recipe);
        }

        setPendingCookbookInfo(null);
      } else {
        throw new Error(storeData.error || 'Failed to process recipe');
      }
    } catch (error) {
      console.error('Error processing cookbook info:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast('Failed to save recipe. Please try again.', 'error');
      setPendingCookbookInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslateYes = () => {
    if (pendingTranslation && pendingTranslation.images) {
      processImages(pendingTranslation.images, true);
    }
  };

  const handleTranslateNo = () => {
    setPendingTranslation(null);
    setImageQueue([]);
    const cancelMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      message: 'Okay, skipping translation. Feel free to upload more images or paste a recipe!',
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
              {/* Only show message bubble if there's a message */}
              {msg.message && <MessageBubble role={msg.role} message={msg.message} timestamp={msg.timestamp} />}

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
              <AppButton
                variant="primary"
                startIcon={<CheckIcon />}
                onClick={handleConfirmRecipe}
                sx={{
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                Yes, Save Recipe
              </AppButton>
              <AppButton
                variant="secondary"
                startIcon={<CloseIcon />}
                onClick={handleCancelRecipe}
                sx={{
                  color: 'error.main',
                  borderColor: 'error.main',
                  '&:hover': {
                    borderColor: 'error.dark',
                    backgroundColor: 'rgba(211, 47, 47, 0.04)',
                  },
                }}
              >
                No, Cancel
              </AppButton>
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
              <AppButton
                variant="primary"
                startIcon={<CheckIcon />}
                onClick={handleTranslateYes}
              >
                Yes, Translate
              </AppButton>
              <AppButton
                variant="secondary"
                startIcon={<CloseIcon />}
                onClick={handleTranslateNo}
              >
                No, Skip
              </AppButton>
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
                  {uploadingImage ? `Processing ${imageQueue.length > 1 ? `${imageQueue.length} images` : 'image'}...` : 'Thinking...'}
                </Typography>
              </Box>
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
              disabled={isLoading || uploadingImage || imageQueue.length >= MAX_IMAGES}
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
                    disabled={(!input.trim() && imageQueue.length === 0) || isLoading || uploadingImage}
                    sx={{
                      bgcolor: (input.trim() || imageQueue.length > 0) && !isLoading && !uploadingImage ? 'primary.main' : 'transparent',
                      color: (input.trim() || imageQueue.length > 0) && !isLoading && !uploadingImage ? 'white' : 'text.disabled',
                      '&:hover': { 
                        bgcolor: (input.trim() || imageQueue.length > 0) && !isLoading && !uploadingImage ? 'primary.dark' : 'transparent',
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


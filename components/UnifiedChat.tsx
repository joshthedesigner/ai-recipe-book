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
import CheckIcon from '@mui/icons-material/Check';
import MessageBubble from '@/components/MessageBubble';
import ListWithHeader from '@/components/ListWithHeader';
import RecipeCard from '@/components/RecipeCard';
import AppButton from '@/components/AppButton';
import { Recipe, ChatMessage, ChatResponse } from '@/types';
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
  // Display mode
  mode?: 'drawer' | 'inline'; // drawer = overlay with scrim, inline = on page
}

interface ImageQueueItem {
  file: File;
  preview: string;
  id: string;
}

// Extended message type with photo flow support
interface ExtendedChatMessage extends ChatMessage {
  images?: string[]; // Image preview URLs for display
  listWithHeader?: {
    header?: string;
    items: string[];
  };
  chatResponse?: ChatResponse; // For recipe preview
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
  mode = 'drawer',
}: UnifiedChatProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { showToast } = useToast();
  const { activeGroup } = useGroup();
  
  const welcomeMessage = getWelcomeMessage(context, recipe);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionState, setExtractionState] = useState<'idle' | 'extracting' | 'reviewing'>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [pendingTranslation, setPendingTranslation] = useState<{
    text: string;
    language: string;
    images: File[];
  } | null>(null);
  const [pendingCookbookInfo, setPendingCookbookInfo] = useState<{
    extractedText: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<ExtendedChatMessage[]>([welcomeMessage]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_IMAGES = 5;
  const MAX_CONCURRENT = 3; // Parallel image processing limit

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

  // Translation flow handlers
  const handleTranslateYes = () => {
    if (!pendingTranslation) return;
    // Re-process images with translation
    processImages(pendingTranslation.images, true);
  };

  const handleTranslateNo = () => {
    if (!pendingTranslation) return;
    // Continue with original text
    setPendingCookbookInfo({ extractedText: pendingTranslation.text });
    
    const sourceText = 'Do you want to share a source? You can add a cookbook, friend\'s name, or anything else.';
    const listItems = [
      '*"Joy of Cooking, Page 245" (for cookbooks)*',
      '*"Sarah\'s recipe" (for friends)*',
      '*"Grandma\'s cookbook" (for family recipes)*',
      '*Or just skip by leaving it blank*'
    ];
    
    const assistantMessage: ExtendedChatMessage = {
      message: sourceText,
      role: 'assistant',
      created_at: new Date().toISOString(),
      listWithHeader: {
        header: '*Examples:*',
        items: listItems,
      },
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setPendingTranslation(null);
  };

  // Process cookbook info and store recipe
  const processCookbookInfo = async (userInput: string) => {
    if (!pendingCookbookInfo) return;

    const userMessage: ExtendedChatMessage = {
      message: userInput,
      role: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let cookbookName: string | null = userInput.trim() || null;
      let cookbookPage: string | null = null;

      if (cookbookName) {
        const pageMatch = userInput.match(/,\s*(p\.?|page)\s*(\d+)/i);
        if (pageMatch) {
          cookbookPage = pageMatch[2];
          cookbookName = userInput.substring(0, pageMatch.index).trim();
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const storeResponse = await fetch('/api/recipes/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: pendingCookbookInfo.extractedText,
            userId: user?.id,
            reviewMode: true,
            cookbookName: cookbookName || null,
            cookbookPage: cookbookPage || null,
            groupId: activeGroup?.id || null,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const storeData = await storeResponse.json();

        if (storeData.success && storeData.recipe) {
          const previewMessage: ExtendedChatMessage = {
            message: 'Here\'s your recipe preview:',
            role: 'assistant',
            created_at: new Date().toISOString(),
            chatResponse: {
              message: '',
              needsReview: true,
              pendingRecipe: storeData.recipe,
              recipe: storeData.recipe,
            },
          };
          
          setMessages((prev) => [...prev, previewMessage]);
          setPendingRecipe(storeData.recipe);
          setPendingCookbookInfo(null);
        } else {
          throw new Error(storeData.error || 'Failed to process recipe');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
          throw new Error('Request timed out. The recipe might be too long. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error processing cookbook info:', error);
      const errorMessage: ExtendedChatMessage = {
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast(error instanceof Error ? error.message : 'Failed to save recipe', 'error');
      setPendingCookbookInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Recipe confirmation handlers
  const handleConfirmRecipe = async () => {
    if (!pendingRecipe || loading) return;

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.success) {
          const assistantMessage: ExtendedChatMessage = {
            message: '✅ Recipe saved! Would you like to add another?',
            role: 'assistant',
            created_at: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setPendingRecipe(null);
          
          if (onRecipeAdded) {
            onRecipeAdded();
          }
        } else {
          throw new Error(data.error || 'Failed to save recipe');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error confirming recipe:', error);
      const errorMessage: ExtendedChatMessage = {
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error saving the recipe. Please try again.',
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast('Failed to save recipe. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRecipe = () => {
    setPendingRecipe(null);
    const cancelMessage: ExtendedChatMessage = {
      message: 'No problem! Recipe not saved. Is there anything else I can help you with?',
      role: 'assistant',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  // Copy exact processImages logic from RecipeSidebar - uses all backend features
  const processImages = async (files: File[], translate: boolean = false) => {
    setUploadingImage(true);
    setImageQueue([]); // Clear image queue immediately

    // Add user message with image previews
    const imagePreviews = await Promise.all(
      files.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );

    const userMessage: ExtendedChatMessage = {
      message: input.trim() || 'Here are some recipe photos:',
      role: 'user',
      created_at: new Date().toISOString(),
      images: imagePreviews,
    };
    setMessages((prev) => [...prev, userMessage]);
    conversationHistoryRef.current = [...conversationHistoryRef.current, userMessage];
    setInput('');

    try {
      // Process all images and extract text (using RecipeSidebar logic)
      const extractedTexts: string[] = [];
      let detectedLanguage = 'en';
      let detectedLanguageName = 'English';
      let hasTranslationWarning = false;
      let hasOcrTruncation = false;

      // Process image function (handles individual image)
      const processImage = async (file: File, index: number) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('translate', translate.toString());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const response = await fetch('/api/recipes/extract-from-image', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            if (response.status === 429) {
              throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Image ${index + 1}/${files.length})`);
            } else if (response.status === 413) {
              throw new Error(`Image ${index + 1}/${files.length} is too large. Maximum file size is 10MB.`);
            } else if (response.status === 401) {
              throw new Error('Please log in to process images.');
            } else {
              throw new Error(errorData.error || `Failed to process image ${index + 1}/${files.length}`);
            }
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || `Failed to extract recipe from image ${index + 1}`);
          }

          const { raw_text, translated_text, language, language_name, needs_translation, translation_warning, translation_status, ocr_truncated } = data.data;

          if (!raw_text || raw_text.trim().length === 0) {
            throw new Error(`No text found in image ${index + 1}/${files.length}`);
          }

          if (ocr_truncated) {
            hasOcrTruncation = true;
          }

          if (needs_translation && detectedLanguage === 'en') {
            detectedLanguage = language;
            detectedLanguageName = language_name;
          }

          if (translation_warning) {
            hasTranslationWarning = true;
          }

          const textToAdd = (translate && translation_status === 'completed' && translated_text && translated_text.trim().length > 0)
            ? translated_text 
            : raw_text;
          
          extractedTexts[index] = textToAdd;
          return { success: true, index };
        } catch (imageError) {
          clearTimeout(timeoutId);
          throw imageError;
        }
      };

      // Process images in batches (max 3 concurrent)
      const processBatch = async (batch: { file: File; index: number }[]) => {
        return Promise.allSettled(
          batch.map(({ file, index }) => processImage(file, index))
        );
      };

      const batches: { file: File; index: number }[][] = [];
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        batches.push(
          files.slice(i, i + MAX_CONCURRENT).map((file, batchIndex) => ({
            file,
            index: i + batchIndex,
          }))
        );
      }

      for (const batch of batches) {
        const results = await processBatch(batch);
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          const firstFailure = failures[0];
          if (firstFailure.status === 'rejected') {
            throw firstFailure.reason;
          }
        }
      }

      const combinedText = extractedTexts.filter(Boolean).join('\n\n---\n\n');
      
      if (!combinedText || combinedText.trim().length === 0) {
        throw new Error('No text could be extracted from any of the images');
      }

      // If needs translation and haven't translated yet, ask user
      if (detectedLanguage !== 'en' && !translate) {
        setPendingTranslation({ 
          text: combinedText, 
          language: detectedLanguageName,
          images: files,
        });
        const assistantMessage: ExtendedChatMessage = {
          message: `${files.length > 1 ? 'These recipes appear' : 'This recipe appears'} to be in **${detectedLanguageName}**. Would you like me to translate to English before saving?`,
          role: 'assistant',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Ask for cookbook source information
        setPendingCookbookInfo({ extractedText: combinedText });
        
        let sourceMessage = 'Great! I extracted the recipe from your photo. 📖';
        
        const warnings: string[] = [];
        if (hasOcrTruncation) {
          warnings.push('⚠️ **Note:** Some text may have been cut off due to length limits.');
        }
        if (hasTranslationWarning && translate) {
          warnings.push('⚠️ **Note:** Translation may be incomplete. Please review carefully.');
        }
        if (warnings.length > 0) {
          sourceMessage += '\n\n' + warnings.join('\n\n');
        }
        
        const sourceText = 'Do you want to share a source? You can add a cookbook, friend\'s name, or anything else.';
        const listItems = [
          '*"Joy of Cooking, Page 245" (for cookbooks)*',
          '*"Sarah\'s recipe" (for friends)*',
          '*"Grandma\'s cookbook" (for family recipes)*',
          '*Or just skip by leaving it blank*'
        ];
        
        const assistantMessage: ExtendedChatMessage = {
          message: sourceMessage + '\n\n' + sourceText,
          role: 'assistant',
          created_at: new Date().toISOString(),
          listWithHeader: {
            header: '*Examples:*',
            items: listItems,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setPendingTranslation(null);
      }
    } catch (error) {
      console.error('Error processing images:', error);
      
      let errorMsg = 'Sorry, I encountered an error processing your images. Please try again.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('rate limit')) {
          errorMsg = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('too large')) {
          errorMsg = 'One or more images are too large. Maximum file size is 10MB per image.';
        } else if (errorMessage.includes('no text found')) {
          errorMsg = 'Could not read text from the image. Please try a clearer image.';
        } else if (errorMessage.includes('log in') || errorMessage.includes('unauthorized')) {
          errorMsg = 'Please log in to process images.';
        } else {
          errorMsg = error.message;
        }
      }
      
      const errorMessage: ExtendedChatMessage = {
        message: errorMsg,
        role: 'assistant',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast(errorMsg, 'error');
      setImageQueue([]);
      setPendingTranslation(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && imageQueue.length === 0) || loading || uploadingImage) return;
    
    // If there are images, process them first
    if (imageQueue.length > 0) {
      await processImages(imageQueue.map(img => img.file));
      return;
    }

    // If waiting for cookbook info, process it
    if (pendingCookbookInfo) {
      await processCookbookInfo(input);
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

  // Content wrapper - same content for both modes
  const chatContent = (
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
            <Box key={idx}>
              <MessageBubble 
                role={msg.role} 
                message={msg.message}
                images={msg.images}
              >
                {msg.listWithHeader && (
                  <ListWithHeader
                    header={msg.listWithHeader.header}
                    items={msg.listWithHeader.items}
                  />
                )}
              </MessageBubble>
              
              {/* Show recipe card preview when available */}
              {msg.chatResponse?.recipe && (
                <Box sx={{ mb: 2, mt: 2 }}>
                  <RecipeCard recipe={msg.chatResponse.recipe} />
                </Box>
              )}
            </Box>
          ))}

          {/* Translation Confirmation Buttons */}
          {pendingTranslation && !uploadingImage && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                mb: 2,
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

          {/* Recipe Preview Confirmation Buttons */}
          {pendingRecipe && !loading && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  gap: 2,
                }}
              >
                <AppButton
                  variant="primary"
                  startIcon={<CheckIcon />}
                  onClick={handleConfirmRecipe}
                  disabled={loading}
                >
                  Yes, Save Recipe
                </AppButton>
                <AppButton
                  variant="secondary"
                  startIcon={<CloseIcon />}
                  onClick={handleCancelRecipe}
                  disabled={loading}
                >
                  No, Cancel
                </AppButton>
              </Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  display: 'block',
                  mt: 1,
                }}
              >
                Drafted by AI. Human review advised.
              </Typography>
            </Box>
          )}
          
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
    );

  // Render based on mode
  if (mode === 'inline') {
    // Inline mode - shown on page, no drawer/scrim
    if (!open) return null;
    
    return (
      <Box
        sx={{
          width: 450,
          maxWidth: '100%',
          height: '100%',
          borderLeft: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {chatContent}
      </Box>
    );
  }

  // Drawer mode - overlay with scrim (default)
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
      {chatContent}
    </Drawer>
  );
}


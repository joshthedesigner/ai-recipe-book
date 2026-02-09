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
import ListWithHeader from '@/components/ListWithHeader';
import RecipeCard from '@/components/RecipeCard';
import { ChatResponse, Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';
import { getConversationContext } from '@/utils/chatHistory';
import { isYouTubeUrl } from '@/utils/youtubeHelpers';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  chatResponse?: ChatResponse;
  listWithHeader?: {
    header?: string;
    items: string[];
  }; // Optional list with header component props
  images?: string[]; // Optional array of image preview URLs (data URLs)
}

interface RecipeSidebarProps {
  open: boolean;
  onClose: () => void;
  onRecipeAdded?: () => void;
}

// Animated dots component for loading states
const AnimatedDots = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <Box component="span">{dots}</Box>;
};

const INITIAL_MESSAGE: Message = {
  id: '0',
  role: 'assistant',
  message: `Hi there! 👋

I can help you add delicious recipes in a few easy ways:

🍴 Paste a recipe URL
📸 Upload a photo of a recipe
📝 Copy and paste a recipe

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
  const [processingStep, setProcessingStep] = useState<'fetching' | 'extracting' | 'processing' | 'saving' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_IMAGES = 5;

  // Helper function to get progress message
  const getProgressMessage = (step: 'fetching' | 'extracting' | 'processing' | 'saving'): string => {
    switch (step) {
      case 'fetching':
        return 'Fetching video';
      case 'extracting':
        return 'Extracting recipe';
      case 'processing':
        return 'Processing';
      case 'saving':
        return 'Saving recipe';
      default:
        return 'Thinking';
    }
  };

  // Helper function to start progress updates
  const startProgressUpdates = () => {
    // Clear any existing timeout
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
    }

    // Start with fetching
    setProcessingStep('fetching');

    // Move to extracting after 10 seconds (covers YouTube API calls)
    progressTimeoutRef.current = setTimeout(() => {
      setProcessingStep('extracting');
      
      // Move to processing after 15 more seconds (covers OpenAI transcript extraction)
      progressTimeoutRef.current = setTimeout(() => {
        setProcessingStep('processing');
        
        // Move to saving after 5 more seconds (covers embedding generation)
        progressTimeoutRef.current = setTimeout(() => {
          setProcessingStep('saving');
        }, 5000);
      }, 15000);
    }, 10000);
  };

  // Helper function to stop progress updates
  const stopProgressUpdates = () => {
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
    setProcessingStep(null);
  };

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
      setProcessingStep(null);
      // Clear any pending progress timeouts
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
        progressTimeoutRef.current = null;
      }
    }
  }, [open]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    // If we're waiting for source info, allow empty input to skip
    if (pendingCookbookInfo) {
      await processCookbookInfo(input.trim());
      return;
    }


    // Check if we have either text or images
    if ((!input.trim() && imageQueue.length === 0) || isLoading || uploadingImage) return;

    // If images are queued, add them as user message and then process
    if (imageQueue.length > 0) {
      const imagePreviews = imageQueue.map(img => img.preview);
      
      // Create user message with images
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        message: input.trim() || '', // Include any text input with the image
        timestamp: new Date().toISOString(),
        images: imagePreviews,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput(''); // Clear input after adding message
      
      // Process images
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

    // Check if this is a YouTube URL and start progress updates
    const isYouTube = isYouTubeUrl(input.trim());
    if (isYouTube) {
      console.log('🎥 [RecipeSidebar] YouTube URL detected:', input.trim());
      startProgressUpdates();
    }

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

      console.log('🎥 [RecipeSidebar] Sending message to /api/chat', {
        isYouTube,
        messageLength: userMessage.message.length,
        userId: user?.id,
      });

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

      console.log('🎥 [RecipeSidebar] Received response from /api/chat', {
        status: response.status,
        ok: response.ok,
      });

      const data = await response.json();

      console.log('🎥 [RecipeSidebar] Response data:', {
        success: data.success,
        hasNeedsReview: !!data.response?.needsReview,
        hasPendingRecipe: !!data.response?.pendingRecipe,
        intent: data.response?.intent,
        error: data.error,
        messagePreview: data.response?.message?.substring(0, 200),
        hasPreviewMarker: data.response?.message?.includes('📋 **Recipe Preview**'),
        fullResponse: data.response,
      });

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
      stopProgressUpdates();
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
      // Add timeout to confirmation request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
          throw new Error('Request timed out. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error confirming recipe:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error saving the recipe. Please try again.',
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
      let hasOcrTruncation = false;

      // Process images in parallel with concurrency limit (max 3 at a time)
      const MAX_CONCURRENT = 3;
      const processImage = async (file: File, index: number) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('translate', translate.toString());

        // Add timeout to fetch (45 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const response = await fetch('/api/recipes/extract-from-image', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          // Handle HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            if (response.status === 429) {
              throw new Error(`Rate limit exceeded. Please wait a moment and try again. (Image ${index + 1}/${files.length})`);
            } else if (response.status === 413) {
              throw new Error(`Image ${index + 1}/${files.length} is too large. Maximum file size is 10MB.`);
            } else if (response.status === 504) {
              throw new Error(`Request timed out for image ${index + 1}/${files.length}. The image might be too large.`);
            } else if (response.status >= 500) {
              throw new Error(`Server error processing image ${index + 1}/${files.length}. Please try again.`);
            } else {
              throw new Error(errorData.error || `Failed to process image ${index + 1}/${files.length}`);
            }
          }

          const data = await response.json();

          if (!data.success) {
            // Provide more specific error messages
            const errorMsg = data.error || 'Failed to extract recipe from image';
            if (errorMsg.includes('rate limit')) {
              throw new Error(`Rate limit exceeded for image ${index + 1}/${files.length}. Please wait and try again.`);
            } else if (errorMsg.includes('too large') || errorMsg.includes('file size')) {
              throw new Error(`Image ${index + 1}/${files.length} is too large. Maximum size is 10MB.`);
            } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
              throw new Error(`Request timed out for image ${index + 1}/${files.length}. Please try a smaller image.`);
            } else {
              throw new Error(`Error processing image ${index + 1}/${files.length}: ${errorMsg}`);
            }
          }

          const { raw_text, translated_text, language, language_name, needs_translation, translation_warning, translation_status, ocr_truncated } = data.data;

          // Validate that we have text data
          if (!raw_text || raw_text.trim().length === 0) {
            throw new Error(`No text found in image ${index + 1}/${files.length}. Please ensure the image contains readable text.`);
          }

          // Track OCR truncation
          if (ocr_truncated) {
            hasOcrTruncation = true;
            console.warn(`OCR truncation detected for image ${index + 1}`);
          }

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
          // Fix: Only use translated text if status is 'completed', otherwise use raw_text
          // If translation_status is 'failed', we should NOT use translated_text even if it exists
          const textToAdd = (translate && translation_status === 'completed' && translated_text && translated_text.trim().length > 0)
            ? translated_text 
            : raw_text;
          
          // Store results in correct order by index
          extractedTexts[index] = textToAdd;
          
          // Update shared state variables (these need to be handled carefully in parallel)
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

          return { success: true, index };
        } catch (imageError) {
          clearTimeout(timeoutId);
          
          // Handle timeout specifically
          if (imageError instanceof Error && (imageError.name === 'AbortError' || imageError.message.includes('timeout'))) {
            throw new Error(`Request timed out for image ${index + 1}/${files.length}. Please try a smaller image.`);
          }
          
          // Handle errors for individual images
          console.error(`Error processing image ${index + 1}/${files.length}:`, imageError);
          
          const errorMessage = imageError instanceof Error 
            ? imageError.message 
            : `Failed to process image ${index + 1}/${files.length}`;
          
          throw new Error(errorMessage);
        }
      };

      // Process images in batches with concurrency limit
      const processBatch = async (batch: { file: File; index: number }[]) => {
        return Promise.allSettled(
          batch.map(({ file, index }) => processImage(file, index))
        );
      };

      // Split files into batches
      const batches: { file: File; index: number }[][] = [];
      for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
        batches.push(
          files.slice(i, i + MAX_CONCURRENT).map((file, batchIndex) => ({
            file,
            index: i + batchIndex,
          }))
        );
      }

      // Process batches sequentially, but images within batch in parallel
      for (const batch of batches) {
        const results = await processBatch(batch);
        
        // Check for failures in this batch
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          const firstFailure = failures[0];
          if (firstFailure.status === 'rejected') {
            const error = firstFailure.reason;
            throw new Error(error?.message || 'Failed to process one or more images');
          }
        }
      }

      // Combine all extracted texts (filter out undefined entries from parallel processing)
      const combinedText = extractedTexts.filter(Boolean).join('\n\n---\n\n');
      
      // Validate we have at least some text
      if (!combinedText || combinedText.trim().length === 0) {
        throw new Error('No text could be extracted from any of the images. Please try clearer images.');
      }

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
        // Ask for source information
        setPendingCookbookInfo({ extractedText: combinedText });
        
        let sourceMessage = 'Great! I extracted the recipe from your photo. 📖';
        
        // Add warnings if needed
        const warnings: string[] = [];
        if (hasOcrTruncation) {
          warnings.push('⚠️ **Note:** Some text may have been cut off due to length limits.');
        }
        if (hasTranslationWarning && translate) {
          warnings.push('⚠️ **Note:** Translation may be incomplete. Please review the recipe carefully before saving.');
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
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: sourceMessage + '\n\n' + sourceText,
          timestamp: new Date().toISOString(),
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
      
      // Provide user-friendly error messages
      let errorMsg = 'Sorry, I encountered an error processing your images. Please try again.';
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('rate limit')) {
          errorMsg = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('too large') || errorMessage.includes('file size')) {
          errorMsg = 'One or more images are too large. Maximum file size is 10MB per image.';
        } else if (errorMessage.includes('no text found') || errorMessage.includes('unclear')) {
          errorMsg = 'Could not read text from the image. Please try a clearer image with better lighting.';
        } else if (errorMessage.includes('translation')) {
          errorMsg = 'Image processed successfully, but translation failed. Showing original text.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else {
          // Use the actual error message if it's user-friendly
          errorMsg = error.message;
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: errorMsg,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast(errorMsg, 'error');
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
      // Parse source name and optional page number from user input
      // Expected formats:
      // - "Book Name, Page 123" or "Book Name, p123" (for cookbooks with pages)
      // - "Friend's Name" or "Sarah's recipe" (for friends/family)
      // - Any other source description
      let cookbookName: string | null = userInput.trim() || null;
      let cookbookPage: string | null = null;

      // If input is empty, skip source
      if (!cookbookName) {
        cookbookName = null;
      } else {
        // Try to extract page number (only if it looks like a cookbook format)
      const pageMatch = userInput.match(/,\s*(p\.?|page)\s*(\d+)/i);
      if (pageMatch) {
        cookbookPage = pageMatch[2];
        cookbookName = userInput.substring(0, pageMatch.index).trim();
        }
      }

      console.log('🟡 Calling /api/recipes/store with:', {
        cookbookName,
        cookbookPage,
        messageLength: pendingCookbookInfo!.extractedText.length,
        groupId: activeGroup?.id,
      });

      // Validate extracted text before sending
      if (!pendingCookbookInfo?.extractedText || pendingCookbookInfo.extractedText.trim().length === 0) {
        throw new Error('No recipe text available. Please try uploading the image again.');
      }

      const extractedText = pendingCookbookInfo.extractedText;
      const MAX_MESSAGE_LENGTH = 50000;
      if (extractedText.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Recipe text is too long (${extractedText.length} characters). Maximum is ${MAX_MESSAGE_LENGTH} characters.`);
      }

      // Store the recipe with cookbook info (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const storeResponse = await fetch('/api/recipes/store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: extractedText,
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
      
      console.log('🟡 Store API response:', {
        success: storeData.success,
        hasRecipe: !!storeData.recipe,
        error: storeData.error,
      });

      if (storeData.success) {
        console.log('🟢 Store success! Recipe:', storeData.recipe);
        
        // Show recipe preview directly
        if (storeData.recipe) {
          const previewMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            message: 'Here\'s your recipe preview:',
            timestamp: new Date().toISOString(),
            chatResponse: {
              message: '',
              needsReview: true,
              pendingRecipe: storeData.recipe,
              recipe: storeData.recipe,
            },
          };
          
          setMessages((prev) => [...prev, previewMessage]);
          setPendingRecipe(storeData.recipe);
        } else {
          console.warn('⚠️ No recipe in response!');
        }

        setPendingCookbookInfo(null);
        } else {
          console.error('🔴 Store failed:', storeData.error);
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast(error instanceof Error ? error.message : 'Failed to save recipe. Please try again.', 'error');
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
              {/* Only show message bubble if there's a message, images, or list with header */}
              {(msg.message || msg.images || msg.listWithHeader) && (
                <MessageBubble 
                  role={msg.role} 
                  message={msg.message} 
                  timestamp={msg.timestamp}
                  images={msg.images}
                >
                  {msg.listWithHeader && (
                    <ListWithHeader 
                      header={msg.listWithHeader.header}
                      items={msg.listWithHeader.items}
                    />
                  )}
                </MessageBubble>
              )}


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
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  mb: 1.5,
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
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  display: 'block',
                }}
              >
                Drafted by AI. Human review advised.
              </Typography>
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
                  {uploadingImage 
                    ? `Processing ${imageQueue.length > 1 ? `${imageQueue.length} images` : 'image'}...`
                    : processingStep
                    ? (
                        <>
                          {getProgressMessage(processingStep)}
                          <AnimatedDots />
                        </>
                      )
                    : 'Thinking...'}
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


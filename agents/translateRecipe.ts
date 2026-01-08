/**
 * Translation Agent
 * 
 * Purpose: Translate recipe text with validation and error recovery
 * 
 * Key Features:
 * - Recipe-aware translation prompts
 * - Step count validation
 * - Automatic retry if content is missing
 * - Clear warnings for incomplete translations
 */

import OpenAI from 'openai';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  warning?: string;
}

/**
 * Count cooking steps in recipe text
 * Looks for common step patterns: "1.", "Step 1", numbered lines
 */
function countSteps(text: string): number {
  // Pattern 1: Lines starting with digits followed by period or parenthesis
  const numberedSteps = text.match(/^\s*\d+[\.)]/gm);
  
  // Pattern 2: "Step N" patterns
  const stepKeywords = text.match(/\bstep\s+\d+/gi);
  
  // Pattern 3: Japanese/Chinese step patterns (第N步, Nつ目)
  const asianSteps = text.match(/[第]\d+[步]/g) || text.match(/\d+[つ]\s*[目め]/g);
  
  // Return the highest count (most reliable indicator)
  const counts = [
    numberedSteps?.length || 0,
    stepKeywords?.length || 0,
    asianSteps?.length || 0,
  ];
  
  return Math.max(...counts);
}

/**
 * Translate recipe with validation and retry
 */
export async function translateRecipe(
  originalText: string,
  sourceLanguage: string,
  targetLanguage: string = 'en'
): Promise<TranslationResult> {
  try {
    const client = getOpenAIClient();
    
    // Count steps in original
    const originalStepCount = countSteps(originalText);
    console.log(`Original recipe has ${originalStepCount} detected steps`);

    // First translation attempt
    console.log(`Translating from ${sourceLanguage} to ${targetLanguage}...`);
    
    const translationPrompt = `Translate this complete recipe from ${sourceLanguage} to ${targetLanguage}.

CRITICAL RULES:
- Preserve ALL cooking steps, ingredients, measurements, and notes
- Maintain original structure and numbering
- Do not skip, summarize, or combine any sections
- Keep all quantities exact (e.g., "200g" stays "200g", not "about 200g")
- Preserve cooking temperatures and times exactly

Return ONLY the translated text, no explanations or comments.`;

    // Validate input text
    if (!originalText || originalText.trim().length === 0) {
      throw new Error('Original text is empty or invalid');
    }

    // Check text length (rough estimate: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(originalText.length / 4);
    if (estimatedTokens > 100000) {
      throw new Error('Recipe text is too long to translate');
    }

    let response;
    try {
      response = await client.chat.completions.create({
        model: 'gpt-4o', // Upgraded from gpt-4o-mini for better translation quality
        messages: [
          {
            role: 'system',
            content: translationPrompt,
          },
          {
            role: 'user',
            content: originalText,
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });
    } catch (apiError: any) {
      // Re-throw with more context for better error handling
      if (apiError?.status === 429) {
        throw new Error('rate limit: Translation service is rate limited');
      } else if (apiError?.status === 401 || apiError?.status === 403) {
        throw new Error('API key: Authentication failed');
      } else if (apiError?.code === 'ECONNABORTED' || apiError?.message?.includes('timeout')) {
        throw new Error('timeout: Translation request timed out');
      }
      throw apiError;
    }

    // Validate response
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('Invalid response from translation service');
    }

    let translatedText = response.choices[0].message?.content?.trim();
    
    if (!translatedText || translatedText.length === 0) {
      throw new Error('Translation returned empty result');
    }

    // Fallback to original if translation is suspiciously short (likely truncated or failed)
    if (translatedText.length < originalText.length * 0.1) {
      console.warn('Translation result suspiciously short, may be incomplete');
    }

    let translatedStepCount = countSteps(translatedText);
    
    console.log(`First translation has ${translatedStepCount} detected steps`);

    // If step count doesn't match and we have steps, retry with explicit instruction
    if (originalStepCount > 0 && translatedStepCount < originalStepCount) {
      console.log(`Step count mismatch (${translatedStepCount}/${originalStepCount}), retrying...`);
      
      const retryPrompt = `Your previous translation was incomplete. 

The original recipe has ${originalStepCount} cooking steps, but your translation only included ${translatedStepCount} steps.

Please re-translate the COMPLETE recipe, ensuring ALL ${originalStepCount} steps are included. Do not skip or summarize any steps.

Original text to translate:`;

      try {
        response = await client.chat.completions.create({
          model: 'gpt-4o', // Upgraded from gpt-4o-mini for better translation quality
          messages: [
            {
              role: 'system',
              content: translationPrompt,
            },
            {
              role: 'user',
              content: retryPrompt,
            },
            {
              role: 'user',
              content: originalText,
            },
          ],
          temperature: 0.3,
          max_tokens: 2500,
        });

        const retryTranslatedText = response.choices[0].message?.content?.trim();
        if (retryTranslatedText && retryTranslatedText.length > 0) {
          translatedText = retryTranslatedText;
        } else {
          console.warn('Retry translation returned empty, keeping first attempt');
        }
      } catch (retryError) {
        console.warn('Retry translation failed, using first attempt:', retryError);
        // Keep the first translation attempt if retry fails
      }

      translatedStepCount = countSteps(translatedText);
      
      console.log(`Retry translation has ${translatedStepCount} detected steps`);
    }

    // Final validation
    const isComplete = originalStepCount === 0 || translatedStepCount >= originalStepCount;
    
    if (!isComplete) {
      return {
        success: true,
        translatedText,
        warning: `Translation may be incomplete. Expected ${originalStepCount} steps but found ${translatedStepCount}. Please review carefully.`,
      };
    }

    return {
      success: true,
      translatedText,
    };

  } catch (error) {
    console.error('Error translating recipe:', error);
    
    // Handle specific OpenAI API errors
    if (error instanceof Error) {
      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return {
          success: false,
          translatedText: originalText,
          warning: 'Translation service is temporarily busy. Please try again in a moment. Showing original text.',
        };
      }
      
      // Invalid API key or authentication errors
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('OpenAI API authentication error:', error.message);
        return {
          success: false,
          translatedText: originalText,
          warning: 'Translation service configuration error. Showing original text.',
        };
      }
      
      // Network or timeout errors
      if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('ECONNRESET')) {
        return {
          success: false,
          translatedText: originalText,
          warning: 'Translation request timed out. Please try again. Showing original text.',
        };
      }
      
      // Token limit or content too long
      if (error.message.includes('token') || error.message.includes('length') || error.message.includes('too long')) {
        return {
          success: false,
          translatedText: originalText,
          warning: 'Recipe text is too long to translate. Showing original text.',
        };
      }
    }
    
    // Generic fallback for unknown errors
    return {
      success: false,
      translatedText: originalText,
      warning: 'Translation failed. Showing original text.',
    };
  }
}


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
  
  // Pattern 2: "Step N" patterns (case insensitive)
  const stepKeywords = text.match(/\bstep\s+\d+/gi);
  
  // Pattern 3: Japanese/Chinese step patterns (第N步, Nつ目)
  const asianSteps = text.match(/[第]\d+[步]/g) || text.match(/\d+[つ]\s*[目め]/g);
  
  // Pattern 4: Dash/bullet numbered steps (1-, 2-, etc.)
  const dashNumbered = text.match(/^\s*\d+\s*[-–—]/gm);
  
  // Pattern 5: Parentheses numbered steps in middle of line (1) (2) etc
  const parenSteps = text.match(/\s\(\d+\)\s/g);
  
  // Pattern 6: Instructions with line breaks (more lines = more steps)
  // Only count if we have clear separators
  const linesWithContent = text.split(/\n\s*\n/).filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 20 && !trimmed.match(/^(ingredients?|materials?|serves|prep| cook)/i);
  });
  
  // Return the highest count (most reliable indicator)
  const counts = [
    numberedSteps?.length || 0,
    stepKeywords?.length || 0,
    asianSteps?.length || 0,
    dashNumbered?.length || 0,
    parenSteps?.length || 0,
    linesWithContent.length, // Fallback for recipes without clear numbering
  ];
  
  const maxCount = Math.max(...counts);
  console.log(`Step count detection - patterns found: numbered=${numberedSteps?.length || 0}, keywords=${stepKeywords?.length || 0}, dashes=${dashNumbered?.length || 0}, parens=${parenSteps?.length || 0}, lines=${linesWithContent.length}, max=${maxCount}`);
  
  return maxCount;
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
        max_tokens: 4000, // Increased from 2500 to handle longer recipes without truncation
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

    // Check if response was truncated due to token limit
    const finishReason = response.choices[0].finish_reason;
    if (finishReason === 'length') {
      console.warn('⚠️ Translation was truncated due to token limit (max_tokens reached)');
      // We'll handle this in the retry logic with higher max_tokens
    }

    let translatedText = response.choices[0].message?.content?.trim();
    
    if (!translatedText || translatedText.length === 0) {
      throw new Error('Translation returned empty result');
    }

    let translatedStepCount = countSteps(translatedText);
    
    console.log(`First translation has ${translatedStepCount} detected steps`);

    // Retry if:
    // 1. Step count doesn't match, OR
    // 2. Response was truncated (finish_reason === 'length'), OR
    // 3. Translation is significantly shorter (less than 50% of original)
    const translationRatio = translatedText.length / originalText.length;
    const wasTruncated = finishReason === 'length';
    const isTooShort = translationRatio < 0.5;
    const stepCountMismatch = originalStepCount > 0 && translatedStepCount < originalStepCount;

    // Log warning if suspicious
    if (translationRatio < 0.1) {
      console.warn('Translation result suspiciously short, may be incomplete');
    } else if (wasTruncated || isTooShort || stepCountMismatch) {
      console.warn(`Translation may be incomplete: finish_reason=${finishReason}, ratio=${translationRatio.toFixed(2)}, steps=${translatedStepCount}/${originalStepCount}`);
    }

    if (stepCountMismatch || wasTruncated || isTooShort) {
      let retryReason = '';
      if (wasTruncated) {
        retryReason = 'truncated';
        console.log(`Translation was truncated (finish_reason=length), retrying with higher token limit...`);
      } else if (stepCountMismatch) {
        retryReason = 'step count mismatch';
        console.log(`Step count mismatch (${translatedStepCount}/${originalStepCount}), retrying...`);
      } else if (isTooShort) {
        retryReason = 'too short';
        console.log(`Translation too short (${Math.round(translationRatio * 100)}% of original), retrying...`);
      }
      
      let retryPrompt = '';
      if (wasTruncated) {
        retryPrompt = `Your previous translation was cut off due to length limits. Please translate the COMPLETE recipe from start to finish. Include every single step, ingredient, and instruction. Do not stop early.`;
      } else if (stepCountMismatch) {
        retryPrompt = `Your previous translation was incomplete. The original recipe has ${originalStepCount} cooking steps, but your translation only included ${translatedStepCount} steps. Please re-translate the COMPLETE recipe, ensuring ALL ${originalStepCount} steps are included.`;
      } else if (isTooShort) {
        retryPrompt = `Your previous translation was too short (only ${Math.round(translationRatio * 100)}% of original length). Please translate the COMPLETE recipe with all details, steps, and ingredients included.`;
      } else {
        retryPrompt = `Please re-translate the COMPLETE recipe, ensuring nothing is missing.`;
      }

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
          max_tokens: 6000, // Significantly increased for retry to prevent truncation
        });

        const retryFinishReason = response.choices[0].finish_reason;
        const retryTranslatedText = response.choices[0].message?.content?.trim();
        
        if (retryTranslatedText && retryTranslatedText.length > 0) {
          // Only use retry if it's better (more steps or longer)
          const retryStepCount = countSteps(retryTranslatedText);
          const retryRatio = retryTranslatedText.length / originalText.length;
          
          // Use retry if it's clearly better (more steps or significantly longer)
          // Always use retry if it wasn't truncated but original was
          const retryIsBetter = retryStepCount > translatedStepCount || 
                               (retryStepCount >= translatedStepCount && retryRatio > translationRatio + 0.1) ||
                               (wasTruncated && retryFinishReason !== 'length');
          
          if (retryIsBetter) {
            translatedText = retryTranslatedText;
            translatedStepCount = retryStepCount;
            console.log(`✅ Retry translation is better: ${retryStepCount} steps (was ${translatedStepCount}), ${Math.round(retryRatio * 100)}% length (was ${Math.round(translationRatio * 100)}%)`);
          } else {
            console.warn(`Retry translation not better, keeping first attempt (retry: ${retryStepCount} steps/${Math.round(retryRatio * 100)}% vs original: ${translatedStepCount} steps/${Math.round(translationRatio * 100)}%)`);
          }
          
          if (retryFinishReason === 'length') {
            console.warn('⚠️ Retry translation also truncated - recipe may be very long');
          }
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


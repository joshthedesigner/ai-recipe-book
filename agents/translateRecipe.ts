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

    let response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
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

    let translatedText = response.choices[0].message.content || originalText;
    let translatedStepCount = countSteps(translatedText);
    
    console.log(`First translation has ${translatedStepCount} detected steps`);

    // If step count doesn't match and we have steps, retry with explicit instruction
    if (originalStepCount > 0 && translatedStepCount < originalStepCount) {
      console.log(`Step count mismatch (${translatedStepCount}/${originalStepCount}), retrying...`);
      
      const retryPrompt = `Your previous translation was incomplete. 

The original recipe has ${originalStepCount} cooking steps, but your translation only included ${translatedStepCount} steps.

Please re-translate the COMPLETE recipe, ensuring ALL ${originalStepCount} steps are included. Do not skip or summarize any steps.

Original text to translate:`;

      response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
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

      translatedText = response.choices[0].message.content || translatedText;
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
    return {
      success: false,
      translatedText: originalText,
      warning: 'Translation failed. Showing original text.',
    };
  }
}


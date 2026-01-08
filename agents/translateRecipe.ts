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

🚫 CRITICAL PROHIBITIONS:
- DO NOT summarize, condense, or shorten any content
- DO NOT combine multiple steps into one
- DO NOT skip any ingredients, steps, or instructions
- DO NOT add explanatory text or translations in parentheses
- DO NOT paraphrase - translate directly and literally
- DO NOT change the recipe structure or format

✅ PRESERVATION RULES:

MEASUREMENTS & QUANTITIES:
- Keep ALL numbers and units EXACTLY as written: "200g" → "200g" (NOT "200 grams" or "about 200g")
- Preserve fractions precisely: "1/2 cup" → "1/2 cup" (NOT "half cup")
- Maintain temperature formats: "180°C" → "180°C" (or "350°F" if converted, but keep number exact)
- Keep time formats: "15 minutes" stays "15 minutes" (NOT "about 15 minutes")
- Preserve ranges: "3-4 minutes" → "3-4 minutes"
- Keep percentages: "50% humidity" → "50% humidity"

RECIPE STRUCTURE:
- Maintain original section order (title, ingredients, steps, notes)
- Preserve all formatting: line breaks, numbering, bullet points
- Keep original numbering system (1, 2, 3... or Step 1, Step 2...)
- Preserve ingredient list structure (one per line or bullet format)
- Maintain any subsections or categories

INGREDIENTS:
- Translate ingredient names naturally but keep measurements exact
- Preserve preparation notes: "1 large onion, diced" → "1 large onion, diced"
- Keep optional ingredients marked: "(optional)" stays "(optional)"
- Preserve brand names or specific varieties if mentioned
- Maintain ingredient order as in original

COOKING INSTRUCTIONS:
- Translate technique names accurately (simmer, sauté, braise, etc.)
- Preserve all timing information: "for 10 minutes" → "for 10 minutes"
- Keep temperature references exact: "at 350°F" → "at 350°F"
- Maintain cooking cues: "until golden brown" → "until golden brown"
- Preserve serving suggestions if present

📝 OUTPUT REQUIREMENTS:
- Return ONLY the translated recipe text
- No explanations, comments, or notes about the translation
- No markdown formatting unless present in original
- Maintain the same text structure as the original`;

    let response = await client.chat.completions.create({
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

    let translatedText = response.choices[0].message.content || originalText;
    let translatedStepCount = countSteps(translatedText);
    
    console.log(`First translation has ${translatedStepCount} detected steps`);

    // If step count doesn't match and we have steps, retry with explicit instruction
    if (originalStepCount > 0 && translatedStepCount < originalStepCount) {
      console.log(`Step count mismatch (${translatedStepCount}/${originalStepCount}), retrying...`);
      
      const retryPrompt = `Your previous translation was incomplete. 

The original recipe has ${originalStepCount} cooking steps, but your translation only included ${translatedStepCount} steps.

🚫 CRITICAL: You MUST include ALL ${originalStepCount} steps. Do NOT:
- Skip any steps
- Summarize or combine steps
- Condense multiple steps into one

✅ You MUST:
- Translate every single step individually
- Preserve all measurements, times, and temperatures exactly
- Maintain the original structure and numbering
- Include every ingredient and instruction

Please re-translate the COMPLETE recipe with ALL ${originalStepCount} steps included.

Original text to translate:`;

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


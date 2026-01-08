import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { translateRecipe } from '@/agents/translateRecipe';
import { createClient } from '@/db/supabaseServer';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

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

// Convert image buffer to base64
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

// Preprocess image: resize if too large, convert to JPG
async function preprocessImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    let imageBuffer = buffer;
    
    // Convert HEIC to JPG
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      console.log('Converting HEIC to JPG...');
      // Use sharp to convert (sharp now supports HEIC)
      imageBuffer = await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const size = imageBuffer.length;

    console.log(`Image: ${width}x${height}, ${(size / 1024 / 1024).toFixed(2)}MB`);

    // Resize if too large (over 8MB or over 3000px width)
    const MAX_SIZE_MB = 8;
    const MAX_WIDTH = 3000;
    
    if (size > MAX_SIZE_MB * 1024 * 1024 || width > MAX_WIDTH) {
      console.log('Compressing image...');
      
      const targetWidth = width > MAX_WIDTH ? MAX_WIDTH : width;
      
      imageBuffer = await sharp(imageBuffer)
        .resize(targetWidth, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const newSize = imageBuffer.length;
      console.log(`Compressed: ${(newSize / 1024 / 1024).toFixed(2)}MB`);
    }

    return { buffer: imageBuffer, mimeType: 'image/jpeg' };
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw new Error('Failed to process image. Please try a different format.');
  }
}

// Extract text from image using OpenAI Vision
async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<{ text: string; wasTruncated: boolean }> {
  try {
    const client = getOpenAIClient();
    
    // Validate buffer size before base64 encoding
    const MAX_BASE64_SIZE = 20 * 1024 * 1024; // 20MB base64 limit (roughly 15MB original)
    const estimatedBase64Size = Math.ceil(imageBuffer.length * 1.33);
    if (estimatedBase64Size > MAX_BASE64_SIZE) {
      throw new Error('Image is too large to process. Please use a smaller image.');
    }
    
    // Convert to base64
    const base64Image = bufferToBase64(imageBuffer);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log('🔍 Calling Vision API with image:', {
      mimeType,
      imageSize: imageBuffer.length,
      base64Length: base64Image.length,
    });

    // Add timeout using Promise.race
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Vision API request timed out after 30 seconds')), 30000);
    });

    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `What text do you see in this image? Include all numbers, measurements, and details. List everything you can read.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 3000,
        }),
        timeoutPromise,
      ]);

      const finishReason = response.choices[0].finish_reason;
      const wasTruncated = finishReason === 'length';

      console.log('🔍 Vision API response:', {
        model: response.model,
        finishReason,
        wasTruncated,
        contentLength: response.choices[0].message.content?.length,
        contentPreview: response.choices[0].message.content?.substring(0, 150),
      });

      const extractedText = response.choices[0].message.content;
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text found in image');
      }

      // Check if model refused
      if (extractedText.toLowerCase().includes("i'm unable to") || 
          extractedText.toLowerCase().includes("i cannot") ||
          extractedText.toLowerCase().includes("i can't")) {
        console.error('🔴 Vision API REFUSED to extract text:', extractedText);
        throw new Error('Vision API refused to process this image. The image might be unclear or contain unsupported content.');
      }

      if (wasTruncated) {
        console.warn('⚠️ Vision API response was truncated due to token limit');
      }

      console.log('✅ Text extracted successfully, length:', extractedText.length);
      return { text: extractedText, wasTruncated };
    } catch (apiError: any) {
      // Re-throw with more context
      if (apiError?.message?.includes('timed out')) {
        throw new Error('Vision API request timed out. The image might be too large or complex. Please try a smaller image.');
      } else if (apiError?.status === 429) {
        throw new Error('Vision API rate limit exceeded. Please wait a moment and try again.');
      } else if (apiError?.status === 400) {
        throw new Error('Invalid image format or size. Please try a different image.');
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error extracting text from image:', error);
    
    if (error instanceof Error) {
      // Preserve specific error messages
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw error;
      } else if (error.message.includes('rate limit')) {
        throw error;
      } else if (error.message.includes('too large')) {
        throw error;
      }
    }
    
    throw new Error('This image might be too low resolution or text is unclear. Try a sharper or better-lit image.');
  }
}

// Detect language of text
async function detectLanguage(text: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    // Add timeout using Promise.race
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Language detection timed out')), 10000);
    });

    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Detect the language of the provided text. Return ONLY the language code (e.g., "en", "es", "fr", "zh", "ja", "ko", etc.). Return "en" for English.',
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3,
          max_tokens: 10,
        }),
        timeoutPromise,
      ]);

      const languageCode = response.choices[0].message.content?.trim().toLowerCase() || 'en';
      return languageCode;
    } catch (apiError: any) {
      if (apiError?.message?.includes('timed out')) {
        console.warn('Language detection timed out, defaulting to English');
        return 'en';
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error detecting language:', error);
    // Default to English on error rather than 'unknown'
    return 'en';
  }
}

// Get language name from code
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
    th: 'Thai',
    vi: 'Vietnamese',
  };
  return languages[code] || code.toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication first
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in to process images.' },
        { status: 401 }
      );
    }

    // Check rate limit (5 requests per minute per user - image processing is expensive)
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.imageExtract,
      user.id,
      'image-extract' // Endpoint identifier to separate from other endpoints
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const shouldTranslate = formData.get('translate') === 'true';

    // File validation constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file size BEFORE processing (prevents DoS)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file size is not zero
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      );
    }

    // Validate MIME type (basic check, will validate with actual file content later)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    console.log('Processing image:', sanitizedFilename, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate actual file content using sharp (prevents MIME type spoofing)
    try {
      const metadata = await sharp(buffer).metadata();
      // Sharp will throw if it's not a valid image
      if (!metadata.format || !['jpeg', 'png', 'heic', 'heif'].includes(metadata.format)) {
        return NextResponse.json(
          { success: false, error: 'File is not a valid image format' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'File is not a valid image or is corrupted' },
        { status: 400 }
      );
    }

    // Preprocess image (convert HEIC, resize if needed)
    let processedBuffer: Buffer;
    let mimeType: string;
    try {
      const preprocessResult = await preprocessImage(buffer, file.type);
      processedBuffer = preprocessResult.buffer;
      mimeType = preprocessResult.mimeType;
    } catch (preprocessError) {
      console.error('Image preprocessing failed:', preprocessError);
      return NextResponse.json(
        { 
          success: false, 
          error: preprocessError instanceof Error 
            ? preprocessError.message 
            : 'Failed to process image. Please try a different format or smaller image.' 
        },
        { status: 400 }
      );
    }

    // Extract text using OCR
    let extractedText: string;
    let ocrWasTruncated: boolean;
    try {
      const ocrResult = await extractTextFromImage(processedBuffer, mimeType);
      extractedText = ocrResult.text;
      ocrWasTruncated = ocrResult.wasTruncated;
    } catch (ocrError) {
      console.error('OCR extraction failed:', ocrError);
      return NextResponse.json(
        { 
          success: false, 
          error: ocrError instanceof Error 
            ? ocrError.message 
            : 'Failed to extract text from image. Please try a clearer image.' 
        },
        { status: 500 }
      );
    }

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No text found in image. Please ensure the image contains readable text.' },
        { status: 400 }
      );
    }

    // Detect language
    let languageCode: string;
    try {
      languageCode = await detectLanguage(extractedText);
    } catch (langError) {
      console.error('Language detection failed:', langError);
      // Default to English on error
      languageCode = 'en';
    }
    
    const languageName = getLanguageName(languageCode);
    console.log(`Detected language: ${languageName} (${languageCode})`);

    // If not English and translation requested, translate using translation agent
    let finalText = extractedText;
    let translationStatus = 'none';
    let translationWarning: string | undefined;
    
    // Add OCR truncation warning if applicable
    if (ocrWasTruncated) {
      translationWarning = 'Note: Some text may have been cut off due to length limits.';
    }

    if (languageCode !== 'en' && shouldTranslate) {
      console.log('Translating to English using translation agent...');
      
      try {
        // Validate extracted text before translation
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('No text extracted from image to translate');
        }

        const result = await translateRecipe(extractedText, languageName, 'English');
        
        if (result.success) {
          // Validate translation result before using it
          if (result.translatedText && result.translatedText.trim().length > 0) {
            finalText = result.translatedText;
            translationStatus = 'completed';
            
            if (result.warning) {
              translationWarning = result.warning;
              console.warn('Translation warning:', result.warning);
            }
          } else {
            // Translation returned empty, keep original
            translationStatus = 'failed';
            translationWarning = 'Translation returned empty result. Showing original text.';
            console.error('Translation returned empty text');
          }
        } else {
          // Translation failed, keep original
          translationStatus = 'failed';
          translationWarning = result.warning || 'Translation failed. Showing original text.';
          console.error('Translation failed:', result.warning);
        }
      } catch (translationError) {
        // Handle unexpected errors during translation
        console.error('Unexpected error during translation:', translationError);
        translationStatus = 'failed';
        translationWarning = translationError instanceof Error 
          ? `Translation error: ${translationError.message}. Showing original text.`
          : 'An unexpected error occurred during translation. Showing original text.';
        // Continue with original text - don't fail the entire request
      }
    } else if (languageCode !== 'en') {
      translationStatus = 'requested';
    }

    // Return response with rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return NextResponse.json({
      success: true,
      data: {
        raw_text: extractedText,
        translated_text: finalText,
        language: languageCode,
        language_name: languageName,
        translation_status: translationStatus,
        translation_warning: translationWarning,
        needs_translation: languageCode !== 'en' && !shouldTranslate,
        ocr_truncated: ocrWasTruncated,
      },
    }, {
      headers,
    });

  } catch (error) {
    console.error('Error processing image:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('timeout')) {
        return NextResponse.json(
          { success: false, error: 'Request timed out. The image might be too large. Please try a smaller image.' },
          { status: 504 }
        );
      } else if (errorMsg.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        );
      } else if (errorMsg.includes('too large') || errorMsg.includes('file size')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      } else if (errorMsg.includes('unauthorized') || errorMsg.includes('auth')) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed. Please log in again.' },
          { status: 401 }
        );
      }
    }
    
    // Fallback to generic error handler
    return errorResponse(error);
  }
}


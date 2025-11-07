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
async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    // Convert to base64
    const base64Image = bufferToBase64(imageBuffer);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text from this recipe image with COMPLETE ACCURACY and MAXIMUM detail.

CRITICAL - Pay special attention to:
• Ingredient QUANTITIES (1, 2, 3, etc.)
• MEASUREMENTS (cups, tablespoons, teaspoons, grams, ounces, pounds)
• FRACTIONS (1/2, 1/4, 3/4, 1/3, 2/3, etc.)
• Cooking TIMES (minutes, hours, seconds)
• Cooking TEMPERATURES (350°F, 180°C, medium heat, etc.)
• Precise amounts and units

Read carefully - small text matters! Capture every number, measurement, and detail.

Return the COMPLETE text exactly as written, preserving original formatting and language. Do not summarize, shorten, or modify anything.`,
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
    });

    const extractedText = response.choices[0].message.content;
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text found in image');
    }

    return extractedText;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('This image might be too low resolution or text is unclear. Try a sharper or better-lit image.');
  }
}

// Detect language of text
async function detectLanguage(text: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    const response = await client.chat.completions.create({
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
    });

    const languageCode = response.choices[0].message.content?.trim().toLowerCase() || 'en';
    return languageCode;
  } catch (error) {
    console.error('Error detecting language:', error);
    return 'unknown';
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
      user.id
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
    const { buffer: processedBuffer, mimeType } = await preprocessImage(buffer, file.type);

    // Extract text using OCR
    const extractedText = await extractTextFromImage(processedBuffer, mimeType);

    // Detect language
    const languageCode = await detectLanguage(extractedText);
    const languageName = getLanguageName(languageCode);

    console.log(`Detected language: ${languageName} (${languageCode})`);

    // If not English and translation requested, translate using translation agent
    let finalText = extractedText;
    let translationStatus = 'none';
    let translationWarning: string | undefined;

    if (languageCode !== 'en' && shouldTranslate) {
      console.log('Translating to English using translation agent...');
      
      const result = await translateRecipe(extractedText, languageName, 'English');
      
      if (result.success) {
        finalText = result.translatedText;
        translationStatus = 'completed';
        
        if (result.warning) {
          translationWarning = result.warning;
          console.warn('Translation warning:', result.warning);
        }
      } else {
        // Translation failed, keep original
        translationWarning = result.warning || 'Translation failed';
        console.error('Translation failed:', result.warning);
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
      },
    }, {
      headers,
    });

  } catch (error) {
    console.error('Error processing image:', error);
          return errorResponse(error);
  }
}


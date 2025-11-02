import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';

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
              text: 'Extract all text from this recipe image. Return ONLY the text you see, preserving the original formatting and language. Do not translate or modify anything.',
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
      max_tokens: 2000,
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
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const shouldTranslate = formData.get('translate') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('Processing image:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Preprocess image (convert HEIC, resize if needed)
    const { buffer: processedBuffer, mimeType } = await preprocessImage(buffer, file.type);

    // Extract text using OCR
    const extractedText = await extractTextFromImage(processedBuffer, mimeType);

    // Detect language
    const languageCode = await detectLanguage(extractedText);
    const languageName = getLanguageName(languageCode);

    console.log(`Detected language: ${languageName} (${languageCode})`);

    // If not English and translation requested, translate
    let finalText = extractedText;
    let translationStatus = 'none';

    if (languageCode !== 'en' && shouldTranslate) {
      console.log('Translating to English...');
      const client = getOpenAIClient();
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Translate the following recipe text to English. Preserve the structure and all details. Return ONLY the translated text.',
          },
          {
            role: 'user',
            content: extractedText,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      finalText = response.choices[0].message.content || extractedText;
      translationStatus = 'completed';
    } else if (languageCode !== 'en') {
      translationStatus = 'requested';
    }

    return NextResponse.json({
      success: true,
      data: {
        raw_text: extractedText,
        translated_text: finalText,
        language: languageCode,
        language_name: languageName,
        translation_status: translationStatus,
        needs_translation: languageCode !== 'en' && !shouldTranslate,
      },
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process image',
      },
      { status: 500 }
    );
  }
}


/**
 * Recipe Scraper Utility
 * 
 * Extracts recipe data from URLs using:
 * 1. Schema.org structured data (fast, reliable)
 * 2. OpenAI parsing fallback (slower, works on any site)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { mergeAutoTags } from './autoTag';

interface ScrapedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  source_url: string;
  image_url?: string;
  sections?: Array<{ title: string; ingredients?: string[]; steps?: string[] }>;
}

/**
 * Strip HTML tags and decode HTML entities from a string
 */
function stripHtml(text: string): string {
  // FIRST: Decode HTML entities (in case they're encoded like &lt;p&gt;)
  const decoded = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // SECOND: Remove HTML tags (now that entities are decoded to actual < >)
  const withoutTags = decoded.replace(/<[^>]*>/g, '');
  
  return withoutTags.trim();
}

/**
 * Clean recipe text by removing unwanted Unicode characters (checkboxes, bullets, etc.)
 * Used for ingredients and steps to ensure clean data
 */
function cleanRecipeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let cleaned = text.trim();
  
  // Remove common Unicode checkbox/bullet characters
  // U+25A2 (▢), U+2610 (☐), U+2611 (☑), U+2612 (☒), U+2713 (✓), U+2714 (✔)
  // U+25A1 (□), U+25AA (▪), U+2022 (•), U+25E6 (◦)
  cleaned = cleaned.replace(/[▢☐☑☒✓✔□▪•◦]/g, '');
  
  // Normalize whitespace (multiple spaces → single space)
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

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

/**
 * Detect if message contains a URL
 */
export function containsURL(text: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return urlRegex.test(text);
}

/**
 * Extract URL from message
 */
export function extractURL(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

/**
 * Validate if a step is a real cooking instruction
 */
function isValidCookingStep(step: string): boolean {
  // Filter out common non-cooking steps
  const invalidPatterns = [
    /gather.*ingredients/i,
    /read.*recipe/i,
    /^now,?\s+gather/i,
    /^in\s+\w+,\s+we\s+use/i, // "In Japan, we use..."
    /^for\s+this\s+recipe/i,
    /^i\s+(focus|encourage)/i,
    /^however,\s+if\s+you/i,
    /click.*to.*rate/i,
    /see.*notes/i,
    /^note:/i,
    /^tip:/i,
  ];
  
  if (invalidPatterns.some(pattern => pattern.test(step))) {
    return false;
  }
  
  // Must have cooking-related words
  const cookingWords = [
    'cook', 'heat', 'add', 'mix', 'stir', 'chop', 'cut', 'slice', 'dice',
    'boil', 'simmer', 'bake', 'fry', 'saute', 'season', 'pour', 'place',
    'remove', 'drain', 'serve', 'combine', 'whisk', 'blend', 'grill',
    'roast', 'toast', 'spread', 'layer', 'cover', 'refrigerate'
  ];
  
  const stepLower = step.toLowerCase();
  const hasVerb = cookingWords.some(verb => stepLower.includes(verb));
  
  // Real cooking steps are usually longer than 20 chars
  return hasVerb && step.length > 20;
}

/**
 * Parse steps directly from HTML (fallback)
 */
function parseStepsFromHTML($: cheerio.CheerioAPI): string[] {
  // Common CSS selectors for recipe steps
  const selectors = [
    '.recipe-steps li',
    '.instructions li',
    'ol.recipe-instructions li',
    '[itemprop="recipeInstructions"] li',
    '.wprm-recipe-instruction-text',
    '.tasty-recipes-instructions li',
    '.mv-create-instructions li',
    '.step',
    '.instruction-step',
    '.recipe-directions li',
  ];
  
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      const steps = elements
        .map((i, el) => $(el).text().trim())
        .get()
        .filter((step: string) => step.length > 20); // Filter short non-steps
      
      if (steps.length >= 3) {
        console.log(`Found ${steps.length} steps using selector: ${selector}`);
        return steps;
      }
    }
  }
  
  return [];
}

/**
 * Extract steps using OpenAI (last resort)
 */
async function extractStepsWithAI(html: string, title: string): Promise<string[]> {
  const client = getOpenAIClient();

  // Strip HTML and get readable text
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  // Truncate if too long
  const truncatedText = text.substring(0, 8000);

  const prompt = `Extract ONLY the cooking steps/instructions from this recipe webpage.
Ignore: ingredient lists, prep notes, background stories, "gather ingredients", tips sections.
Return ONLY valid JSON array of step strings.

Recipe title: "${title}"

Webpage text:
${truncatedText}

Return format: ["step 1", "step 2", "step 3"]`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  return parsed.steps || [];
}

/**
 * Apply auto-tagging to a scraped recipe
 */
async function applyAutoTags(recipe: ScrapedRecipe): Promise<ScrapedRecipe> {
  return {
    ...recipe,
    tags: await mergeAutoTags(recipe.tags, recipe.ingredients, recipe.title, recipe.steps),
  };
}

/**
 * Condense recipe steps using AI
 * Makes steps more concise while preserving critical information
 */
async function condenseSteps(steps: string[]): Promise<string[]> {
  const client = getOpenAIClient();

  const prompt = `Rewrite these recipe steps to be more concise while keeping ALL critical information.

KEEP:
- Exact measurements (cups, tbsp, etc)
- Temperatures (350°F, medium heat)
- Times (5 minutes, until golden)
- Key techniques (sauté, simmer, fold)

REMOVE:
- Unnecessary words ("now", "you can", "I like to")
- Background explanations
- Multiple sentences → one sentence
- Optional suggestions ("if desired")

Original steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Return as JSON array of concise steps.
Format: {"steps": ["concise step 1", "concise step 2"]}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return steps; // Return original if AI fails
  }

  try {
    const parsed = JSON.parse(content);
    return parsed.steps || steps;
  } catch (e) {
    return steps; // Return original if parsing fails
  }
}

/**
 * Validate URL to prevent SSRF attacks
 * Blocks private/internal IPs and non-HTTP(S) protocols
 */
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Block non-HTTP(S) protocols (file://, ftp://, etc.)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn('Blocked non-HTTP(S) protocol:', parsed.protocol);
      return false;
    }
    
    // Block private/internal IP addresses and localhost
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,                    // Private: 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private: 172.16.0.0/12
      /^192\.168\./,              // Private: 192.168.0.0/16
      /^169\.254\./,              // Link-local: 169.254.0.0/16
      /^::1$/,                    // IPv6 localhost
      /^fc00:/,                   // IPv6 private
      /^fe80:/,                   // IPv6 link-local
    ];
    
    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      console.warn('Blocked private/internal IP:', hostname);
      return false;
    }
    
    // Block URLs longer than 2048 characters (RFC 7230 recommendation)
    if (url.length > 2048) {
      console.warn('Blocked URL exceeding length limit');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Invalid URL format:', error);
    return false;
  }
}

/**
 * Scrape recipe from URL (HYBRID APPROACH)
 */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  console.log('Scraping recipe from:', url);
  
  // Validate URL to prevent SSRF attacks
  if (!validateUrl(url)) {
    throw new Error('Invalid or unsafe URL. Please provide a valid public HTTP/HTTPS URL.');
  }
  
  try {
    // Fetch the webpage with browser-like headers to avoid 403 blocks
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5, // Limit redirects to prevent abuse
      validateStatus: (status) => status >= 200 && status < 400, // Only follow successful redirects
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Step 1: Try to find schema.org Recipe structured data
    const schemaRecipe = extractSchemaRecipe($);
    
    if (schemaRecipe) {
      console.log('Found schema.org recipe data');
      
      // If schema doesn't have an image, try HTML fallback
      if (!schemaRecipe.image_url) {
        console.log('No image in schema.org data, trying HTML extraction...');
        const htmlImage = extractImageFromHTML($, url);
        if (htmlImage) {
          schemaRecipe.image_url = htmlImage;
          console.log('Found image in HTML:', htmlImage);
        }
      }
      
      // Step 2: Validate and filter steps
      const validSteps = schemaRecipe.steps.filter(isValidCookingStep);
      console.log(`Validated steps: ${validSteps.length}/${schemaRecipe.steps.length} are valid`);
      
      // Step 3: If we have enough valid steps, condense and use them
      // Try to extract group sections from common plugins (e.g., WPRM)
      const sections = extractPluginSections($);
      
      if (validSteps.length >= 3) {
        console.log('Condensing steps for clarity...');
        const condensedSteps = await condenseSteps(validSteps);
        return await applyAutoTags({ ...schemaRecipe, steps: condensedSteps, sections });
      }
      
      // Step 4: Try HTML fallback
      console.log('Not enough valid steps from schema, trying HTML parsing...');
      const htmlSteps = parseStepsFromHTML($);
      
      if (htmlSteps.length >= 3) {
        const validHtmlSteps = htmlSteps.filter(isValidCookingStep);
        if (validHtmlSteps.length >= 3) {
          console.log('Using HTML-parsed steps, condensing...');
          const condensedSteps = await condenseSteps(validHtmlSteps);
          // Keep any sections we might have detected
          return await applyAutoTags({ ...schemaRecipe, steps: condensedSteps, sections });
        }
      }
      
      // Step 5: Use OpenAI to extract steps only
      console.log('HTML parsing insufficient, using OpenAI for steps...');
      try {
        const aiSteps = await extractStepsWithAI(html, schemaRecipe.title);
        const validAiSteps = aiSteps.filter(isValidCookingStep);
        
        if (validAiSteps.length >= 3) {
          console.log('Using AI-extracted steps, condensing...');
          const condensedSteps = await condenseSteps(validAiSteps);
          return await applyAutoTags({ ...schemaRecipe, steps: condensedSteps });
        }
      } catch (aiError) {
        console.error('AI step extraction failed:', aiError);
      }
      
      // Step 6: Final validation - do we have at least 3 steps?
      if (validSteps.length < 3) {
        throw new Error('Could not extract enough valid cooking steps from recipe');
      }
      
      console.log('Condensing final validated steps...');
      const condensedSteps = await condenseSteps(validSteps);
      return await applyAutoTags({ ...schemaRecipe, steps: condensedSteps, sections });
    }

    // No schema found: Fallback to full OpenAI parsing
    console.log('No schema found, using OpenAI to parse entire recipe');
    const fullRecipe = await parseRecipeWithAI(html, url);
    
    // Try to extract image from HTML as fallback
    if (!fullRecipe.image_url) {
      console.log('Trying to extract image from HTML...');
      const htmlImage = extractImageFromHTML($, url);
      if (htmlImage) {
        fullRecipe.image_url = htmlImage;
        console.log('Found image in HTML:', htmlImage);
      }
    }
    
    // Condense the AI-generated recipe steps too
    if (fullRecipe.steps.length >= 3) {
      console.log('Condensing AI-parsed recipe steps...');
      fullRecipe.steps = await condenseSteps(fullRecipe.steps);
    }
    
    // Try to add plugin sections even in AI fallback
    const sections = extractPluginSections($);
    return await applyAutoTags({ ...fullRecipe, sections });

  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw new Error(`Failed to scrape recipe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract section groups from popular recipe plugins (WPRM; basic Tasty fallback)
 */
function extractPluginSections($: cheerio.CheerioAPI): Array<{ title: string; ingredients?: string[]; steps?: string[] }> {
  const byTitle: Record<string, { title: string; ingredients?: string[]; steps?: string[] }> = {};

  // WPRM ingredient groups
  const ingGroups = $('.wprm-recipe-ingredient-group');
  if (ingGroups.length > 0) {
    ingGroups.each((_, el) => {
      const title = ($(el).find('.wprm-recipe-group-name').text().trim()) || 'Ingredients';
      const items = $(el)
        .find('.wprm-recipe-ingredient')
        .map((i, li) => cleanRecipeText($(li).text().trim()))
        .get()
        .filter(Boolean);
      if (!byTitle[title]) byTitle[title] = { title };
      if (items.length > 0) byTitle[title].ingredients = items;
    });
  } else {
    // Single ingredient list fallback (still place under one section)
    const items = $('.wprm-recipe-ingredient')
      .map((i, li) => cleanRecipeText($(li).text().trim()))
      .get()
      .filter(Boolean);
    if (items.length > 0) {
      const title = 'Ingredients';
      if (!byTitle[title]) byTitle[title] = { title };
      byTitle[title].ingredients = items;
    }
  }

  // WPRM instruction groups
  const instGroups = $('.wprm-recipe-instruction-group');
  if (instGroups.length > 0) {
    instGroups.each((_, el) => {
      const title = ($(el).find('.wprm-recipe-group-name').text().trim()) || 'Instructions';
      const steps = $(el)
        .find('.wprm-recipe-instruction-text')
        .map((i, li) => $(li).text().trim())
        .get()
        .filter(Boolean);
      if (!byTitle[title]) byTitle[title] = { title };
      if (steps.length > 0) byTitle[title].steps = steps;
    });
  } else {
    // Single instructions fallback (selector already used elsewhere)
    const steps = $('.wprm-recipe-instruction-text')
      .map((i, li) => $(li).text().trim())
      .get()
      .filter(Boolean);
    if (steps.length > 0) {
      const title = 'Instructions';
      if (!byTitle[title]) byTitle[title] = { title };
      byTitle[title].steps = steps;
    }
  }

  // Basic Tasty fallback (labels sometimes present)
  $('.tasty-recipes-ingredient-group, .tasty-recipes-instruction-group').each((_, el) => {
    const label = $(el).find('.tasty-recipes-label').text().trim();
    const title = label || 'Section';
    const ingredients = $(el)
      .find('.tasty-recipes-ingredients li')
      .map((i, li) => cleanRecipeText($(li).text().trim()))
      .get()
      .filter(Boolean);
    const steps = $(el)
      .find('.tasty-recipes-instructions li')
      .map((i, li) => $(li).text().trim())
      .get()
      .filter(Boolean);
    if (!byTitle[title]) byTitle[title] = { title };
    if (ingredients.length > 0) byTitle[title].ingredients = ingredients;
    if (steps.length > 0) byTitle[title].steps = steps;
  });

  // Assemble sections with at least some content
  const sections = Object.values(byTitle).filter(
    (s) => (s.ingredients && s.ingredients.length > 0) || (s.steps && s.steps.length > 0)
  );

  if (sections.length > 0) {
    console.log(`Extracted ${sections.length} section group(s) from plugin markup.`);
  }

  return sections;
}

/**
 * Extract image URL from HTML as fallback when schema.org doesn't have images
 */
function extractImageFromHTML($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
  const htmlImages: string[] = [];
  
  // Common selectors for recipe images (ordered by priority)
  const imageSelectors = [
    'img.recipe-image',
    'img[class*="recipe"]',
    'img[class*="hero"]',
    'article img',
    '.entry-content img',
    '.recipe-content img',
    'main img',
    'img[src*="recipe"]',
  ];

  for (const selector of imageSelectors) {
    $(selector).each((_, el) => {
      const src = $(el).attr('src');
      const dataSrc = $(el).attr('data-src'); // Lazy loading
      const srcSet = $(el).attr('srcset');
      
      // Process src attribute
      if (src && !src.startsWith('data:') && !src.startsWith('//')) {
        try {
          const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
          if (!htmlImages.includes(absoluteUrl)) {
            htmlImages.push(absoluteUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
      
      // Process data-src (lazy loading)
      if (dataSrc && !dataSrc.startsWith('data:') && !dataSrc.startsWith('//')) {
        try {
          const absoluteUrl = dataSrc.startsWith('http') ? dataSrc : new URL(dataSrc, baseUrl).toString();
          if (!htmlImages.includes(absoluteUrl)) {
            htmlImages.push(absoluteUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
      
      // Process srcset
      if (srcSet) {
        const urls = srcSet.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
        urls.forEach(imgUrl => {
          if (!imgUrl.startsWith('data:') && !imgUrl.startsWith('//')) {
            try {
              const absoluteUrl = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, baseUrl).toString();
              if (!htmlImages.includes(absoluteUrl)) {
                htmlImages.push(absoluteUrl);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        });
      }
    });
    
    // If we found images with this selector, use the first one
    if (htmlImages.length > 0) {
      console.log(`Found ${htmlImages.length} HTML image(s) using selector: ${selector}`);
      return htmlImages[0];
    }
  }

  return undefined;
}

/**
 * Extract recipe from schema.org JSON-LD data
 */
function extractSchemaRecipe($: cheerio.CheerioAPI): ScrapedRecipe | null {
  // Look for JSON-LD script tags
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const jsonText = $(jsonLdScripts[i]).html();
      if (!jsonText) continue;

      const data = JSON.parse(jsonText);
      
      // Handle both single recipe and array of items
      const recipes = Array.isArray(data) ? data : data['@graph'] || [data];
      
      for (const item of recipes) {
        if (item['@type'] === 'Recipe') {
          return parseSchemaRecipe(item);
        }
      }
    } catch (e) {
      // Skip invalid JSON
      continue;
    }
  }

  return null;
}

/**
 * Parse schema.org Recipe object
 */
function parseSchemaRecipe(schema: any): ScrapedRecipe {
  // Extract title
  const title = stripHtml(schema.name || 'Untitled Recipe');

  // Extract ingredients (can be array or string)
  let ingredients: string[] = [];
  if (Array.isArray(schema.recipeIngredient)) {
    ingredients = schema.recipeIngredient.map((ing: string) => cleanRecipeText(stripHtml(ing)));
  } else if (typeof schema.recipeIngredient === 'string') {
    ingredients = [cleanRecipeText(stripHtml(schema.recipeIngredient))];
  }

  // Extract steps from recipeInstructions
  let steps: string[] = [];
  if (Array.isArray(schema.recipeInstructions)) {
    steps = schema.recipeInstructions.map((instruction: any) => {
      if (typeof instruction === 'string') return stripHtml(instruction);
      if (instruction.text) return stripHtml(instruction.text);
      if (instruction['@type'] === 'HowToStep' && instruction.text) return stripHtml(instruction.text);
      return '';
    }).filter((step: string) => step.length > 0);
  } else if (typeof schema.recipeInstructions === 'string') {
    // Split by newlines or periods if it's a single string
    steps = schema.recipeInstructions
      .split(/\n+/)
      .map((s: string) => stripHtml(s.trim()))
      .filter((s: string) => s.length > 0);
  }

  // Extract tags from keywords and category
  const tags: string[] = [];
  if (schema.keywords) {
    const keywords = typeof schema.keywords === 'string' 
      ? schema.keywords.split(',').map((k: string) => stripHtml(k.trim()).toLowerCase())
      : Array.isArray(schema.keywords) 
        ? schema.keywords.map((k: string) => stripHtml(k).toLowerCase())
        : [];
    tags.push(...keywords);
  }
  if (schema.recipeCategory) {
    const categories = Array.isArray(schema.recipeCategory) 
      ? schema.recipeCategory 
      : [schema.recipeCategory];
    tags.push(...categories.map((c: string) => stripHtml(c).toLowerCase()));
  }
  if (schema.recipeCuisine) {
    const cuisines = Array.isArray(schema.recipeCuisine) 
      ? schema.recipeCuisine 
      : [schema.recipeCuisine];
    tags.push(...cuisines.map((c: string) => stripHtml(c).toLowerCase()));
  }

  // Get image URL
  let image_url: string | undefined;
  if (schema.image) {
    if (typeof schema.image === 'string') {
      image_url = schema.image;
    } else if (Array.isArray(schema.image) && schema.image[0]) {
      image_url = schema.image[0].url || schema.image[0];
    } else if (schema.image.url) {
      image_url = schema.image.url;
    }
  }

  return {
    title,
    ingredients: ingredients.filter(i => i && i.length > 0),
    steps: steps.filter(s => s && s.length > 0),
    tags: [...new Set(tags)].filter(t => t && t.length > 0),
    source_url: schema.url || '',
    image_url,
  };
}

/**
 * Parse recipe using OpenAI (fallback)
 */
async function parseRecipeWithAI(html: string, url: string): Promise<ScrapedRecipe> {
  const client = getOpenAIClient();

  // Strip HTML and get readable text
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  // Truncate if too long (GPT-4 token limit)
  const truncatedText = text.substring(0, 8000);

  const prompt = `Extract the recipe from this webpage text. Return ONLY valid JSON with this structure:
{
  "title": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"]
}

If you cannot find a recipe, return {"error": "No recipe found"}.

Webpage text:
${truncatedText}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return {
    title: parsed.title || 'Untitled Recipe',
    ingredients: (parsed.ingredients || []).map((ing: string) => cleanRecipeText(ing)),
    steps: parsed.steps || [],
    tags: parsed.tags || [],
    source_url: url,
  };
}


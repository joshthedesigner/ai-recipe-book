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

interface ScrapedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  source_url: string;
  image_url?: string;
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
 * Scrape recipe from URL (HYBRID APPROACH)
 */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  console.log('Scraping recipe from:', url);
  
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBookBot/1.0)',
      },
      timeout: 10000, // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Step 1: Try to find schema.org Recipe structured data
    const schemaRecipe = extractSchemaRecipe($);
    
    if (schemaRecipe) {
      console.log('Found schema.org recipe data');
      
      // Step 2: Validate and filter steps
      const validSteps = schemaRecipe.steps.filter(isValidCookingStep);
      console.log(`Validated steps: ${validSteps.length}/${schemaRecipe.steps.length} are valid`);
      
      // Step 3: If we have enough valid steps, use them
      if (validSteps.length >= 3) {
        return { ...schemaRecipe, steps: validSteps };
      }
      
      // Step 4: Try HTML fallback
      console.log('Not enough valid steps from schema, trying HTML parsing...');
      const htmlSteps = parseStepsFromHTML($);
      
      if (htmlSteps.length >= 3) {
        const validHtmlSteps = htmlSteps.filter(isValidCookingStep);
        if (validHtmlSteps.length >= 3) {
          console.log('Using HTML-parsed steps');
          return { ...schemaRecipe, steps: validHtmlSteps };
        }
      }
      
      // Step 5: Use OpenAI to extract steps only
      console.log('HTML parsing insufficient, using OpenAI for steps...');
      try {
        const aiSteps = await extractStepsWithAI(html, schemaRecipe.title);
        const validAiSteps = aiSteps.filter(isValidCookingStep);
        
        if (validAiSteps.length >= 3) {
          console.log('Using AI-extracted steps');
          return { ...schemaRecipe, steps: validAiSteps };
        }
      } catch (aiError) {
        console.error('AI step extraction failed:', aiError);
      }
      
      // Step 6: Final validation - do we have at least 3 steps?
      if (validSteps.length < 3) {
        throw new Error('Could not extract enough valid cooking steps from recipe');
      }
      
      return { ...schemaRecipe, steps: validSteps };
    }

    // No schema found: Fallback to full OpenAI parsing
    console.log('No schema found, using OpenAI to parse entire recipe');
    return await parseRecipeWithAI(html, url);

  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw new Error(`Failed to scrape recipe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  const title = schema.name || 'Untitled Recipe';

  // Extract ingredients (can be array or string)
  let ingredients: string[] = [];
  if (Array.isArray(schema.recipeIngredient)) {
    ingredients = schema.recipeIngredient;
  } else if (typeof schema.recipeIngredient === 'string') {
    ingredients = [schema.recipeIngredient];
  }

  // Extract steps from recipeInstructions
  let steps: string[] = [];
  if (Array.isArray(schema.recipeInstructions)) {
    steps = schema.recipeInstructions.map((instruction: any) => {
      if (typeof instruction === 'string') return instruction;
      if (instruction.text) return instruction.text;
      if (instruction['@type'] === 'HowToStep' && instruction.text) return instruction.text;
      return '';
    }).filter((step: string) => step.length > 0);
  } else if (typeof schema.recipeInstructions === 'string') {
    // Split by newlines or periods if it's a single string
    steps = schema.recipeInstructions
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  // Extract tags from keywords and category
  const tags: string[] = [];
  if (schema.keywords) {
    const keywords = typeof schema.keywords === 'string' 
      ? schema.keywords.split(',').map((k: string) => k.trim().toLowerCase())
      : schema.keywords;
    tags.push(...keywords);
  }
  if (schema.recipeCategory) {
    const categories = Array.isArray(schema.recipeCategory) 
      ? schema.recipeCategory 
      : [schema.recipeCategory];
    tags.push(...categories.map((c: string) => c.toLowerCase()));
  }
  if (schema.recipeCuisine) {
    const cuisines = Array.isArray(schema.recipeCuisine) 
      ? schema.recipeCuisine 
      : [schema.recipeCuisine];
    tags.push(...cuisines.map((c: string) => c.toLowerCase()));
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
    ingredients: parsed.ingredients || [],
    steps: parsed.steps || [],
    tags: parsed.tags || [],
    source_url: url,
  };
}


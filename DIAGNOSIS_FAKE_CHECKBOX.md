# Diagnosis: Fake Checkbox Characters in Scraped Ingredients

## Issue
Sometimes scraped recipes include fake checkbox characters (like "▢") in ingredient text, e.g.:
```
▢ 2 tablespoons coriander seeds (daniya)
```

## Root Cause Analysis

The checkbox character "▢" (Unicode U+25A2, WHITE SQUARE WITH ROUNDED CORNERS) is appearing in scraped ingredients because **none of the extraction paths filter out Unicode checkbox/bullet characters**.

### Extraction Paths Affected

#### 1. Schema.org Extraction (Primary Path)
**Location:** `utils/recipeScraper.ts`, lines 630-636

```typescript
// Extract ingredients (can be array or string)
let ingredients: string[] = [];
if (Array.isArray(schema.recipeIngredient)) {
  ingredients = schema.recipeIngredient.map((ing: string) => stripHtml(ing));
} else if (typeof schema.recipeIngredient === 'string') {
  ingredients = [stripHtml(schema.recipeIngredient)];
}
```

**Problem:** The `stripHtml()` function (lines 27-41) only:
- Decodes HTML entities (`&lt;`, `&gt;`, etc.)
- Removes HTML tags (`<tag>`)
- Trims whitespace

**Missing:** No Unicode character filtering for checkbox/bullet characters.

#### 2. Plugin Extraction (WPRM/Tasty Recipes)
**Location:** `utils/recipeScraper.ts`, lines 438-442, 489-493

```typescript
const items = $(el)
  .find('.wprm-recipe-ingredient')
  .map((i, li) => $(li).text().trim())  // ← Only trim, no cleaning
  .get()
  .filter(Boolean);
```

**Problem:** Cheerio's `.text().trim()` extracts all text content including Unicode characters like "▢" with no filtering.

#### 3. OpenAI Parsing (Fallback Path)
**Location:** `utils/recipeScraper.ts`, lines 703-753

```typescript
const parsed = JSON.parse(content);
return {
  title: parsed.title || 'Untitled Recipe',
  ingredients: parsed.ingredients || [],  // ← No cleaning
  steps: parsed.steps || [],
  tags: parsed.tags || [],
  source_url: url,
};
```

**Problem:** OpenAI may include checkbox characters if they appear in the source text, and there's no cleaning step before returning.

### Why This Happens

1. **Source HTML contains checkbox characters:** Many recipe websites use Unicode checkbox characters (▢, ☐, ☑, ✓, etc.) as visual indicators in ingredient lists.

2. **No cleaning function exists:** The codebase has `stripHtml()` for HTML/entities but no function to remove Unicode checkbox/bullet characters.

3. **Text extraction preserves all characters:** Cheerio's `.text()` and schema.org parsing preserve all Unicode characters, including decorative ones.

### Common Checkbox/Bullet Characters to Filter

- `▢` (U+25A2) - WHITE SQUARE WITH ROUNDED CORNERS
- `☐` (U+2610) - BALLOT BOX
- `☑` (U+2611) - BALLOT BOX WITH CHECK
- `☒` (U+2612) - BALLOT BOX WITH X
- `✓` (U+2713) - CHECK MARK
- `✔` (U+2714) - HEAVY CHECK MARK
- `□` (U+25A1) - WHITE SQUARE
- `▪` (U+25AA) - BLACK SMALL SQUARE
- `•` (U+2022) - BULLET (though this might be intentional in some cases)
- `◦` (U+25E6) - WHITE BULLET

## Impact

- **User Experience:** Ingredients display with unwanted checkbox characters
- **Data Quality:** Inconsistent ingredient formatting
- **Search/Filtering:** May affect ingredient matching (though unlikely to break functionality)

## Recommended Solution

Create a cleaning function that removes common Unicode checkbox/bullet characters from ingredient text. This should:

1. **Be applied to all extraction paths:**
   - Schema.org extraction (after `stripHtml()`)
   - Plugin extraction (after `.text().trim()`)
   - OpenAI parsing (before returning)

2. **Remove checkbox characters:**
   - Match common Unicode checkbox/bullet characters
   - Remove them from the start of ingredient strings
   - Preserve the rest of the text

3. **Implementation location:**
   - Option A: Create `cleanIngredientText()` function and call it in all extraction paths
   - Option B: Enhance `stripHtml()` to also clean Unicode characters
   - Option C: Create a separate `cleanRecipeText()` function for both ingredients and steps

## Code Locations to Modify

1. **`stripHtml()` function** (lines 27-41): Add Unicode cleaning
2. **Schema.org extraction** (lines 633-636): Already uses `stripHtml()`, so enhancement there would fix it
3. **Plugin extraction** (lines 440, 492): Add cleaning after `.text().trim()`
4. **OpenAI parsing** (line 748): Add cleaning before returning ingredients

## Confidence Level: 95%

This diagnosis is based on:
- Code review of all extraction paths
- Understanding of Unicode checkbox characters
- Common patterns in recipe website HTML
- No existing cleaning logic for Unicode characters

The checkbox character is being preserved through text extraction because there's no filtering mechanism for it.


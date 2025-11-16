// Lightweight section detector for recipes
// Heuristics-based: identifies probable section headers and buckets following lines
// Intended as a pre-pass before LLM normalization

export interface DetectedSection {
  title: string;
  lines: string[];
}

export interface DetectedSectionsResult {
  sections: DetectedSection[];
}

const KNOWN_TITLES = [
  'frosting',
  'icing',
  'glaze',
  'sauce',
  'topping',
  'toppings',
  'filling',
  'optional',
  'variations',
  'variation',
  'notes',
  'vegan',
  'gluten-free',
];

function normalizeTitle(raw: string): string {
  const t = raw.trim().replace(/:$/, '');
  const lower = t.toLowerCase();
  if (['optional', 'optionals'].includes(lower)) return 'Optional';
  if (['variations', 'variation'].includes(lower)) return 'Variations';
  if (['notes', 'note'].includes(lower)) return 'Notes';
  if (['gluten free', 'gluten-free'].includes(lower)) return 'Gluten-Free';
  if (['vegan'].includes(lower)) return 'Vegan';
  if (['topping', 'toppings'].includes(lower)) return 'Toppings';
  if (['icing'].includes(lower)) return 'Icing';
  if (['frosting'].includes(lower)) return 'Frosting';
  if (['glaze'].includes(lower)) return 'Glaze';
  if (['sauce'].includes(lower)) return 'Sauce';
  if (['filling'].includes(lower)) return 'Filling';
  // Title Case fallback
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isLikelyHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 48) return false;

  // ends with colon
  if (/:$/.test(trimmed)) return true;

  // ALL CAPS short
  if (/^[A-Z0-9\s\-]+$/.test(trimmed) && trimmed.length <= 40) return true;

  // Title Case (each word starts with capital)
  const words = trimmed.split(/\s+/);
  const titleCase =
    words.length > 0 &&
    words.every(
      (w) =>
        !w ||
        /^[A-Z][a-z0-9'()-]*$/.test(w) ||
        /^(and|or|of|with|the|a|an|to|for|in|on|by)$/i.test(w)
    );
  if (titleCase) return true;

  // Known labels
  const lower = trimmed.toLowerCase().replace(/:$/, '');
  if (KNOWN_TITLES.includes(lower)) return true;

  return false;
}

function isListStart(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // bullets or numbered lists
  if (/^[-*•]\s+/.test(trimmed)) return true;
  if (/^\d+[\.\)]\s+/.test(trimmed)) return true;
  return false;
}

/**
 * Split raw text into sections based on heuristic headers.
 * If no clear headers found, returns a single section titled "Unclassified".
 */
export function detectSectionsFromText(raw: string): DetectedSectionsResult {
  const lines = raw.split(/\r?\n/);
  const sections: DetectedSection[] = [];

  let current: DetectedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] || '';

    if (isLikelyHeader(line) && (isListStart(next) || next.trim().length > 0)) {
      // Start new section
      const title = normalizeTitle(line);
      if (current && current.lines.length === 0) {
        // replace empty section
        current.title = title;
      } else {
        current = { title, lines: [] };
        sections.push(current);
      }
      continue;
    }

    // Assign content
    if (!current) {
      current = { title: 'Unclassified', lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }

  // Trim empty lines at boundaries
  sections.forEach((s) => {
    while (s.lines.length && !s.lines[0].trim()) s.lines.shift();
    while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop();
  });

  // Remove leading empty sections
  const filtered = sections.filter((s) => s.title || s.lines.length);
  if (filtered.length === 0) {
    filtered.push({ title: 'Unclassified', lines: lines });
  }

  return { sections: filtered };
}



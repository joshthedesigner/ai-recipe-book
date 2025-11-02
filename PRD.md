# PRD: AI-Powered Multi-User Recipe Book

**Author:** Josh Gold  
**Date:** 2025-11-01  
**Version:** 2.0

---

## 1️⃣ Purpose / Vision

Create an AI-powered recipe book that lets users:

- Save recipes easily from text, photos, or websites
- Generate structured, summarized recipes for quick reference
- Share and collaborate with family members
- Search, filter, and browse recipes via chat or card view

**Outcome:** Users have a single, organized, and accessible recipe database that never loses recipes, supports collaboration, and makes cooking easier.

---

## 2️⃣ Target Users

- Home cooks collecting recipes from multiple sources
- Families or households sharing recipes
- Busy users who want concise, structured recipe summaries

---

## 3️⃣ Key Features

| Feature | Description |
|---------|-------------|
| Multi-input recipe addition | Add recipes via text, photo (OCR), or website link |
| Structured recipe extraction | AI generates ingredients, steps, tags, and source reference |
| Human-readable summary | Displayed in chat and card view; JSON stored internally |
| Shared family database | Multiple contributors; each recipe tagged by contributor |
| Search & filters | By title, ingredient, tag, contributor, date added |
| Chat interface | Conversational interaction for adding/searching recipes |
| Recipe card view | Grid/list of recipes for browsing, clicking shows summary or source |
| Top navigation | Logo left, user lockup right, quick switching between Chat & Browse |

---

## 4️⃣ User Stories

### 4.1 Recipe Addition

**As a user, I want to add a recipe from a website link, photo, or text, so that I can save it for future reference.**

**Acceptance Criteria:**
- AI extracts ingredients, steps, tags
- Original source is stored
- Human-readable summary is returned in chat

### 4.2 Summarized Recipe View

**As a user, I want to see a concise summary of a recipe, so I can quickly understand ingredients and steps without reading the full source.**

**Acceptance Criteria:**
- Summary shows title, ingredients, steps, tags
- Always accurate and complete
- Stored JSON remains available for filtering/search

### 4.3 Search & Filtering

**As a user, I want to search recipes by ingredient, contributor, or tag, so I can quickly find the recipe I need.**

**Acceptance Criteria:**
- Search works in both chat and card view
- Filters by contributor, tag, ingredient, and date
- Results ranked by relevance, date, or contributor

### 4.4 Multi-User Collaboration

**As a user, I want to add family members so they can see and add their own recipes.**

**Acceptance Criteria:**
- Each recipe is tagged by contributor automatically
- All contributors can view, search, and add recipes
- Unlimited family members initially

### 4.5 Chat Interaction

**As a user, I want to interact with the app via chat, so I can add, search, or generate recipes conversationally.**

**Acceptance Criteria:**
- Intent classification ensures AI routes messages correctly (add, search, generate, chat)
- AI handles one intent at a time
- AI confirms unclear intents below confidence threshold
- Summarized recipe returned along with JSON storage

### 4.6 Browse / Card View

**As a user, I want to browse recipes in a card/grid view, so I can see multiple recipes at a glance.**

**Acceptance Criteria:**
- Clickable cards show recipe summary and original source
- Filters and search available
- Data is shared with chat view (no duplicates or separate storage)

---

## 5️⃣ Interaction Flow (High-Level)

1. Login → Chat view (default)
2. Add/Search/Generate recipe via chat → Intent Classifier → Routed Agent → JSON stored + human-readable summary returned
3. Switch to Browse view via top nav → Card view of recipes → Search/filter by contributor, tag, ingredient, date
4. Family contributions automatically tagged; searchable by contributor
5. Switching between Chat and Browse preserves chat context and shared data

---

## 6️⃣ Agent Responsibilities

| Agent | Responsibility | Output |
|-------|---------------|--------|
| Intent Classifier | Classify message into add/search/generate/chat | JSON (intent + confidence) |
| Store Recipe | Extract structured recipe; save to DB | JSON + human-readable summary |
| Search Recipe | Retrieve stored recipes from DB | JSON + human-readable summary |
| Generate Recipe | Generate new recipe (if requested) | JSON + summary (flagged as generated) |
| Chat Agent | Handle casual conversation | Text only; no DB operations |

---

## 7️⃣ Non-Functional Requirements

- **Accuracy:** Summaries must be correct for recipe and ingredients; exclude irrelevant content
- **Performance:** Recipe extraction and search < 2 seconds
- **Data integrity:** JSON stored for all recipes; shared between Chat and Browse
- **Multi-user support:** Unlimited contributors; privacy controlled by login
- **Navigation:** Top nav with logo left, user name right; quick switching without losing chat context

---

## 8️⃣ Success Metrics

- Users can save recipes in < 30 seconds
- ≥95% of recipes generate accurate structured summaries
- Search/filter returns results < 2 seconds
- Family sharing used by ≥50% of multi-user households
- AI hallucination is minimized; generated recipes clearly flagged


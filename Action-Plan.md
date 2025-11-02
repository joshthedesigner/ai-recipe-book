# Action Plan: AI-Powered Multi-User Recipe Book

**Author:** Josh Gold  
**Date:** 2025-11-01  
**Based on:** PRD v2.0 + System Summary

---

## Overview

This action plan breaks down the development of the AI-powered recipe book into **manageable phases**. Each phase has:
- Clear objectives
- Specific deliverables
- Review checkpoint for approval before moving forward

**Important:** At the end of each phase, development stops for your review and approval before proceeding.

---

## Phase 1: Project Setup & Foundation

### Objectives
- Set up the development environment
- Initialize project structure
- Configure essential services

### Tasks

#### 1.1 Initialize Next.js Project
- Create Next.js app with TypeScript
- Set up folder structure matching the System Summary:
  ```
  /src
   ├─ agents/
   ├─ db/
   ├─ vector/
   ├─ utils/
   ├─ app/
   └─ components/
  ```
- Configure `package.json` with dependencies

#### 1.2 Set Up Supabase
- Create Supabase project
- Enable pgvector extension
- Create `.env.local` with Supabase credentials
- Test connection

#### 1.3 Install Core Dependencies
- OpenAI SDK (for LLM + embeddings)
- Supabase client
- Material UI (MUI) for UI components

### Deliverables
- ✅ Running Next.js app (blank homepage)
- ✅ Supabase project connected
- ✅ Environment variables configured
- ✅ Dependencies installed

### Review Checkpoint
**Stop here for approval before Phase 2**

---

## Phase 2: Database Schema & Setup

### Objectives
- Design and implement database tables
- Enable vector search capabilities
- Set up authentication

### Tasks

#### 2.1 Create Database Tables

**Users Table:**
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- created_at (timestamp)
```

**Recipes Table:**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- title (text)
- ingredients (jsonb)
- steps (jsonb)
- tags (text[])
- source_url (text, nullable)
- image_url (text, nullable)
- contributor_name (text)
- created_at (timestamp)
- updated_at (timestamp)
- embedding (vector(3072)) -- for text-embedding-3-large
```

**Chat History Table:**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- message (text)
- role (text) -- 'user' or 'assistant'
- created_at (timestamp)
```

#### 2.2 Enable pgvector
- Install pgvector extension in Supabase
- Create vector similarity search function
- Test embedding storage and retrieval

#### 2.3 Set Up Row-Level Security (RLS)
- Users can only see recipes they've added or recipes from their family group
- Users can only edit their own recipes
- All family members can read shared recipes

### Deliverables
- ✅ Database tables created
- ✅ pgvector enabled and tested
- ✅ RLS policies configured
- ✅ Sample test data inserted

### Review Checkpoint
**Stop here for approval before Phase 3**

---

## Phase 3: Core Backend - Router & Intent Classifier

### Objectives
- Build the message router
- Implement intent classification
- Create API endpoints

### Tasks

#### 3.1 Create Router (`/src/router.ts`)
- Main entry point for all user messages
- Calls Intent Classifier
- Routes to appropriate agent
- Handles low-confidence clarification

#### 3.2 Build Intent Classifier Agent (`/src/agents/intentClassifier.ts`)
- Uses OpenAI to classify user input
- Returns JSON: `{intent, confidence}`
- Supported intents:
  - `store_recipe`
  - `search_recipe`
  - `generate_recipe`
  - `general_chat`

#### 3.3 Create API Route (`/app/api/chat/route.ts`)
- POST endpoint receives user message
- Calls router
- Returns agent response + intent metadata

### Deliverables
- ✅ Router logic implemented
- ✅ Intent Classifier working
- ✅ API endpoint functional
- ✅ Test cases pass (see System Summary Section 8)

### Review Checkpoint
**Stop here for approval before Phase 4**

---

## Phase 4: Agent Implementation

### Objectives
- Build all five specialized agents
- Ensure no hallucination or cross-contamination
- Test each agent independently

### Tasks

#### 4.1 Store Recipe Agent (`/src/agents/storeRecipe.ts`)
- Extracts structured data from user input (text, URL, or photo)
- Validates required fields (title, ingredients, steps)
- Generates embedding via OpenAI
- Saves to database
- Returns JSON + human-readable summary

#### 4.2 Search Recipe Agent (`/src/agents/searchRecipe.ts`)
- Accepts natural language query
- Generates embedding for query
- Performs vector similarity search
- Returns matching recipes (JSON + summary)
- Never invents recipes

#### 4.3 Generate Recipe Agent (`/src/agents/generateRecipe.ts`)
- Only acts when intent = `generate_recipe`
- Uses OpenAI to create new recipe
- Flags output as AI-generated
- Returns JSON + summary

#### 4.4 Chat Agent (`/src/agents/chatAgent.ts`)
- Handles general conversation
- No database access
- Provides cooking advice, meal planning help
- Casual and friendly tone

#### 4.5 Embedding & Vector Search Utilities (`/src/vector/`)
- `embed.ts`: Generate embeddings using `text-embedding-3-large`
- `search.ts`: Perform vector similarity search in Supabase

### Deliverables
- ✅ All 4 specialized agents implemented
- ✅ Vector search working
- ✅ Agents tested individually
- ✅ No hallucination detected

### Review Checkpoint
**Stop here for approval before Phase 5**

---

## Phase 5: Frontend - Chat Interface

### Objectives
- Build conversational chat UI
- Connect to backend API
- Display messages and recipes

### Tasks

#### 5.1 Create Chat Layout
- Top navigation bar:
  - Logo on left
  - User name/avatar on right
  - Toggle between "Chat" and "Browse" views
- Chat message area (scrollable)
- Input field at bottom

#### 5.2 Message Components
- User message bubble
- Assistant message bubble
- Recipe summary card (displayed inline in chat)
- Loading indicator

#### 5.3 Connect to API
- Send user messages to `/api/chat`
- Display responses
- Handle errors gracefully
- Show intent clarification prompts when needed

#### 5.4 Chat History
- Load previous chat messages on page load
- Persist chat context when switching views

### Deliverables
- ✅ Chat UI functional
- ✅ Messages send and receive correctly
- ✅ Recipe summaries display inline
- ✅ Chat history persists

### Review Checkpoint
**Stop here for approval before Phase 6**

---

## Phase 6: Frontend - Browse/Card View

### Objectives
- Build recipe card grid/list view
- Implement search and filters
- Share data with chat view

### Tasks

#### 6.1 Create Recipe Card Component
- Displays recipe title, tags, contributor, date
- Clickable → opens recipe detail modal
- Shows thumbnail if available

#### 6.2 Build Grid Layout
- Responsive grid (1 column mobile, 2-3 columns tablet, 3-4 desktop)
- Sort options: Date, Contributor, Relevance

#### 6.3 Add Search & Filters
- Search bar (uses vector search)
- Filter dropdowns:
  - By contributor
  - By tag
  - By date added
- Apply filters to grid in real-time

#### 6.4 Recipe Detail Modal
- Full recipe view:
  - Title
  - Ingredients (formatted list)
  - Steps (numbered)
  - Tags
  - Source link (if available)
  - Contributor name + date

### Deliverables
- ✅ Recipe grid view functional
- ✅ Search and filters working
- ✅ Recipe detail modal displays correctly
- ✅ Data shared with chat view (no duplication)

### Review Checkpoint
**Stop here for approval before Phase 7**

---

## Phase 7: Multi-Input Recipe Addition

### Objectives
- Support text, photo (OCR), and website link input
- Extract structured recipe data accurately
- Handle edge cases

### Tasks

#### 7.1 Text Input
- Already handled by Store Recipe Agent
- Parse free-form text into structured JSON

#### 7.2 Website Link Input
- Detect URLs in user messages
- Scrape recipe from website (use libraries like `cheerio` or `puppeteer`)
- Extract title, ingredients, steps, image
- Store source URL

#### 7.3 Photo Upload (OCR)
- Add image upload button in chat
- Use OpenAI Vision API to extract recipe text
- Parse extracted text into structured JSON
- Store image URL

#### 7.4 Validation & Confirmation
- Show extracted recipe to user before saving
- Ask for confirmation:
  > "I extracted this recipe. Does it look correct?"
- Allow user to edit before final save

### Deliverables
- ✅ Text input working
- ✅ URL scraping functional
- ✅ Photo OCR working
- ✅ Validation and confirmation flow implemented

### Review Checkpoint
**Stop here for approval before Phase 8**

---

## Phase 8: Multi-User & Family Sharing

### Objectives
- Enable authentication
- Support multiple family members
- Tag recipes by contributor

### Tasks

#### 8.1 Implement Authentication
- Use Supabase Auth
- Sign up / Sign in UI
- Protected routes

#### 8.2 Family Group Setup
- Allow users to invite family members by email
- Create "family group" concept (or shared workspace)
- All recipes visible to all family members

#### 8.3 Contributor Tagging
- Automatically tag each recipe with contributor name
- Display contributor in recipe cards and detail view
- Filter recipes by contributor

### Deliverables
- ✅ Authentication working
- ✅ Family groups functional
- ✅ Recipes tagged by contributor
- ✅ Multi-user collaboration tested

### Review Checkpoint
**Stop here for approval before Phase 9**

---

## Phase 9: Polish, Testing & Optimization

### Objectives
- Improve UI/UX
- Optimize performance
- Fix bugs
- Test end-to-end

### Tasks

#### 9.1 UI/UX Polish
- Add animations and transitions
- Improve mobile responsiveness
- Enhance visual design (colors, typography, spacing)
- Add loading states and error messages

#### 9.2 Performance Optimization
- Optimize database queries
- Cache embeddings where possible
- Lazy load images
- Reduce API response times (target: < 2 seconds)

#### 9.3 End-to-End Testing
- Test all user stories from PRD
- Test edge cases (empty results, long recipes, etc.)
- Test on multiple devices and browsers

#### 9.4 Bug Fixes
- Address any issues found during testing
- Ensure hallucination guardrails are working

### Deliverables
- ✅ UI polished and responsive
- ✅ Performance meets targets (< 2 seconds)
- ✅ All user stories tested and working
- ✅ No critical bugs

### Review Checkpoint
**Stop here for approval before Phase 10**

---

## Phase 10: Deployment

### Objectives
- Deploy to production
- Monitor and maintain

### Tasks

#### 10.1 Deploy Frontend
- Deploy Next.js app to Vercel
- Configure environment variables
- Test production build

#### 10.2 Configure Custom Domain (Optional)
- Set up custom domain
- Configure DNS

#### 10.3 Monitor & Maintain
- Set up error tracking (e.g., Sentry)
- Monitor API usage and costs
- Plan for future iterations

### Deliverables
- ✅ App deployed to production
- ✅ Environment configured
- ✅ Monitoring enabled
- ✅ Documentation complete

### Final Review
**Project complete! Review and plan next features.**

---

## Success Criteria (From PRD)

At project completion, verify:
- ✅ Users can save recipes in < 30 seconds
- ✅ ≥95% of recipes generate accurate structured summaries
- ✅ Search/filter returns results < 2 seconds
- ✅ Family sharing functional
- ✅ AI hallucination minimized
- ✅ All user stories from PRD satisfied

---

## Notes

- **Phase-based approach:** Each phase builds on the previous one
- **Approval required:** No phase proceeds without your explicit confirmation
- **Flexible timeline:** Phases can be adjusted based on feedback
- **Documentation:** Each phase includes inline code comments and explanations

---

## Next Steps

**Review this action plan and approve Phase 1 to begin.**


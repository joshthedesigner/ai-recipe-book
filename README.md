# AI-Powered Multi-User Recipe Book

An intelligent recipe management system that lets families save, search, and generate recipes using AI.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account ([sign up free](https://supabase.com))
- An OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone or navigate to the project:**
   ```bash
   cd /Users/jogold/Desktop/recipebook
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
/recipebook
├─ agents/          # AI agents (Intent Classifier, Store, Search, Generate, Chat)
├─ db/              # Database client and utilities
├─ vector/          # Embedding generation and vector search
├─ utils/           # Helper functions
├─ app/             # Next.js App Router pages and API routes
├─ components/      # Reusable React components
├─ PRD.md           # Product Requirements Document
├─ Action-Plan.md   # Development roadmap
└─ AI-Multi-Agent-Recipe-Book-System-Summary.md  # System architecture
```

## 🎯 Current Status

**Phase 1: Project Setup & Foundation** ✅
- Next.js with TypeScript configured
- Material UI installed and themed
- Supabase client set up
- Folder structure created
- Basic homepage live

**Phase 2: Database Schema & Setup** ✅
- Complete SQL schema created and deployed
- pgvector extension enabled (1536 dimensions)
- Vector similarity search function ready
- Row-Level Security policies active
- All tables created and tested

**Phase 3: Router & Intent Classifier** ✅
- Intent Classifier with 94.1% accuracy
- Message router with confidence checking  
- Chat API endpoint created
- Type definitions complete
- All tests passing

**Phase 4: Agent Implementation** ✅
- Store Recipe Agent with AI extraction
- Search Recipe Agent with vector similarity
- Generate Recipe Agent creating full recipes
- Chat Agent for cooking advice
- Embedding and vector search utilities
- All agents tested and working

**Phase 5: Frontend - Chat Interface** ✅
- Beautiful Material UI chat interface
- Message bubbles (user & assistant)
- Recipe cards display inline
- Input field with send button
- Real-time API integration
- Loading indicators
- Auto-scroll and responsive design

**Phase 6: Frontend - Browse/Card View** ✅
- Recipe grid with responsive layout (1-4 columns)
- Search bar (title, ingredients, tags)
- Filter dropdowns (tag, contributor, sort)
- Recipe detail modal
- Clickable cards with hover effects
- Empty and no-results states
- Client-side filtering for instant UX

**Next Phase:** Multi-Input Recipe Addition (Photo, URL, OCR)

## 🛠️ Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Library:** Material UI (MUI)
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI:** OpenAI (GPT-4 + text-embedding-3-large)
- **Deployment:** Vercel (planned)

## 📖 Documentation

- [PRD.md](./PRD.md) - Product requirements and user stories
- [Action-Plan.md](./Action-Plan.md) - Phased development plan
- [AI-Multi-Agent-Recipe-Book-System-Summary.md](./AI-Multi-Agent-Recipe-Book-System-Summary.md) - Technical architecture

## 🤝 Contributing

This is a family recipe project. Follow the Action Plan phases for development.

## 📝 License

Private family project


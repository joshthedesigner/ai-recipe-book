-- AI Recipe Book Database Schema
-- Phase 2: Database Setup

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- TABLES
-- ========================================

-- Users Table
-- Stores user information for authentication and contributor tracking
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes Table
-- Stores recipe data with vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL,
  steps JSONB NOT NULL,
  tags TEXT[],
  source_url TEXT,
  image_url TEXT,
  contributor_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  embedding VECTOR(1536) -- For OpenAI text-embedding-3-small (within pgvector 2000 dim limit)
);

-- Chat History Table
-- Stores conversation history for each user
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

-- Index for faster recipe lookups by user
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);

-- Index for faster recipe search by creation date
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- Index for faster recipe search by tags
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

-- Vector similarity search index (HNSW for efficient similarity search)
-- Note: Using 1536 dimensions (text-embedding-3-small) to stay within pgvector's 2000 dim limit
CREATE INDEX IF NOT EXISTS idx_recipes_embedding ON recipes 
USING hnsw (embedding vector_cosine_ops);

-- Index for chat history by user
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);

-- Index for chat history by timestamp
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to search recipes by vector similarity
CREATE OR REPLACE FUNCTION match_recipes(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  ingredients JSONB,
  steps JSONB,
  tags TEXT[],
  source_url TEXT,
  image_url TEXT,
  contributor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    recipes.id,
    recipes.title,
    recipes.ingredients,
    recipes.steps,
    recipes.tags,
    recipes.source_url,
    recipes.image_url,
    recipes.contributor_name,
    recipes.created_at,
    1 - (recipes.embedding <=> query_embedding) AS similarity
  FROM recipes
  WHERE 1 - (recipes.embedding <=> query_embedding) > match_threshold
  ORDER BY recipes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on recipes
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users: Can only read their own profile
CREATE POLICY users_select_own
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users: Can update their own profile
CREATE POLICY users_update_own
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Recipes: Users can read all recipes (family sharing)
-- Note: In production, you'll want to add family_group_id logic
CREATE POLICY recipes_select_all
  ON recipes FOR SELECT
  USING (true);

-- Recipes: Users can insert their own recipes
CREATE POLICY recipes_insert_own
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Recipes: Users can update their own recipes
CREATE POLICY recipes_update_own
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

-- Recipes: Users can delete their own recipes
CREATE POLICY recipes_delete_own
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Chat History: Users can read their own chat history
CREATE POLICY chat_history_select_own
  ON chat_history FOR SELECT
  USING (auth.uid() = user_id);

-- Chat History: Users can insert their own messages
CREATE POLICY chat_history_insert_own
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chat History: Users can delete their own messages
CREATE POLICY chat_history_delete_own
  ON chat_history FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- SAMPLE DATA (for testing)
-- ========================================

-- Note: This sample data assumes you have a test user
-- You'll need to replace the user_id with an actual auth user ID after signup

COMMENT ON TABLE users IS 'User profiles for authentication and contributor tracking';
COMMENT ON TABLE recipes IS 'Recipe storage with vector embeddings for semantic search';
COMMENT ON TABLE chat_history IS 'Conversation history for each user';
COMMENT ON FUNCTION match_recipes IS 'Vector similarity search for recipes';


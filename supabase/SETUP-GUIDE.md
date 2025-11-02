# Supabase Setup Guide - Phase 2

This guide will walk you through setting up your Supabase database for the AI Recipe Book.

## Step 1: Create a Supabase Project

1. **Go to Supabase:** Visit [https://supabase.com](https://supabase.com)
2. **Sign in/Sign up:** Create an account or log in
3. **Create New Project:**
   - Click "New Project"
   - Choose your organization (or create one)
   - Fill in project details:
     - **Name:** `ai-recipe-book` (or your preferred name)
     - **Database Password:** Create a strong password (save it!)
     - **Region:** Choose the closest region to you
     - **Pricing Plan:** Free tier is fine for development
4. **Wait for setup:** Project creation takes ~2 minutes

## Step 2: Get Your API Keys

Once your project is ready:

1. **Go to Project Settings:**
   - Click the gear icon (⚙️) in the sidebar
   - Select "API" from the settings menu

2. **Copy Your Credentials:**
   - **Project URL:** Copy the URL (starts with `https://`)
   - **anon/public key:** Copy the `anon` `public` key

3. **Update Your .env.local File:**
   
   Create `/Users/jogold/Desktop/recipebook/.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   OPENAI_API_KEY=your-openai-api-key-here
   ```

## Step 3: Run the Database Schema

1. **Go to SQL Editor:**
   - In your Supabase dashboard
   - Click "SQL Editor" in the sidebar
   - Click "New Query"

2. **Copy the Schema:**
   - Open `/Users/jogold/Desktop/recipebook/supabase/schema.sql`
   - Copy the entire contents

3. **Paste and Run:**
   - Paste the SQL into the query editor
   - Click "Run" (or press `Cmd/Ctrl + Enter`)
   - Wait for "Success. No rows returned"

## Step 4: Verify the Setup

1. **Check Tables:**
   - Click "Table Editor" in the sidebar
   - You should see three tables:
     - ✅ `users`
     - ✅ `recipes`
     - ✅ `chat_history`

2. **Check Extensions:**
   - Go to "Database" → "Extensions"
   - Search for "vector"
   - Verify `vector` is enabled (green toggle)

## Step 5: Enable Authentication (Optional for Phase 2)

We'll set this up in Phase 8, but you can enable it now:

1. **Go to Authentication:**
   - Click "Authentication" in the sidebar
   - Go to "Providers"
   - Enable "Email" provider
   - Configure settings as desired

## What Was Created?

### 📊 Tables

1. **users**
   - Stores user profiles
   - Fields: id, email, name, created_at

2. **recipes**
   - Stores all recipes with embeddings
   - Fields: id, user_id, title, ingredients, steps, tags, source_url, image_url, contributor_name, created_at, updated_at, embedding

3. **chat_history**
   - Stores conversation history
   - Fields: id, user_id, message, role, created_at

### 🔍 Indexes

- User ID indexes for fast lookups
- Tag search with GIN index
- Vector similarity index (IVFFlat)
- Timestamp indexes for sorting

### ⚡ Functions

1. **match_recipes()**
   - Performs vector similarity search
   - Returns recipes similar to a query embedding
   - Configurable threshold and result count

2. **update_updated_at_column()**
   - Auto-updates `updated_at` on recipe changes

### 🔒 Row-Level Security (RLS)

- Users can only see their own profile
- Users can see ALL recipes (family sharing)
- Users can only edit/delete their own recipes
- Users can only see their own chat history

## Troubleshooting

### "extension vector does not exist"
- Go to Database → Extensions
- Search for "vector"
- Click "Enable"

### "permission denied for table"
- RLS policies are active
- For testing, you can temporarily disable RLS:
  ```sql
  ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
  ```
  (Don't forget to re-enable later!)

### "function auth.uid() does not exist"
- This is normal if you haven't set up auth yet
- RLS policies will work once auth is enabled in Phase 8

## Next Steps

Once you complete this setup:
1. Confirm all tables are created
2. Confirm pgvector is enabled
3. Let me know and we'll test the connection from the Next.js app


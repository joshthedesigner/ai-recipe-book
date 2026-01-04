# AI Recipe Book - Application Documentation

## Overview

The AI Recipe Book is a web application that helps users collect, organize, and manage their recipe collection. Users can add recipes through multiple methods (URL scraping, text input, image extraction), organize them into groups (recipe books), share with friends, and discover recipes through search and filtering.

## Technology Stack

- **Frontend Framework**: Next.js 14 (React with App Router)
- **UI Library**: Material-UI (MUI)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Vector Search**: pgvector extension for semantic recipe search
- **AI/ML**: OpenAI API (GPT-4o-mini) for recipe extraction and parsing
- **Language**: TypeScript
- **Styling**: Material-UI's sx prop system

## Core Features

### 1. Recipe Management
- **Add Recipes**: Multiple input methods:
  - URL scraping (extracts from websites using Schema.org or AI parsing)
  - Text input (paste recipe text)
  - Image extraction (OCR from recipe images)
  - YouTube video extraction (uses video captions)
- **Recipe Storage**: Recipes stored with title, ingredients, steps, tags, images, and metadata
- **Recipe Viewing**: Browse recipes in a grid view with filtering and sorting
- **Recipe Details**: Full recipe view with ingredients, steps, images/videos, tags, and notes
- **Recipe Editing**: Users can edit their recipes
- **Recipe Deletion**: Users can delete their own recipes

### 2. Recipe Groups (Recipe Books)
- Users can create multiple recipe groups (e.g., "Family Recipes", "Desserts", "Weeknight Meals")
- Groups can be shared with friends via email invitations
- Role-based access: Owner, Write, Read permissions
- Group switching interface in the navigation

### 3. Friends & Sharing
- Send friend requests via email
- Accept/reject friend requests
- View friends' recipe collections
- Add friends' recipes to your own collection
- Friends feed showing recipes and notes from friends

### 4. Search & Filtering
- **Text Search**: Search across recipe titles, ingredients, and tags
- **Filter by Cuisine**: Filter recipes by cuisine type (Italian, Chinese, etc.)
- **Filter by Ingredients**: Filter by main ingredient (fish, chicken, beef, tofu, etc.)
  - Special case: "tofu" filter matches recipes with "tofu" in title or ingredients (not just tags)
- **Sort Options**:
  - Recently Added (newest first)
  - First Added (oldest first)
  - Recently Viewed (based on localStorage tracking)

### 5. Recipe Notes
- Users can add notes to recipes (text and photos)
- Notes are private to the user
- View notes in a dedicated tab on the recipe detail page
- Notes feed showing notes from friends

### 6. Recipe Scraping
- **Schema.org Support**: Extracts structured recipe data from websites
- **OpenAI Fallback**: Uses GPT-4o-mini to parse recipe data from HTML when Schema.org is unavailable
- **Image Extraction**: Extracts images from HTML when not available in Schema.org data
- **Video Support**: Extracts recipes from YouTube videos using captions
- **Auto-Tagging**: Automatically generates tags based on ingredients (protein type, vegetarian/vegan, cuisine)

## Database Schema

### Core Tables

#### `users`
- `id` (UUID, Primary Key)
- `email` (TEXT, Unique)
- `name` (TEXT)
- `created_at` (TIMESTAMP)

#### `recipes`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `group_id` (UUID, Foreign Key to recipe_groups, nullable)
- `title` (TEXT)
- `ingredients` (JSONB array)
- `steps` (JSONB array)
- `tags` (TEXT array)
- `sections` (JSONB, optional structured sections)
- `source_url` (TEXT, nullable)
- `image_url` (TEXT, nullable)
- `video_url` (TEXT, nullable)
- `video_platform` (TEXT: 'youtube' | 'tiktok' | 'instagram' | 'direct' | null)
- `cookbook_name` (TEXT, nullable)
- `cookbook_page` (TEXT, nullable)
- `contributor_name` (TEXT)
- `embedding` (VECTOR(1536) for semantic search)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `recipe_groups`
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `owner_id` (UUID, Foreign Key to users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `group_members`
- `id` (UUID, Primary Key)
- `group_id` (UUID, Foreign Key to recipe_groups)
- `user_id` (UUID, Foreign Key to users, nullable for pending invites)
- `email` (TEXT)
- `role` (TEXT: 'read' | 'write')
- `status` (TEXT: 'active' | 'pending' | 'inactive')
- `invited_by` (UUID, Foreign Key to users)
- `invited_at` (TIMESTAMP)
- `joined_at` (TIMESTAMP, nullable)

#### `friends`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `friend_user_id` (UUID, Foreign Key to users, nullable for pending)
- `friend_email` (TEXT)
- `status` (TEXT: 'pending' | 'accepted' | 'rejected')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `recipe_notes`
- `id` (UUID, Primary Key)
- `recipe_id` (UUID, Foreign Key to recipes)
- `user_id` (UUID, Foreign Key to users)
- `note_text` (TEXT)
- `photo_urls` (TEXT array)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `chat_history`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `message` (TEXT)
- `role` (TEXT: 'user' | 'assistant')
- `created_at` (TIMESTAMP)

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access recipes in their groups or their own recipes
- Users can only view/edit their own notes
- Friend relationships are bidirectional

## API Endpoints

### Recipe Endpoints

#### `GET /api/recipes`
- Fetches recipes for the authenticated user
- Query parameters:
  - `groupId`: Filter by group ID
  - `sortBy`: Sort column (created_at, title, contributor_name)
  - `sortOrder`: asc or desc
  - `tag`: Filter by tag
  - `contributor`: Filter by contributor name
  - `limit`: Pagination limit (1-100)
  - `offset`: Pagination offset
- Returns: `{ success: boolean, recipes: Recipe[], count: number, pagination: {...} }`
- Includes favorite status for authenticated user (if favorites table exists)

#### `POST /api/recipes/store`
- Stores a new recipe from text input
- Body: `{ message: string, userId?: string, reviewMode?: boolean, cookbookName?: string, cookbookPage?: string, groupId?: string }`
- Uses AI agent to extract recipe structure from text
- Returns: `{ success: boolean, recipe?: Recipe, message?: string }`

#### `GET /api/recipes/[id]`
- Fetches a single recipe by ID
- Returns: `{ success: boolean, recipe?: Recipe }`

#### `DELETE /api/recipes/[id]`
- Deletes a recipe (only by owner or group owner)
- Returns: `{ success: boolean, error?: string }`

#### `PUT /api/recipes/[id]`
- Updates a recipe (only by owner or users with write access)
- Body: Recipe object
- Returns: `{ success: boolean, recipe?: Recipe, error?: string }`

#### `POST /api/recipes/extract-from-image`
- Extracts recipe text from an uploaded image using OCR
- Body: FormData with image file
- Returns: `{ success: boolean, text?: string, error?: string }`

#### `POST /api/recipes/copy`
- Copies a recipe from a friend's collection to your own
- Body: `{ recipeId: string }`
- Returns: `{ success: boolean, recipe?: Recipe, error?: string }`

### Group Endpoints

#### `GET /api/groups`
- Fetches all groups the user has access to
- Returns: `{ success: boolean, groups: Group[] }`

#### `POST /api/groups`
- Creates a new recipe group
- Body: `{ name: string }`
- Returns: `{ success: boolean, group?: Group }`

#### `POST /api/groups/[id]/invite`
- Invites a user to a group via email
- Body: `{ email: string, role: 'read' | 'write' }`
- Returns: `{ success: boolean, error?: string }`

### Friend Endpoints

#### `GET /api/friends`
- Fetches user's friends list
- Returns: `{ success: boolean, friends: Friend[] }`

#### `POST /api/friends/request`
- Sends a friend request
- Body: `{ email: string }`
- Returns: `{ success: boolean, error?: string }`

#### `POST /api/friends/accept`
- Accepts a friend request
- Body: `{ friendRequestId: string }`
- Returns: `{ success: boolean }`

### Feed Endpoints

#### `GET /api/feed`
- Fetches feed items (recipes and notes) from friends
- Query parameters:
  - `limit`: Number of items (default 20)
  - `offset`: Pagination offset
- Returns: `{ success: boolean, items: FeedItem[], hasMore: boolean }`

### Notes Endpoints

#### `GET /api/recipes/[id]/notes`
- Fetches notes for a recipe
- Returns: `{ success: boolean, notes: RecipeNote[] }`

#### `POST /api/recipes/[id]/notes`
- Creates a note for a recipe
- Body: `{ note_text: string, photo_urls?: string[] }`
- Returns: `{ success: boolean, note?: RecipeNote }`

#### `DELETE /api/recipes/[id]/notes/[noteId]`
- Deletes a note (only by owner)
- Returns: `{ success: boolean }`

### Chat Endpoints

#### `POST /api/chat`
- Sends a chat message (for general conversation)
- Body: `{ message: string, userId?: string, conversationHistory?: ChatMessage[] }`
- Returns: `{ success: boolean, response: ChatResponse }`

#### `POST /api/recipes/[id]/chat`
- Sends a recipe-specific chat message
- Body: `{ message: string, conversationHistory?: ChatMessage[] }`
- Returns: `{ success: boolean, message?: string }`

## Key Components

### Pages

#### `/` (Home/Landing Page)
- Landing page for new users
- Authentication entry point

#### `/browse`
- Main recipe browsing page
- Grid view of recipes
- Search, filter, and sort controls
- Infinite scroll pagination
- Recipe card display

#### `/recipe/[id]`
- Recipe detail page
- Shows full recipe information
- Tabs: Recipe details and Notes
- Video/image display
- Overflow menu for actions (delete, etc.)

#### `/feed`
- Friends feed page
- Shows recipes and notes from friends
- Timeline view

#### `/friends`
- Friends management page
- Send friend requests
- Accept/reject requests
- View friends list

### Components

#### `RecipeCard`
- Displays recipe in card format
- Shows image, title, tags, ingredient/step counts
- Supports compact mode for grid view
- Overflow menu for actions

#### `RecipeSidebar`
- Modal sidebar for adding new recipes
- Supports text input, URL scraping, image upload
- Recipe preview and confirmation

#### `TopNav`
- Main navigation bar
- Group switcher
- User menu
- Search functionality

#### `RecipeChat`
- Floating action button for recipe-specific chat
- Opens chat modal for recipe questions

#### `RecipeNotesTab`
- Tab component for viewing/adding recipe notes
- Photo upload support
- Notes list with timestamps

## Key Utilities

### Recipe Scraping (`utils/recipeScraper.ts`)
- Scrapes recipes from URLs
- Tries Schema.org structured data first
- Falls back to OpenAI parsing if Schema.org unavailable
- Extracts images from HTML
- Supports Instagram Reels (Open Graph + caption parsing)

### Video Extraction (`utils/videoExtractor.ts`)
- Extracts recipes from YouTube videos
- Uses video captions/transcripts
- Detects sections and timestamps

### Auto-Tagging (`utils/autoTag.ts`)
- Automatically generates tags based on ingredients
- Detects protein types (fish, chicken, beef, pork, lamb)
- Detects dietary restrictions (vegetarian, vegan)
- Expands regional cuisine tags (e.g., "goan" → "indian")

### Vector Search (`vector/search.ts`)
- Semantic recipe search using embeddings
- Uses OpenAI embeddings (text-embedding-3-small)
- Stores embeddings in pgvector
- Supports keyword and semantic search

### Permissions (`utils/permissions.ts`)
- Checks user permissions for groups
- Validates read/write access
- Friend access checks

## Authentication & Authorization

- Uses Supabase Auth for authentication
- Email/password authentication
- Google OAuth support
- Row Level Security (RLS) on all database tables
- Permission system based on group membership:
  - **Owner**: Full control (create, read, update, delete)
  - **Write**: Can create and edit recipes
  - **Read**: Can only view recipes

## State Management

- **React Context** for:
  - Authentication (`AuthContext`)
  - Active Group (`GroupContext`)
  - Toast notifications (`ToastContext`)
- **Local Storage** for:
  - Sort preferences
  - Recently viewed recipes tracking
  - Active group ID

## Data Flow

### Adding a Recipe
1. User inputs recipe (text, URL, or image)
2. If URL: `recipeScraper` extracts recipe data
3. If image: OCR extracts text, then parsed
4. If text: AI agent (`storeRecipe`) extracts structured data
5. Auto-tagging adds category tags
6. Recipe saved to database with embedding
7. UI updates to show new recipe

### Recipe Search
1. User enters search query
2. Query converted to embedding vector
3. Vector similarity search in database
4. Results ranked by similarity
5. Displayed in browse page

### Friend Sharing
1. User sends friend request via email
2. Friend receives email invitation
3. Friend accepts (creates account if needed)
4. Friend can view user's recipes in their groups
5. Friend can copy recipes to their collection

## Important Patterns

### Client-Side Filtering
- Recipes are fetched from API and filtered in the browser
- Filtering happens on titles, tags, and ingredients
- Sorting also happens client-side
- Infinite scroll pagination for performance

### Optimistic Updates
- Recipe deletion updates UI immediately
- Errors trigger rollback if needed

### Cache-Busting
- API responses use cache headers
- Manual cache-busting for mutations (delete, add)

### Error Handling
- User-friendly error messages via toast notifications
- API errors return structured error responses
- Client-side validation for inputs

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `OPENAI_API_KEY`: OpenAI API key for recipe extraction and embeddings

## Deployment

- Next.js application (can be deployed to Vercel, or any Node.js hosting)
- Supabase for database and authentication
- Environment variables must be configured in hosting environment


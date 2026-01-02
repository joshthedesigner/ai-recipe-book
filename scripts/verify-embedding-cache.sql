-- Verification Queries for Embedding Cache Migration
-- Run these in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'embedding_cache';

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'embedding_cache'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'embedding_cache';

-- 4. Check functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('set_embedding_cache_expiry', 'cleanup_expired_embeddings');

-- 5. Check trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_embedding_cache_expiry';

-- 6. Check pgvector extension (required for VECTOR type)
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname = 'vector';

-- Expected Results:
-- ✅ Table should exist with columns: id, video_id, segment_index, embedding, created_at, expires_at
-- ✅ Should have 3 indexes
-- ✅ Should have 2 functions
-- ✅ Should have 1 trigger
-- ✅ Should have vector extension installed



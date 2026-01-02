-- ============================================================================
-- Verification Queries for Recipe Notes Feature
-- 
-- Run these queries in Supabase SQL Editor to verify the migrations succeeded
-- ============================================================================

-- 1. Verify recipe_notes table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'recipe_notes'
ORDER BY ordinal_position;

-- 2. Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'recipe_notes';

-- 3. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'recipe_notes';

-- 4. Verify RLS policies exist
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'recipe_notes'
ORDER BY policyname;

-- 5. Verify trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'recipe_notes';

-- 6. Verify storage bucket exists
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
WHERE id = 'recipe-notes-photos';

-- 7. Verify storage policies exist
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%note photos%'
ORDER BY policyname;

-- 8. Test table structure (should return empty result, not an error)
SELECT * FROM recipe_notes LIMIT 0;

-- Expected Results:
-- 1. Should show 9 columns: id, recipe_id, user_id, note_text, photo_urls, recipe_title, recipe_image_url, created_at, updated_at
-- 2. Should show 3 indexes
-- 3. Should show rowsecurity = true
-- 4. Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- 5. Should show 1 trigger (update_recipe_notes_updated_at)
-- 6. Should show 1 bucket with id = 'recipe-notes-photos' and public = true
-- 7. Should show 4 storage policies
-- 8. Should return empty result (no error)


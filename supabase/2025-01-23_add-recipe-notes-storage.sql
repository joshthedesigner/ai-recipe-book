-- ============================================================================
-- Recipe Notes Photo Storage Setup
-- 
-- Creates Supabase Storage bucket for recipe note photos
-- ============================================================================

-- Create bucket for recipe note photos (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-notes-photos', 'recipe-notes-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies

-- Users can upload photos to their own folder structure
CREATE POLICY "Users can upload note photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-notes-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view note photos (public bucket)
CREATE POLICY "Anyone can view note photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-notes-photos');

-- Users can update their own photos
CREATE POLICY "Users can update their own note photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-notes-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'recipe-notes-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users can delete their own note photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-notes-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


/**
 * Photo Cleanup Utility
 * 
 * Handles cleanup of photos from Supabase Storage when notes fail to create
 * or when notes are deleted/updated.
 */

import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'recipe-notes-photos';

/**
 * Delete photos from Supabase Storage
 * @param supabase Supabase client
 * @param photoUrls Array of photo URLs to delete
 * @returns Array of successfully deleted URLs
 */
export async function deletePhotos(
  supabase: SupabaseClient,
  photoUrls: string[]
): Promise<string[]> {
  if (!photoUrls || photoUrls.length === 0) {
    return [];
  }

  const deletedUrls: string[] = [];
  const errors: string[] = [];

  for (const url of photoUrls) {
    try {
      // Extract file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/recipe-notes-photos/[path]
      const urlParts = url.split('/');
      const pathIndex = urlParts.indexOf(BUCKET_NAME);
      
      if (pathIndex === -1 || pathIndex === urlParts.length - 1) {
        console.warn(`Invalid photo URL format: ${url}`);
        errors.push(url);
        continue;
      }

      const filePath = urlParts.slice(pathIndex + 1).join('/');

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error(`Error deleting photo ${filePath}:`, error);
        errors.push(url);
      } else {
        deletedUrls.push(url);
      }
    } catch (err) {
      console.error(`Exception deleting photo ${url}:`, err);
      errors.push(url);
    }
  }

  if (errors.length > 0) {
    console.warn(`Failed to delete ${errors.length} photos:`, errors);
  }

  return deletedUrls;
}

/**
 * Extract file path from Supabase Storage URL
 * @param url Full Supabase Storage URL
 * @returns File path relative to bucket, or null if invalid
 */
export function extractFilePathFromUrl(url: string): string | null {
  try {
    const urlParts = url.split('/');
    const pathIndex = urlParts.indexOf(BUCKET_NAME);
    
    if (pathIndex === -1 || pathIndex === urlParts.length - 1) {
      return null;
    }

    return urlParts.slice(pathIndex + 1).join('/');
  } catch {
    return null;
  }
}

/**
 * Cleanup photos for a note (used when note is deleted or photos are removed)
 * @param supabase Supabase client
 * @param photoUrls Array of photo URLs to delete
 */
export async function cleanupNotePhotos(
  supabase: SupabaseClient,
  photoUrls: string[]
): Promise<void> {
  if (!photoUrls || photoUrls.length === 0) {
    return;
  }

  const deleted = await deletePhotos(supabase, photoUrls);
  console.log(`Cleaned up ${deleted.length} of ${photoUrls.length} photos`);
}


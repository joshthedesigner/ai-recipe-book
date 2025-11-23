/**
 * Note API Route
 * 
 * PUT /api/notes/[id] - Update a note
 * DELETE /api/notes/[id] - Delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';
import { cleanupNotePhotos } from '@/utils/photoCleanup';
import { RecipeNote } from '@/types';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];

/**
 * PUT /api/notes/[id]
 * Update a note (text and/or photos)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const noteId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RATE_LIMITS.general,
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Validate noteId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!noteId || !uuidRegex.test(noteId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

    // Verify note exists and user owns it
    const { data: existingNote, error: fetchError } = await supabase
      .from('recipe_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (fetchError || !existingNote) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    if (existingNote.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own notes' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const noteText = formData.get('note_text') as string | null;
    const photos = formData.getAll('photos') as File[];
    const removePhotoUrls = formData.get('remove_photo_urls') 
      ? JSON.parse(formData.get('remove_photo_urls') as string) as string[]
      : [];

    // Build update object
    const updateData: any = {};

    // Update note text if provided
    if (noteText !== null) {
      if (noteText.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Note text cannot be empty' },
          { status: 400 }
        );
      }
      if (noteText.length > 5000) {
        return NextResponse.json(
          { success: false, error: 'Note text exceeds maximum length of 5000 characters' },
          { status: 400 }
        );
      }
      updateData.note_text = noteText.trim();
    }

    // Handle photo removal
    let updatedPhotoUrls = [...(existingNote.photo_urls || [])];
    if (removePhotoUrls.length > 0) {
      // Delete photos from storage
      await cleanupNotePhotos(supabase, removePhotoUrls);
      // Remove from array
      updatedPhotoUrls = updatedPhotoUrls.filter(url => !removePhotoUrls.includes(url));
    }

    // Handle new photo uploads
    if (photos.length > 0) {
      // Check total photo count
      if (updatedPhotoUrls.length + photos.length > MAX_PHOTOS) {
        return NextResponse.json(
          { success: false, error: `Maximum ${MAX_PHOTOS} photos allowed per note` },
          { status: 400 }
        );
      }

      const newPhotoUrls: string[] = [];

      for (const photo of photos) {
        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(photo.type)) {
          // Cleanup already uploaded photos
          if (newPhotoUrls.length > 0) {
            await cleanupNotePhotos(supabase, newPhotoUrls);
          }
          return NextResponse.json(
            { success: false, error: `Invalid file type: ${photo.type}. Allowed: jpeg, png, heic` },
            { status: 400 }
          );
        }

        // Validate file size
        if (photo.size > MAX_FILE_SIZE) {
          // Cleanup already uploaded photos
          if (newPhotoUrls.length > 0) {
            await cleanupNotePhotos(supabase, newPhotoUrls);
          }
          return NextResponse.json(
            { success: false, error: `File ${photo.name} exceeds maximum size of 10MB` },
            { status: 400 }
          );
        }

        // Upload to Supabase Storage
        const timestamp = Date.now();
        const fileExt = photo.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${existingNote.recipe_id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recipe-notes-photos')
          .upload(filePath, photo, {
            contentType: photo.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          // Cleanup already uploaded photos
          if (newPhotoUrls.length > 0) {
            await cleanupNotePhotos(supabase, newPhotoUrls);
          }
          return NextResponse.json(
            { success: false, error: `Failed to upload photo: ${uploadError.message}` },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('recipe-notes-photos')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          newPhotoUrls.push(urlData.publicUrl);
        }
      }

      // Combine existing and new photos
      updatedPhotoUrls = [...updatedPhotoUrls, ...newPhotoUrls];
    }

    // Update photo URLs if changed
    if (photos.length > 0 || removePhotoUrls.length > 0) {
      updateData.photo_urls = updatedPhotoUrls;
    }

    // Update note
    const { data: updatedNote, error: updateError } = await supabase
      .from('recipe_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating note:', updateError);
      return errorResponse(updateError);
    }

    // Get user name for response
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    const formattedNote: RecipeNote = {
      id: updatedNote.id,
      recipe_id: updatedNote.recipe_id,
      user_id: updatedNote.user_id,
      note_text: updatedNote.note_text,
      photo_urls: updatedNote.photo_urls || [],
      recipe_title: updatedNote.recipe_title,
      recipe_image_url: updatedNote.recipe_image_url,
      created_at: updatedNote.created_at,
      updated_at: updatedNote.updated_at,
      user_name: userData?.name || 'Unknown',
    };

    return NextResponse.json(
      {
        success: true,
        note: formattedNote,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update note API error:', error);
    return errorResponse(error);
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note and its photos
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[DELETE Note] Starting delete request');
    const supabase = createClient();
    const noteId = params.id;
    console.log('[DELETE Note] Note ID:', noteId);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Validate noteId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!noteId || !uuidRegex.test(noteId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

    // Verify note exists and user owns it
    const { data: note, error: fetchError } = await supabase
      .from('recipe_notes')
      .select('photo_urls')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check ownership (RLS should handle this, but double-check)
    const { data: noteWithUser } = await supabase
      .from('recipe_notes')
      .select('user_id')
      .eq('id', noteId)
      .single();

    if (noteWithUser?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own notes' },
        { status: 403 }
      );
    }

    // Delete photos from storage
    if (note.photo_urls && note.photo_urls.length > 0) {
      await cleanupNotePhotos(supabase, note.photo_urls);
    }

    // Delete note (CASCADE will handle any other cleanup)
    const { error: deleteError } = await supabase
      .from('recipe_notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return errorResponse(deleteError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Note deleted successfully',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DELETE Note] Error:', error);
    // Ensure we always return JSON, even on unexpected errors
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete note' },
        { status: 500 }
      );
    }
    return errorResponse(error);
  }
}


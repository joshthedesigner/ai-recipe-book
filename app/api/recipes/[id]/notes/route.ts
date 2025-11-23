/**
 * Recipe Notes API Route
 * 
 * GET /api/recipes/[id]/notes - Fetch all notes for a recipe
 * POST /api/recipes/[id]/notes - Create a new note with photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/db/supabaseServer';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/utils/rateLimit';
import { errorResponse } from '@/utils/errorHandler';
import { cleanupNotePhotos } from '@/utils/photoCleanup';
import { getYouTubeThumbnail } from '@/utils/youtubeHelpers';
import { RecipeNote } from '@/types';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];

/**
 * GET /api/recipes/[id]/notes
 * Fetch all notes for a recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const recipeId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Validate recipeId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!recipeId || !uuidRegex.test(recipeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipe ID format' },
        { status: 400 }
      );
    }

    // Fetch notes with user names
    const { data: notes, error: notesError } = await supabase
      .from('recipe_notes')
      .select(`
        id,
        recipe_id,
        user_id,
        note_text,
        photo_urls,
        recipe_title,
        recipe_image_url,
        created_at,
        updated_at,
        users!recipe_notes_user_id_fkey(name)
      `)
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return errorResponse(notesError);
    }

    // Format notes with user names
    const formattedNotes: RecipeNote[] = (notes || []).map((note: any) => ({
      id: note.id,
      recipe_id: note.recipe_id,
      user_id: note.user_id,
      note_text: note.note_text,
      photo_urls: note.photo_urls || [],
      recipe_title: note.recipe_title,
      recipe_image_url: note.recipe_image_url,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_name: note.users?.name || 'Unknown',
    }));

    return NextResponse.json(
      {
        success: true,
        notes: formattedNotes,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Recipe notes API error:', error);
    return errorResponse(error);
  }
}

/**
 * POST /api/recipes/[id]/notes
 * Create a new note with photos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const recipeId = params.id;

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
      RATE_LIMITS.general, // Using general limit (30 req/min)
      user.id
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Validate recipeId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!recipeId || !uuidRegex.test(recipeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipe ID format' },
        { status: 400 }
      );
    }

    // Verify recipe exists and user owns it (only owners can add notes)
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, title, image_url, video_url, user_id')
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Only recipe owner can add notes
    if (recipe.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the recipe owner can add notes' },
        { status: 403 }
      );
    }

    // Determine recipe image URL: use image_url if available, otherwise generate YouTube thumbnail
    let recipeImageUrl = recipe.image_url;
    if (!recipeImageUrl && recipe.video_url) {
      recipeImageUrl = getYouTubeThumbnail(recipe.video_url) || null;
    }

    // Parse form data
    const formData = await request.formData();
    const noteText = formData.get('note_text') as string;
    const photos = formData.getAll('photos') as File[];

    // Validate note text
    if (!noteText || noteText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Note text is required' },
        { status: 400 }
      );
    }

    if (noteText.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Note text exceeds maximum length of 5000 characters' },
        { status: 400 }
      );
    }

    // Validate photos
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_PHOTOS} photos allowed per note` },
        { status: 400 }
      );
    }

    // Validate and upload photos
    const photoUrls: string[] = [];
    const uploadedFiles: string[] = []; // Track uploaded files for cleanup

    for (const photo of photos) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(photo.type)) {
        // Cleanup already uploaded photos
        if (photoUrls.length > 0) {
          await cleanupNotePhotos(supabase, photoUrls);
        }
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${photo.type}. Allowed: jpeg, png, heic` },
          { status: 400 }
        );
      }

      // Validate file size
      if (photo.size > MAX_FILE_SIZE) {
        // Cleanup already uploaded photos
        if (photoUrls.length > 0) {
          await cleanupNotePhotos(supabase, photoUrls);
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
      const filePath = `${user.id}/${recipeId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recipe-notes-photos')
        .upload(filePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        // Cleanup already uploaded photos
        if (photoUrls.length > 0) {
          await cleanupNotePhotos(supabase, photoUrls);
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
        photoUrls.push(urlData.publicUrl);
        uploadedFiles.push(filePath);
      }
    }

    // Create note record
    const { data: note, error: noteError } = await supabase
      .from('recipe_notes')
      .insert({
        recipe_id: recipeId,
        user_id: user.id,
        note_text: noteText.trim(),
        photo_urls: photoUrls,
        recipe_title: recipe.title, // Denormalize
        recipe_image_url: recipeImageUrl, // Denormalize (image_url or YouTube thumbnail)
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating note:', noteError);
      // Cleanup uploaded photos
      if (photoUrls.length > 0) {
        await cleanupNotePhotos(supabase, photoUrls);
      }
      return errorResponse(noteError);
    }

    // Get user name for response
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    const formattedNote: RecipeNote = {
      id: note.id,
      recipe_id: note.recipe_id,
      user_id: note.user_id,
      note_text: note.note_text,
      photo_urls: note.photo_urls || [],
      recipe_title: note.recipe_title,
      recipe_image_url: note.recipe_image_url,
      created_at: note.created_at,
      updated_at: note.updated_at,
      user_name: userData?.name || 'Unknown',
    };

    return NextResponse.json(
      {
        success: true,
        note: formattedNote,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create note API error:', error);
    return errorResponse(error);
  }
}


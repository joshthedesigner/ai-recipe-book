'use client';

import { useState, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';

interface ImageQueueItem {
  file: File;
  preview: string;
  id: string;
}

interface AddNoteFormProps {
  recipeId: string;
  onNoteAdded: () => void;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];

export default function AddNoteForm({ recipeId, onNoteAdded }: AddNoteFormProps) {
  const [noteText, setNoteText] = useState('');
  const [imageQueue, setImageQueue] = useState<ImageQueueItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check if adding these files would exceed limit
    const remainingSlots = MAX_IMAGES - imageQueue.length;
    if (remainingSlots === 0) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    // Process each selected file
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    filesToAdd.forEach((file) => {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        alert(`Invalid file type: ${file.type}. Allowed: jpeg, png, heic`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} exceeds maximum size of 10MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: ImageQueueItem = {
          file,
          preview: reader.result as string,
          id: `${Date.now()}-${Math.random()}`,
        };
        setImageQueue((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    setImageQueue((prev) => prev.filter((img) => id !== img.id));
  };

  const handleSubmit = async () => {
    if ((!noteText.trim() && imageQueue.length === 0) || submitting) return;

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('note_text', noteText.trim());

      // Add photos to form data
      imageQueue.forEach((img) => {
        formData.append('photos', img.file);
      });

      const response = await fetch(`/api/recipes/${recipeId}/notes`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create note');
      }

      if (data.success) {
        // Reset form
        setNoteText('');
        setImageQueue([]);
        onNoteAdded();
      } else {
        throw new Error(data.error || 'Failed to create note');
      }
    } catch (err) {
      console.error('Error creating note:', err);
      alert(err instanceof Error ? err.message : 'Failed to create note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Add a Note
      </Typography>

      {/* Image Thumbnails Preview */}
      {imageQueue.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {imageQueue.map((img) => (
            <Box
              key={img.id}
              sx={{
                position: 'relative',
                width: 60,
                height: 60,
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                component="img"
                src={img.preview}
                alt="Preview"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveImage(img.id)}
                disabled={submitting}
                sx={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  width: 20,
                  height: 20,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
          {imageQueue.length < MAX_IMAGES && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {imageQueue.length}/{MAX_IMAGES} images
            </Typography>
          )}
        </Box>
      )}

      {/* Input Area */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* Image Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          multiple
          onChange={handleImageSelect}
          disabled={submitting || imageQueue.length >= MAX_IMAGES}
          style={{ display: 'none' }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || imageQueue.length >= MAX_IMAGES}
          sx={{
            bgcolor: 'transparent',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            width: 40,
            height: 40,
          }}
        >
          <ImageIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Note Text Input */}
        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder="Share your thoughts about this recipe..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={submitting}
          variant="outlined"
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={handleSubmit}
                disabled={(!noteText.trim() && imageQueue.length === 0) || submitting}
                sx={{
                  bgcolor: (noteText.trim() || imageQueue.length > 0) && !submitting ? 'primary.main' : 'transparent',
                  color: (noteText.trim() || imageQueue.length > 0) && !submitting ? 'white' : 'text.disabled',
                  '&:hover': {
                    bgcolor: (noteText.trim() || imageQueue.length > 0) && !submitting ? 'primary.dark' : 'transparent',
                  },
                  width: 36,
                  height: 36,
                  mr: -0.5,
                }}
              >
                {submitting ? (
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                ) : (
                  <SendIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            ),
          }}
        />
      </Box>
    </Box>
  );
}


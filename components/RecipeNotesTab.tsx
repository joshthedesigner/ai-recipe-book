'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { RecipeNote } from '@/types';
import AddNoteForm from './AddNoteForm';
import NoteCard from './NoteCard';

interface RecipeNotesTabProps {
  recipeId: string;
  onNotesCountChange?: (count: number) => void;
  canAddNotes?: boolean; // Only recipe owner can add notes
}

export default function RecipeNotesTab({ recipeId, onNotesCountChange, canAddNotes = false }: RecipeNotesTabProps) {
  const [notes, setNotes] = useState<RecipeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/recipes/${recipeId}/notes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notes');
      }

      if (data.success) {
        setNotes(data.notes || []);
        onNotesCountChange?.(data.notes?.length || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch notes');
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipeId) {
      fetchNotes();
    }
  }, [recipeId]);

  const handleNoteAdded = () => {
    fetchNotes(); // Refresh notes list
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Add Note Form - Only show for recipe owner */}
      {canAddNotes && (
        <AddNoteForm recipeId={recipeId} onNoteAdded={handleNoteAdded} />
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            {canAddNotes 
              ? 'No notes yet. Be the first to add one!'
              : 'No notes yet.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 4 }}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}


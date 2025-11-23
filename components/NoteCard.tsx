'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  CircularProgress,
  ImageList,
  ImageListItem,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import { RecipeNote } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface NoteCardProps {
  note: RecipeNote;
  onNoteUpdated: () => void;
  onNoteDeleted: () => void;
}

// Simple relative time formatter
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default function NoteCard({ note, onNoteUpdated, onNoteDeleted }: NoteCardProps) {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.note_text);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwnNote = note.user_id === user?.id;
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditText(note.note_text);
    setIsEditing(true);
    handleMenuClose();
  };

  const handleCancelEdit = () => {
    setEditText(note.note_text);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || saving) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('note_text', editText.trim());

      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update note');
      }

      if (data.success) {
        setIsEditing(false);
        onNoteUpdated();
      } else {
        throw new Error(data.error || 'Failed to update note');
      }
    } catch (err) {
      console.error('Error updating note:', err);
      alert(err instanceof Error ? err.message : 'Failed to update note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      if (data.success) {
        setDeleteDialogOpen(false);
        onNoteDeleted();
      } else {
        throw new Error(data.error || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete note. Please try again.');
      setDeleting(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <Box
      sx={{
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <PersonIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {note.user_name || 'Unknown'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(note.created_at)}
              {note.updated_at !== note.created_at && ' (edited)'}
            </Typography>
          </Box>
        </Box>
        {isOwnNote && (
          <>
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleDeleteClick}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* Note Text */}
      {isEditing ? (
        <Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            disabled={saving}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={16} /> : <CheckIcon />}
              onClick={handleSaveEdit}
              disabled={!editText.trim() || saving}
            >
              Save
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            mb: note.photo_urls && note.photo_urls.length > 0 ? 2 : 0,
          }}
        >
          {note.note_text}
        </Typography>
      )}

      {/* Photos */}
      {note.photo_urls && note.photo_urls.length > 0 && !isEditing && (
        <ImageList cols={note.photo_urls.length > 1 ? 2 : 1} gap={8} sx={{ mt: 2 }}>
          {note.photo_urls.map((url, index) => (
            <ImageListItem key={index}>
              <img
                src={url}
                alt={`Note photo ${index + 1}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 8,
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        title="Note"
        dialogTitle="Delete Note?"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting}
        confirmText="Delete"
      />
    </Box>
  );
}


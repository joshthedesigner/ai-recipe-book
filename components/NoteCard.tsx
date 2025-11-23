'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { RecipeNote } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface NoteCardProps {
  note: RecipeNote;
  onNoteDeleted?: () => void;
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

export default function NoteCard({ note, onNoteDeleted }: NoteCardProps) {
  const { user } = useAuth();
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwnNote = note.user_id === user?.id;
  const menuOpen = Boolean(anchorEl);

  const handleImageClick = (url: string) => {
    setExpandedImage(url);
  };

  const handleCloseExpanded = () => {
    setExpandedImage(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          url: response.url,
          text: text.substring(0, 500), // First 500 chars
        });
        throw new Error(`Server error (${response.status}): ${response.statusText}. Check console for details.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      if (data.success) {
        setDeleteDialogOpen(false);
        onNoteDeleted?.();
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

      {/* Photos */}
      {note.photo_urls && note.photo_urls.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {note.photo_urls.map((url, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: index < note.photo_urls!.length - 1 ? 2 : 0,
                position: 'relative',
                display: 'inline-block',
                width: '25%', // Match image width
              }}
            >
              <img
                src={url}
                alt={`Note photo ${index + 1}`}
                loading="lazy"
                onClick={() => handleImageClick(url)}
                style={{
                  width: '100%', // Fill the container
                  height: 'auto',
                  borderRadius: 8,
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              />
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick(url);
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  width: 28,
                  height: 28,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                  },
                }}
              >
                <FullscreenIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Expanded Image Dialog */}
      <Dialog
        open={Boolean(expandedImage)}
        onClose={handleCloseExpanded}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
            border: 'none',
            outline: 'none',
            m: 0,
            maxWidth: '90vw',
            maxHeight: '90vh',
          },
        }}
        sx={{
          '& .MuiBackdrop-root': {
            bgcolor: 'rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
          }}
        >
          <IconButton
            onClick={handleCloseExpanded}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded note photo"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>

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


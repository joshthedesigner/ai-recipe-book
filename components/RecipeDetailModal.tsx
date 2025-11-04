'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material';
import AppButton from './AppButton';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Recipe } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (recipeId: string) => void;
}

export default function RecipeDetailModal({ recipe, open, onClose, onDelete }: RecipeDetailModalProps) {
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!recipe) return null;

  const handleDelete = async () => {
    if (!recipe.id) return;

    setDeleting(true);
    
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showToast('Recipe deleted successfully', 'success');
        onDelete?.(recipe.id);
        onClose();
        setConfirmDelete(false);
      } else {
        showToast('Failed to delete recipe: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      showToast('Failed to delete recipe. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RestaurantIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" component="div">
            {recipe.title}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {recipe.tags.map((tag) => (
              <Chip key={tag} label={tag} size="medium" color="primary" variant="outlined" />
            ))}
          </Box>
        )}

        {/* Metadata */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            👨‍🍳 Added by {recipe.contributor_name}
          </Typography>
          {recipe.created_at && (
            <Typography variant="body2" color="text.secondary">
              📅 Added on {new Date(recipe.created_at).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Ingredients */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Ingredients ({recipe.ingredients.length})
        </Typography>
        <List dense sx={{ mb: 3 }}>
          {recipe.ingredients.map((ingredient, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <CheckCircleIcon sx={{ mr: 1.5, fontSize: 18, color: 'success.main' }} />
              <ListItemText 
                primary={ingredient}
                primaryTypographyProps={{ variant: 'body1' }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 3 }} />

        {/* Steps */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Instructions ({recipe.steps.length} steps)
        </Typography>
        <List sx={{ mb: 2 }}>
          {recipe.steps.map((step, index) => (
            <ListItem key={index} alignItems="flex-start" sx={{ py: 1.5 }}>
              <Box
                sx={{
                  minWidth: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {index + 1}
              </Box>
              <ListItemText 
                primary={step}
                primaryTypographyProps={{ variant: 'body1', lineHeight: 1.6 }}
              />
            </ListItem>
          ))}
        </List>

        {/* Source Link / Cookbook Info */}
        {recipe.cookbook_name && (
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              📖 From: <strong>{recipe.cookbook_name}</strong>
              {recipe.cookbook_page && `, Page ${recipe.cookbook_page}`}
            </Typography>
          </Box>
        )}
        {!recipe.cookbook_name && recipe.source_url && (
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              View Original Source
            </Button>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      {onDelete && (
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          {!confirmDelete ? (
            <>
              <Box />
              <AppButton
                variant="secondary"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                sx={{ 
                  color: 'error.main', 
                  borderColor: 'error.main',
                  '&:hover': { 
                    borderColor: 'error.dark',
                    backgroundColor: 'rgba(211, 47, 47, 0.04)'
                  } 
                }}
              >
                Delete Recipe
              </AppButton>
            </>
          ) : (
            <>
              <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                Are you sure? This cannot be undone.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <AppButton
                  variant="secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  size="small"
                >
                  Cancel
                </AppButton>
                <AppButton
                  variant="primary"
                  onClick={handleDelete}
                  disabled={deleting}
                  startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                  size="small"
                  sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </AppButton>
              </Box>
            </>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}


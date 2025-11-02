'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Recipe } from '@/types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipe, open, onClose }: RecipeDetailModalProps) {
  if (!recipe) return null;

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
            {recipe.is_ai_generated ? (
              <>🤖 AI Generated Recipe</>
            ) : (
              <>👨‍🍳 Added by {recipe.contributor_name}</>
            )}
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

        {/* Source Link */}
        {recipe.source_url && (
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
    </Dialog>
  );
}


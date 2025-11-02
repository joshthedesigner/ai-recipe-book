'use client';

import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, compact = false, onClick }: RecipeCardProps) {
  // Grid view (for browse page) - compact, clickable card
  if (compact) {
    return (
      <Card 
        elevation={2} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardActionArea onClick={onClick} sx={{ flexGrow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <RestaurantIcon sx={{ mr: 1, color: 'primary.main', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {recipe.title}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {recipe.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
              ))}
              {recipe.tags.length > 3 && (
                <Chip label={`+${recipe.tags.length - 3}`} size="small" variant="outlined" />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary">
              📝 {recipe.ingredients.length} ingredients
            </Typography>
            <Typography variant="body2" color="text.secondary">
              👨‍🍳 {recipe.steps.length} steps
            </Typography>

            <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                {recipe.is_ai_generated ? '🤖 AI Generated' : `By ${recipe.contributor_name}`}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <RestaurantIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" component="div">
            {recipe.title}
          </Typography>
        </Box>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {recipe.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
            ))}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Ingredients */}
        <Typography variant="h6" gutterBottom>
          Ingredients ({recipe.ingredients.length})
        </Typography>
        <List dense>
          {recipe.ingredients.slice(0, 10).map((ingredient, index) => (
            <ListItem key={index}>
              <CheckCircleIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
              <ListItemText primary={ingredient} />
            </ListItem>
          ))}
          {recipe.ingredients.length > 10 && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              ...and {recipe.ingredients.length - 10} more
            </Typography>
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Steps */}
        <Typography variant="h6" gutterBottom>
          Instructions ({recipe.steps.length} steps)
        </Typography>
        <List>
          {recipe.steps.slice(0, 5).map((step, index) => (
            <ListItem key={index} alignItems="flex-start">
              <Box
                sx={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </Box>
              <ListItemText primary={step} />
            </ListItem>
          ))}
          {recipe.steps.length > 5 && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
              ...{recipe.steps.length - 5} more steps
            </Typography>
          )}
        </List>

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {recipe.is_ai_generated ? (
              <>🤖 AI Generated Recipe</>
            ) : (
              <>👨‍🍳 Added by {recipe.contributor_name}</>
            )}
            {recipe.source_url && (
              <>
                {' • '}
                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                  View Source
                </a>
              </>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}


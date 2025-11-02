'use client';

import { useState, MouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
  Typography,
  Chip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText as MenuItemText,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
  onClick?: () => void;
  onDelete?: (recipeId: string) => void;
}

export default function RecipeCard({ recipe, compact = false, onClick, onDelete }: RecipeCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent card click
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: MouseEvent) => {
    event?.stopPropagation(); // Prevent card click
    setAnchorEl(null);
  };

  const handleDelete = (event: MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    handleMenuClose();
    if (recipe.id && onDelete) {
      onDelete(recipe.id);
    }
  };

  // Extract and format domain name from URL
  const getSourceName = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      // Remove 'www.' prefix
      const cleanDomain = domain.replace(/^www\./, '');
      // Get the main domain name (before first dot)
      const mainName = cleanDomain.split('.')[0];
      // Capitalize first letter
      return mainName.charAt(0).toUpperCase() + mainName.slice(1);
    } catch {
      return 'Source';
    }
  };

  const handleSourceClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent card click
  };
  // Grid view (for browse page) - compact, clickable card
  if (compact) {
    return (
      <Card 
        elevation={0} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
          position: 'relative',
          bgcolor: 'white',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardActionArea onClick={onClick} sx={{ flexGrow: 1 }}>
          {recipe.image_url ? (
            <CardMedia
              component="img"
              height="200"
              image={recipe.image_url}
              alt={recipe.title}
              sx={{
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                height: 200,
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RestaurantIcon sx={{ fontSize: 60, color: 'grey.400' }} />
            </Box>
          )}
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
                {recipe.title}
              </Typography>
              {onDelete && (
                <IconButton
                  size="small"
                  onClick={handleMenuClick}
                  sx={{
                    mt: -0.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {recipe.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
              ))}
              {recipe.tags.length > 3 && (
                <Chip label={`+${recipe.tags.length - 3}`} size="small" variant="outlined" />
              )}
            </Box>

            <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                By {recipe.contributor_name}
              </Typography>
              {recipe.cookbook_name ? (
                <Typography 
                  variant="caption"
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600,
                  }}
                >
                  📖 {recipe.cookbook_name}{recipe.cookbook_page ? `, p${recipe.cookbook_page}` : ''}
                </Typography>
              ) : recipe.source_url ? (
                <Typography 
                  component="a" 
                  href={recipe.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleSourceClick}
                  variant="caption"
                  sx={{ 
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {getSourceName(recipe.source_url)}
                </Typography>
              ) : null}
            </Box>
          </CardContent>
        </CardActionArea>

        {/* Overflow Menu */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={(e) => handleMenuClose(e as MouseEvent)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <MenuItemText>Delete</MenuItemText>
          </MenuItem>
        </Menu>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ mb: 3, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

        {/* Recipe Image */}
        <Box sx={{ mt: 2, mb: 2 }}>
          {recipe.image_url ? (
            <CardMedia
              component="img"
              image={recipe.image_url}
              alt={recipe.title}
              sx={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 1,
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: 300,
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}
            >
              <RestaurantIcon sx={{ fontSize: 80, color: 'grey.400' }} />
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Ingredients */}
        <Typography variant="h6" gutterBottom>
          Ingredients ({recipe.ingredients.length})
        </Typography>
        <List dense>
          {recipe.ingredients.map((ingredient, index) => (
            <ListItem key={index}>
              <CheckCircleIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
              <ListItemText primary={ingredient} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Steps */}
        <Typography variant="h6" gutterBottom>
          Instructions ({recipe.steps.length} steps)
        </Typography>
        <List>
          {recipe.steps.map((step, index) => (
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
        </List>

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            👨‍🍳 Added by {recipe.contributor_name}
            {recipe.cookbook_name && (
              <>
                {' • '}
                📖 {recipe.cookbook_name}{recipe.cookbook_page ? `, Page ${recipe.cookbook_page}` : ''}
              </>
            )}
            {!recipe.cookbook_name && recipe.source_url && (
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


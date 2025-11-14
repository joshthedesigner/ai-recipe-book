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
  Button,
  CircularProgress,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';
import { Recipe } from '@/types';
import { getYouTubeThumbnail } from '@/utils/youtubeHelpers';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
  onClick?: () => void;
  onDelete?: (recipeId: string) => void;
  onAdd?: (recipeId: string, e: React.MouseEvent) => void; // Add callback for friend pages
  loading?: 'lazy' | 'eager';
  showFriendBadge?: boolean;
  showFriendHeader?: boolean; // Show friend name/date overlaid on image
  isEmbedded?: boolean; // If true, removes border/elevation (card is inside another card)
  isFriendView?: boolean; // If true, show Add button instead of overflow menu
  isAdded?: boolean; // If true, show "Added" state
  isAdding?: boolean; // If true, show loading state
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

export default function RecipeCard({ recipe, compact = false, onClick, onDelete, onAdd, loading = 'lazy', showFriendBadge = false, showFriendHeader = false, isEmbedded = false, isFriendView = false, isAdded = false, isAdding = false }: RecipeCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Get image URL - prefer recipe image, fallback to YouTube thumbnail
  const getImageUrl = (): string | null => {
    if (recipe.image_url) return recipe.image_url;
    if (recipe.video_url) return getYouTubeThumbnail(recipe.video_url);
    return null;
  };

  const imageUrl = getImageUrl();

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
          bgcolor: isEmbedded ? 'transparent' : 'white',
          border: isEmbedded ? 'none' : '1px solid',
          borderColor: 'divider',
          borderRadius: isEmbedded ? 0 : 1,
          '&:hover': isEmbedded ? {} : {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        {/* Add button for friend pages OR Menu button for own recipes */}
        {isFriendView && onAdd && recipe.id ? (
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(recipe.id!, e);
            }}
            disabled={isAdding || isAdded}
            startIcon={isAdding ? <CircularProgress size={16} /> : isAdded ? <CheckIcon /> : null}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: isAdded ? 'success.main' : 'white',
              color: isAdded ? 'white' : 'text.primary',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Drop shadow to stand out from image
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 90,
              opacity: 1, // Fully opaque
              '&:hover': {
                bgcolor: isAdded ? 'success.dark' : 'grey.100',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // Slightly stronger on hover
              },
              '&.Mui-disabled': {
                bgcolor: isAdded ? 'success.main' : 'white',
                color: isAdded ? 'white' : 'text.primary',
                opacity: 1, // Fully opaque even when disabled
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Keep shadow when disabled
              },
            }}
          >
            {isAdded ? 'Added' : 'Add'}
          </Button>
        ) : onDelete ? (
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ) : null}
        
        <CardActionArea onClick={onClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {/* Image with optional friend header overlay */}
          <Box sx={{ position: 'relative' }}>
            {imageUrl ? (
              <CardMedia
                component="img"
                height={isEmbedded ? "356" : "200"}
                image={imageUrl}
                alt={recipe.title}
                loading={loading}
                sx={{
                  objectFit: 'cover',
                  borderRadius: isEmbedded ? 0 : undefined,
                }}
              />
            ) : (
              <Box
                sx={{
                  height: isEmbedded ? 356 : 200,
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: isEmbedded ? 0 : undefined,
                }}
              >
                <RestaurantIcon sx={{ fontSize: 60, color: 'grey.400' }} />
              </Box>
            )}
            
            {/* Friend Header Overlay */}
            {showFriendHeader && recipe.friend_name && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '1rem',
                    border: '2px solid white',
                  }}
                >
                  {recipe.friend_name.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600, 
                      lineHeight: 1.2, 
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {recipe.friend_name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {recipe.created_at && formatRelativeTime(recipe.created_at)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
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

            <Box sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              {/* Friend Badge */}
              {showFriendBadge && recipe.friend_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {recipe.friend_name}
                  </Typography>
                  {recipe.created_at && (
                    <>
                      <Typography variant="caption" color="text.secondary">•</Typography>
                      <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(recipe.created_at)}
                      </Typography>
                    </>
                  )}
                </Box>
              )}
              
              {/* Contributor and Source */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                {!showFriendBadge && (
                  <Typography variant="caption" color="text.secondary">
                    By {recipe.contributor_name}
                  </Typography>
                )}
                {recipe.cookbook_name ? (
                <Typography 
                  variant="caption"
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  📖 {recipe.cookbook_name}{recipe.cookbook_page ? `, p${recipe.cookbook_page}` : ''}
                </Typography>
              ) : recipe.source_url ? (
                <Box 
                  component="a" 
                  href={recipe.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleSourceClick}
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Typography 
                    variant="caption"
                    sx={{ 
                      fontWeight: 600,
                    }}
                  >
                    {getSourceName(recipe.source_url)}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Box>
              ) : null}
              </Box>
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
          {imageUrl ? (
            <CardMedia
              component="img"
              image={imageUrl}
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
                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  View Source
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </a>
              </>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}


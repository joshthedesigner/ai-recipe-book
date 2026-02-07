'use client';

import { useState, MouseEvent, useRef, useEffect } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText as MenuItemText,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { Recipe } from '@/types';
import { getYouTubeThumbnail, getYouTubeThumbnailSrcSet } from '@/utils/youtubeHelpers';
import { useToast } from '@/contexts/ToastContext';

interface RecipeCardProps {
  recipe: Recipe;
  compact?: boolean;
  onClick?: () => void;
  onDelete?: (recipeId: string) => void;
  onAdd?: (recipeId: string, e: React.MouseEvent) => void; // Add callback for friend pages
  onFavoriteToggle?: (recipeId: string, isFavorite: boolean) => void; // Callback for favorite toggle
  loading?: 'lazy' | 'eager';
  showFriendBadge?: boolean;
  showFriendHeader?: boolean; // Show friend name/date overlaid on image
  isEmbedded?: boolean; // If true, removes border/elevation (card is inside another card)
  isFriendView?: boolean; // If true, show Add button instead of overflow menu
  isAdded?: boolean; // If true, show "Added" state
  isAdding?: boolean; // If true, show loading state
  isNew?: boolean; // If true, show red dot indicator for new recipe
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

export default function RecipeCard({ recipe, compact = false, onClick, onDelete, onAdd, onFavoriteToggle, loading = 'lazy', showFriendBadge = false, showFriendHeader = false, isEmbedded = false, isFriendView = false, isAdded = false, isAdding = false, isNew = false }: RecipeCardProps) {
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleTagsCount, setVisibleTagsCount] = useState<number>(recipe.tags?.length || 0);
  // Optimistic favorite state - updates immediately on click
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean>(recipe.is_favorite || false);

  // Get image URL - prefer recipe image, fallback to YouTube thumbnail
  const getImageUrl = (): string | null => {
    if (recipe.image_url) return recipe.image_url;
    if (recipe.video_url) return getYouTubeThumbnail(recipe.video_url);
    return null;
  };

  // Get responsive srcset for YouTube thumbnails
  const getImageSrcSet = (): string | null => {
    if (recipe.video_url) return getYouTubeThumbnailSrcSet(recipe.video_url);
    return null;
  };

  const imageUrl = getImageUrl();
  const imageSrcSet = getImageSrcSet();
  
  // Calculate image dimensions for layout stability
  // Compact cards: 250px height, aspect ratio ~16:9 for YouTube thumbnails
  // Use fixed dimensions to prevent layout shift
  const compactImageWidth = 500;
  const compactImageHeight = 250;
  const embeddedImageWidth = 445; // Desktop default
  const embeddedImageHeight = 445;

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

  // Sync optimistic state when recipe prop changes
  useEffect(() => {
    setOptimisticFavorite(recipe.is_favorite || false);
  }, [recipe.is_favorite]);

  const handleToggleFavorite = async (event: MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    handleMenuClose();
    if (!recipe.id) return;

    // Optimistically update UI immediately
    const newFavoriteState = !optimisticFavorite;
    setOptimisticFavorite(newFavoriteState);

    try {
      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Update to actual state from server
        setOptimisticFavorite(data.is_favorite);
        showToast(
          data.is_favorite ? 'Added to favorites' : 'Removed from favorites',
          'success'
        );
        // Notify parent component
        if (onFavoriteToggle) {
          onFavoriteToggle(recipe.id, data.is_favorite);
        }
      } else {
        // Revert optimistic update on failure
        setOptimisticFavorite(!newFavoriteState);
        showToast('Failed to update favorite', 'error');
      }
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticFavorite(!newFavoriteState);
      console.error('Error toggling favorite:', error);
      showToast('Failed to update favorite', 'error');
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

  // Measure how many tags fit in the available space
  useEffect(() => {
    if (!compact || !recipe.tags || recipe.tags.length === 0 || showFriendBadge) {
      setVisibleTagsCount(recipe.tags?.length || 0);
      return;
    }

    const measureTags = () => {
      if (!tagsContainerRef.current) return;

      const container = tagsContainerRef.current;
      const containerWidth = container.offsetWidth;
      
      // If container hasn't been laid out yet, skip measurement
      // (will retry on next resize/raf)
      if (containerWidth === 0) {
        return;
      }

      // Measure the actual source/cookbook element width if it exists
      const parent = container.parentElement;
      let reservedWidth = 0;
      if (parent) {
        // Find the source/cookbook element (sibling after the tags container)
        const sourceElement = Array.from(parent.children).find(
          (child) => child !== container && child.textContent && child.textContent.trim().length > 0
        ) as HTMLElement | undefined;
        
        if (sourceElement && sourceElement.offsetWidth > 0) {
          reservedWidth = sourceElement.offsetWidth + 16; // Add gap (gap: 1 = 8px, so 16px for both sides)
        } else {
          // Fallback: use a smaller estimate if no source element
          reservedWidth = 80;
        }
      } else {
        reservedWidth = 80;
      }
      
      const availableWidth = containerWidth - reservedWidth;
      
      // Only prevent showing tags if there's truly no space (less than 40px)
      if (availableWidth < 40) {
        setVisibleTagsCount(0);
        return;
      }

      // Create a temporary container with matching font family
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.whiteSpace = 'nowrap';
      tempContainer.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      document.body.appendChild(tempContainer);

      let totalWidth = 0;
      let count = 0;
      const gap = 4; // 0.5 * 8px
      const overflowChipWidth = 50; // Estimate for +X chip
      const safetyMargin = 4; // Reduced safety margin (was 8px)

      for (let i = 0; i < recipe.tags.length; i++) {
        const tag = recipe.tags[i];
        
        // Create a temporary chip with better matching styling
        const tempChip = document.createElement('span');
        tempChip.style.display = 'inline-block';
        tempChip.style.padding = '6px 12px'; // MUI small Chip padding
        tempChip.style.fontSize = '0.75rem';
        tempChip.style.fontWeight = '400';
        tempChip.style.fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        tempChip.style.border = '1px solid';
        tempChip.style.borderRadius = '16px';
        tempChip.style.whiteSpace = 'nowrap';
        tempChip.style.lineHeight = '20px'; // MUI Chip line height
        tempChip.textContent = tag;
        tempContainer.appendChild(tempChip);
        
        const chipWidth = tempChip.offsetWidth;
        tempContainer.removeChild(tempChip);
        
        const widthWithGap = chipWidth + (count > 0 ? gap : 0);
        const needsOverflow = i < recipe.tags.length - 1;
        const overflowWidth = needsOverflow ? overflowChipWidth + gap : 0;
        const widthNeeded = totalWidth + widthWithGap + overflowWidth + (count === 0 ? safetyMargin : 0); // Only apply safety margin to first tag
        
        // Check if this tag (and overflow if needed) fits
        if (widthNeeded <= availableWidth) {
          totalWidth += widthWithGap;
          count++;
        } else {
          break;
        }
      }

      document.body.removeChild(tempContainer);
      
      // Ensure at least 1 tag shows if we have tags and reasonable space
      // Only show 0 if availableWidth is very small (< 50px) or no tags fit the measurement
      if (count === 0 && availableWidth >= 50) {
        // If we have space but measurement said no tags fit, show at least 1 (might be a measurement issue)
        setVisibleTagsCount(1);
      } else {
        setVisibleTagsCount(count);
      }
    };

    // Use requestAnimationFrame to ensure layout is complete
    let rafId: number;
    const measureWithDelay = () => {
      rafId = requestAnimationFrame(() => {
        measureTags();
      });
    };

    // Initial measurement with delay
    measureWithDelay();

    // Re-measure on resize
    const resizeObserver = new ResizeObserver(() => {
      measureWithDelay();
    });
    
    if (tagsContainerRef.current?.parentElement) {
      resizeObserver.observe(tagsContainerRef.current.parentElement);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [compact, recipe.tags, showFriendBadge]);

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
            startIcon={isAdding ? <CircularProgress size={16} /> : isAdded ? <CheckIcon /> : <BookmarkIcon />}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              bgcolor: isAdded ? 'success.main' : 'white',
              color: isAdded ? 'white' : 'text.primary',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', // Lighter, softer drop shadow
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 90,
              opacity: 1, // Fully opaque
              '& .MuiButton-startIcon': {
                marginRight: '4px', // Reduce gap by 4px (default is 8px, so 8-4=4)
              },
              '&:hover': {
                bgcolor: isAdded ? 'success.dark' : 'grey.100',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)', // Slightly stronger on hover
              },
              '&.Mui-disabled': {
                bgcolor: isAdded ? 'success.main' : 'white',
                color: isAdded ? 'white' : 'text.primary',
                opacity: 1, // Fully opaque even when disabled
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', // Keep shadow when disabled
              },
            }}
          >
            {isAdded ? 'Saved' : 'Save'}
          </Button>
        ) : onDelete ? (
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              pointerEvents: 'auto',
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'grey.200',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ) : null}
        
        {/* New Recipe Indicator - Red Dot */}
        {isNew && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: 'error.main',
              border: '2px solid white',
              zIndex: 2,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          />
        )}
        
        <CardActionArea onClick={onClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {/* Image with optional friend header overlay */}
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            {imageUrl ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: isEmbedded 
                    ? { xs: 296, md: 445 }  // Mobile: 296 (237 * 1.25), Desktop: 445 (356 * 1.25) - increased by 1/4
                    : 250,  // Increased from 200 to 250 (25% increase)
                  borderRadius: isEmbedded ? 0 : undefined,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={imageUrl}
                  srcSet={imageSrcSet || undefined}
                  sizes={isEmbedded 
                    ? '(max-width: 960px) 296px, 445px'
                    : '(max-width: 600px) 100vw, (max-width: 960px) 50vw, 500px'}
                  alt={recipe.title}
                  width={isEmbedded ? embeddedImageWidth : compactImageWidth}
                  height={isEmbedded ? embeddedImageHeight : compactImageHeight}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  loading={loading}
                  fetchPriority={loading === 'eager' ? 'high' : 'auto'}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  height: isEmbedded 
                    ? { xs: 296, md: 445 }  // Mobile: 296 (237 * 1.25), Desktop: 445 (356 * 1.25) - increased by 1/4
                    : 250,  // Increased from 200 to 250 (25% increase)
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
              {onFavoriteToggle && (
                <IconButton
                  size="small"
                  onClick={handleToggleFavorite}
                  sx={{
                    flexShrink: 0,
                    color: optimisticFavorite ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: optimisticFavorite ? 'primary.dark' : 'primary.main',
                    },
                  }}
                >
                  {optimisticFavorite ? (
                    <BookmarkIcon fontSize="small" />
                  ) : (
                    <BookmarkBorderIcon fontSize="small" />
                  )}
                </IconButton>
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
              
              {/* Source Link and Tags */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                {recipe.cookbook_name ? (
                <Typography 
                  variant="caption"
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  📖 {recipe.cookbook_name}{recipe.cookbook_page ? `, p${recipe.cookbook_page}` : ''}
                </Typography>
              ) : recipe.source_url ? (
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography 
                    variant="body2"
                    component="a"
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleSourceClick}
                    sx={{ 
                      color: 'text.secondary',
                      textDecoration: 'none',
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {getSourceName(recipe.source_url)}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                </Box>
              ) : null}
                {!showFriendBadge && recipe.tags && recipe.tags.length > 0 && (
                  <Box 
                    ref={tagsContainerRef}
                    sx={{ 
                      display: 'flex', 
                      gap: 0.5, 
                      flexWrap: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {recipe.tags.slice(0, visibleTagsCount).map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ 
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      />
                    ))}
                    {recipe.tags.length > visibleTagsCount && (
                      <Tooltip
                        title={recipe.tags.slice(visibleTagsCount).join(', ')}
                        arrow
                        placement="top"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              bgcolor: 'white',
                              color: 'text.primary',
                              border: '1px solid',
                              borderColor: 'divider',
                              boxShadow: 2,
                            }
                          },
                          arrow: {
                            sx: {
                              color: 'white',
                              '&::before': {
                                border: '1px solid',
                                borderColor: 'divider',
                              }
                            }
                          }
                        }}
                      >
                        <Chip 
                          label={`+${recipe.tags.length - visibleTagsCount}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            flexShrink: 0,
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.04)',
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                )}
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
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: { xs: 250, sm: 300, md: 400 },
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <img
                src={imageUrl}
                srcSet={imageSrcSet || undefined}
                sizes="(max-width: 600px) 100vw, (max-width: 960px) 80vw, 800px"
                alt={recipe.title}
                width={800}
                height={400}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                loading={loading}
                fetchPriority={loading === 'eager' ? 'high' : 'auto'}
              />
            </Box>
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

        {/* Ingredients / Steps - section-aware */}
        {recipe.sections && recipe.sections.length > 0 ? (
          <>
            {(() => {
              // Check if sections have any instruction sections
              const hasInstructionSections = recipe.sections.some(s => s.steps && s.steps.length > 0);
              
              return (
                <>
                  {recipe.sections.map((section, sIdx) => (
                    <Box key={sIdx} sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {section.title || 'Section'}
                      </Typography>
                      {section.ingredients && section.ingredients.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Ingredients ({section.ingredients.length})
                          </Typography>
                          <List dense>
                            {section.ingredients.map((ing, i) => (
                              <ListItem key={i}>
                                <CheckCircleIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                                <ListItemText primary={ing} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                      {section.steps && section.steps.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                            Instructions ({section.steps.length} steps)
                          </Typography>
                          <List>
                            {section.steps.map((st, i) => (
                              <ListItem key={i} alignItems="flex-start">
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
                                  {i + 1}
                                </Box>
                                <ListItemText primary={st} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                      {sIdx < recipe.sections!.length - 1 && <Divider sx={{ my: 2 }} />}
                    </Box>
                  ))}
                  
                  {/* Fallback: If sections exist but no instruction sections found, render flat steps */}
                  {!hasInstructionSections && recipe.steps && recipe.steps.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
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
                    </>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <>
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
          </>
        )}

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


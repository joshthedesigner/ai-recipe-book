'use client';

import { useState, useEffect, MouseEvent } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText as MenuItemText,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TopNav from '@/components/TopNav';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Recipe } from '@/types';
import { supabase } from '@/db/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { extractYouTubeId } from '@/utils/youtubeHelpers';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const recipeId = params.id as string;
  const menuOpen = Boolean(anchorEl);
  
  // Check if recipe belongs to current user
  const isOwnRecipe = recipe?.user_id === user?.id;

  // Check if user came from feed
  const fromFeed = searchParams.get('from') === 'feed';

  // Smart back navigation
  const handleBack = () => {
    if (fromFeed) {
      router.push('/feed'); // Return to feed, scroll position will be restored
    } else {
      router.push('/browse'); // Default to browse
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

  // Format timestamp in MM:SS format
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle timestamp click - seek embedded video to timestamp using PostMessage API
  const handleTimestampClick = (timestampSeconds: number) => {
    if (!recipe?.video_url || recipe.video_platform !== 'youtube') return;
    
    const videoId = extractYouTubeId(recipe.video_url);
    if (!videoId) return;
    
    const iframeId = `youtube-player-${videoId}`;
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    
    if (!iframe?.contentWindow) {
      // Fallback: open in new tab if iframe not available
      const timestampUrl = `${recipe.video_url}&t=${timestampSeconds}s`;
      window.open(timestampUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    try {
      // Use YouTube's PostMessage API to control the embedded player
      // This works with enablejsapi=1 in the iframe src
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [timestampSeconds, true], // true = allowSeekAhead
        }),
        'https://www.youtube.com'
      );
      
      // Play video after seeking
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: [],
        }),
        'https://www.youtube.com'
      );
    } catch (error) {
      console.error('Failed to seek video:', error);
      // Fallback: open in new tab
      const timestampUrl = `${recipe.video_url}&t=${timestampSeconds}s`;
      window.open(timestampUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMenuClick = (event: MouseEvent<HTMLElement>) => {
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
    if (!recipe?.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        handleBack(); // Go back to previous page
      } else {
        throw new Error(data.error || 'Failed to delete recipe');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Handle adding recipe to own cookbook
  const handleAddRecipe = async () => {
    if (!recipe?.id || isAdded) return;
    
    setIsAdding(true);
    try {
      const response = await fetch('/api/recipes/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      });

      const data = await response.json();

      if (data.success) {
        // Mark recipe as added (button change is enough confirmation)
        setIsAdded(true);
      } else {
        showToast(data.error || 'Failed to add recipe', 'error');
      }
    } catch (err) {
      console.error('Error adding recipe:', err);
      showToast('Failed to add recipe', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (!recipeId || !user) return;

    const fetchRecipe = async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error) {
        console.error('Error fetching recipe:', error);
        setLoading(false);
        return;
      }

      setRecipe(data);
      setLoading(false);
    };

    fetchRecipe();
  }, [recipeId, user]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!recipe) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
          <Typography variant="h5">Recipe not found</Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            Back
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      {/* White Bar - Header Section */}
      <Box sx={{ width: '100%', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="xl">
          {/* Back Button */}
          <Box sx={{ pt: 3, pb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ 
                textTransform: 'none',
                color: 'black',
                '&:hover': {
                  bgcolor: 'transparent',
                  color: 'black',
                  opacity: 0.7,
                },
              }}
            >
              Back
            </Button>
          </Box>

          {/* Title and Buttons */}
          <Box sx={{ pb: 4 }}>
            {/* Title Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h3" sx={{ fontWeight: 600, fontSize: '2.125rem' }}>
                {recipe.title}
              </Typography>
              
              {/* Show delete menu only for own recipes */}
              {isOwnRecipe && (
                <IconButton
                  onClick={handleMenuClick}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              )}
            </Box>

            {/* Action Buttons - Below Title, Left Aligned */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Show Add button for recipes that don't belong to user */}
              {!isOwnRecipe && (
                <Button
                  variant={fromFeed ? "outlined" : "contained"}
                  color={fromFeed ? undefined : "primary"}
                  startIcon={isAdding ? <CircularProgress size={16} /> : isAdded ? <CheckIcon /> : <BookmarkIcon />}
                  onClick={handleAddRecipe}
                  disabled={isAdding || isAdded}
                  sx={{
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 400,
                    opacity: 1,
                    '& .MuiButton-startIcon': {
                      marginRight: '4px', // Reduce gap by 4px (default is 8px, so 8-4=4)
                    },
                    ...(fromFeed && !isAdded && {
                      color: 'text.secondary',
                      borderColor: 'text.secondary',
                      '&:hover': {
                        borderColor: 'text.secondary',
                        bgcolor: 'action.hover',
                      },
                    }),
                    ...(isAdded && {
                      bgcolor: 'success.main',
                      color: 'white',
                      borderColor: 'success.main',
                      '&.Mui-disabled': {
                        bgcolor: 'success.main',
                        color: 'white',
                        borderColor: 'success.main',
                        opacity: 1,
                      },
                    }),
                  }}
                >
                  {isAdded ? 'Saved' : 'Save'}
                </Button>
              )}

              {/* Source Link */}
              {recipe.source_url && (
                <Button
                  variant="outlined"
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '1rem' }} />}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 400,
                    color: 'text.secondary',
                    borderColor: 'text.secondary',
                    '&:hover': {
                      borderColor: 'text.secondary',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {getSourceName(recipe.source_url)}
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Video Embed - Priority over image */}
        {recipe.video_url && recipe.video_platform === 'youtube' && (
          <Box
            sx={{
              width: { xs: '100%', md: '66.67%' },
              aspectRatio: '16/9',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
              bgcolor: 'black',
            }}
          >
            <iframe
              id={`youtube-player-${extractYouTubeId(recipe.video_url)}`}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${extractYouTubeId(recipe.video_url)}?enablejsapi=1`}
              title={recipe.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ display: 'block', border: 'none' }}
            />
          </Box>
        )}

        {/* Hero Image - Only show if no video */}
        {!recipe.video_url && recipe.image_url && (
          <Box
            sx={{
              width: { xs: '100%', md: '66.67%' },
              height: 425,
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
              position: 'relative',
            }}
          >
            <img
              src={recipe.image_url}
              alt={recipe.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        )}

        {/* Tags - Below image/video */}
        {recipe.tags && recipe.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 5 }}>
            {recipe.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="medium"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {/* Ingredients and Instructions - Prefer sections when available (two columns) */}
        {Array.isArray((recipe as any).sections) && (recipe as any).sections.length > 0 ? (
          <Grid container spacing={4}>
            {/* Ingredients column */}
            <Grid item xs={12} md={4}>
              <Box sx={{ pr: { xs: 0, md: 6 }, maxWidth: '100%' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Ingredients
                </Typography>
                {(recipe as any).sections.map((section: any, idx: number) => (
                  Array.isArray(section.ingredients) && section.ingredients.length > 0 ? (
                    <Box key={`ing-${idx}`} sx={{ mb: 3 }}>
                      {section.title && (
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {section.title}
                        </Typography>
                      )}
                      <List sx={{ pl: 2, maxWidth: '100%' }}>
                        {section.ingredients.map((ingredient: string, index: number) => (
                          <ListItem
                            key={index}
                            sx={{
                              py: 0.5,
                              px: 0,
                              display: 'list-item',
                              listStyleType: 'disc',
                              listStylePosition: 'outside',
                              ml: 2,
                              maxWidth: '100%',
                            }}
                          >
                            <Typography
                              variant="body1"
                              component="div"
                              sx={{
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                hyphens: 'auto',
                                maxWidth: '100%',
                              }}
                            >
                              {ingredient}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ) : null
                ))}
              </Box>
            </Grid>

            {/* Divider between columns - hidden on mobile */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: 'none', md: 'block' },
                mx: -2,
              }}
            />

            {/* Instructions column */}
            <Grid item xs={12} md={8}>
              <Box sx={{ pl: { xs: 0, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Instructions
                </Typography>
                {(recipe as any).sections.map((section: any, idx: number) => (
                  Array.isArray(section.steps) && section.steps.length > 0 ? (
                    <Box key={`steps-${idx}`} sx={{ mb: 3 }}>
                      {section.title && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {section.title}
                          </Typography>
                          {section.timestamp !== undefined && recipe.video_url && recipe.video_platform === 'youtube' && (
                            <Button
                              size="small"
                              startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleTimestampClick(section.timestamp)}
                              sx={{
                                textTransform: 'none',
                                minWidth: 'auto',
                                px: 1.5,
                                py: 0.5,
                                fontSize: '0.75rem',
                                color: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              {formatTimestamp(section.timestamp)}
                            </Button>
                          )}
                        </Box>
                      )}
                      <List sx={{ pl: 2 }}>
                        {section.steps.map((step: string, index: number) => (
                          <ListItem
                            key={index}
                            sx={{
                              py: 1,
                              px: 0,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  color: 'primary.main',
                                  minWidth: 30,
                                  flexShrink: 0,
                                }}
                              >
                                {index + 1}.
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{
                                  flex: 1,
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                }}
                              >
                                {step}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ) : null
                ))}
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={4}>
            {/* Ingredients - 1/3 width */}
            <Grid item xs={12} md={4}>
              <Box sx={{ pr: { xs: 0, md: 6 }, maxWidth: '100%' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Ingredients
                </Typography>
                <List sx={{ pl: 2, maxWidth: '100%' }}>
                  {recipe.ingredients.map((ingredient, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        py: 0.5,
                        px: 0,
                        display: 'list-item',
                        listStyleType: 'disc',
                        listStylePosition: 'outside',
                        ml: 2,
                        maxWidth: '100%',
                      }}
                    >
                      <Typography
                        variant="body1"
                        component="div"
                        sx={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          maxWidth: '100%',
                        }}
                      >
                        {ingredient}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>

            {/* Divider between columns - hidden on mobile */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: 'none', md: 'block' },
                mx: -2,
              }}
            />

            {/* Instructions - 2/3 width */}
            <Grid item xs={12} md={8}>
              <Box sx={{ pl: { xs: 0, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Instructions
                </Typography>
                <List sx={{ pl: 2 }}>
                  {recipe.steps.map((step, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        py: 1,
                        px: 0,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: 'primary.main',
                            minWidth: 30,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}.
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            flex: 1,
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {step}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Cookbook Info */}
        {recipe.cookbook_name && (
          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              From: {recipe.cookbook_name}
              {recipe.cookbook_page && ` (Page ${recipe.cookbook_page})`}
            </Typography>
          </Box>
        )}
      </Container>

      {/* Overflow Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <MenuItemText primary="Delete Recipe" />
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        title={recipe?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting}
      />
    </Box>
  );
}



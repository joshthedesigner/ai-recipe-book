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
  Tabs,
  Tab,
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
import RecipeChat from '@/components/RecipeChat';
import RecipeNotesTab from '@/components/RecipeNotesTab';
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
  const [activeTab, setActiveTab] = useState<'recipe' | 'notes'>('recipe');
  const [notesCount, setNotesCount] = useState(0);
  const recipeId = params.id as string;
  const menuOpen = Boolean(anchorEl);
  
  // Check if recipe belongs to current user
  const isOwnRecipe = recipe?.user_id === user?.id;

  // Check if user came from feed
  const fromFeed = searchParams.get('from') === 'feed';
  
  // Check for tab query param (for navigation from feed notes)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'notes') {
      setActiveTab('notes');
    }
  }, [searchParams]);

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
      // Capitalize first letter of each word
      return cleanDomain.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('.');
    } catch {
      return 'Source';
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

      // Track recipe view in localStorage for "Recently Viewed" sorting
      if (data?.id && typeof window !== 'undefined') {
        try {
          const STORAGE_KEY = 'recipeRecentlyViewed';
          const stored = localStorage.getItem(STORAGE_KEY);
          const viewed: Record<string, number> = stored ? JSON.parse(stored) : {};
          viewed[data.id] = Date.now();
          // Keep only the last 100 viewed recipes
          const entries = Object.entries(viewed)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 100);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
        } catch (error) {
          console.warn('Error tracking recipe view:', error);
        }
      }
    };

    fetchRecipe();
  }, [recipeId, user]);

  // Fetch notes count on page load (for badge display)
  useEffect(() => {
    if (!recipeId || !user) return;

    const fetchNotesCount = async () => {
      try {
        const response = await fetch(`/api/recipes/${recipeId}/notes`);
        const data = await response.json();

        if (response.ok && data.success) {
          setNotesCount(data.notes?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching notes count:', err);
        // Silently fail - badge will just show 0
      }
    };

    fetchNotesCount();
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

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Single fixed-width container for all content */}
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          {/* Header: Source URL and Delete button */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              {/* Source URL */}
              {recipe.source_url && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    component="a"
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                    Via {getSourceName(recipe.source_url)}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                </Box>
              )}
              
              {/* Delete button - only for own recipes */}
              {isOwnRecipe && (
                <Button
                  onClick={handleDeleteClick}
                  startIcon={<DeleteIcon sx={{ fontSize: '1rem' }} />}
                  sx={{
                    textTransform: 'none',
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    minWidth: 'auto',
                    px: 1,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'error.main',
                    },
                  }}
                >
                  Delete
                </Button>
              )}
            </Box>
          </Box>

          {/* Centered Title */}
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              mb: 4,
              fontSize: { xs: '1.875rem', md: '2.5rem' },
            }}
          >
            {recipe.title}
          </Typography>

          {/* Large Image/Video */}
          {recipe.video_url && recipe.video_platform === 'youtube' ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: '900px',
                aspectRatio: '16/9',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 5,
                mx: 'auto',
                bgcolor: 'black',
                position: 'relative',
              }}
            >
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${extractYouTubeId(recipe.video_url)}`}
                title={recipe.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ display: 'block', border: 'none' }}
              />
            </Box>
          ) : recipe.image_url ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: '900px',
                height: { xs: 300, sm: 400, md: 500 },
                borderRadius: 2,
                overflow: 'hidden',
                mb: 5,
                mx: 'auto',
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
                  display: 'block',
                }}
              />
            </Box>
          ) : null}

          {/* Tabs: Recipe / Notes */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                centered
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    minHeight: 48,
                  },
                }}
              >
              <Tab label="Recipe" value="recipe" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Notes</span>
                    {notesCount > 0 && (
                      <Box
                        sx={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: '10px',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          px: 0.75,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {notesCount > 99 ? '99+' : notesCount}
                      </Box>
                    )}
                  </Box>
                }
                value="notes"
              />
              </Tabs>
            </Box>
          </Box>

          {/* Tab Content */}
          {activeTab === 'recipe' && (
            <>
              {/* Ingredients and Instructions - Two columns with colored bars */}
              {Array.isArray((recipe as any).sections) && (recipe as any).sections.length > 0 ? (
                <Grid container spacing={17}>
                {/* Ingredients column */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      {/* Colored vertical bar */}
                      <Box
                        sx={{
                          width: '4px',
                          height: '1.5em',
                          bgcolor: 'primary.main',
                          borderRadius: '2px',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Ingredients
                      </Typography>
                    </Box>
                    <Box>
                      {(recipe as any).sections.map((section: any, idx: number) => (
                        Array.isArray(section.ingredients) && section.ingredients.length > 0 ? (
                          <Box key={`ing-${idx}`} sx={{ mb: 3 }}>
                            {section.title && (
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                                {section.title}
                              </Typography>
                            )}
                            <List sx={{ pl: 0 }}>
                              {section.ingredients.map((ingredient: string, index: number) => (
                                <ListItem
                                  key={index}
                                  sx={{
                                    py: 1.5,
                                    px: 0,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                                    <Typography
                                      variant="body1"
                                      sx={{
                                        flex: 1,
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        lineHeight: 1.6,
                                      }}
                                    >
                                      {ingredient}
                                    </Typography>
                                  </Box>
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ) : null
                      ))}
                    </Box>
                  </Box>
                </Grid>

                {/* Instructions column */}
                <Grid item xs={12} md={8}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      {/* Colored vertical bar - using a muted/secondary color */}
                      <Box
                        sx={{
                          width: '4px',
                          height: '1.5em',
                          bgcolor: 'text.secondary',
                          borderRadius: '2px',
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Instructions
                      </Typography>
                    </Box>
                    <Box>
                      {(recipe as any).sections.map((section: any, idx: number) => (
                        Array.isArray(section.steps) && section.steps.length > 0 ? (
                          <Box key={`steps-${idx}`} sx={{ mb: 3 }}>
                            {section.title && (
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                                {section.title}
                              </Typography>
                            )}
                            <List sx={{ pl: 0 }}>
                              {section.steps.map((step: string, index: number) => (
                                <ListItem
                                  key={index}
                                  sx={{
                                    py: 1.5,
                                    px: 0,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        minWidth: 32,
                                        flexShrink: 0,
                                        mt: 0.25,
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
                                        lineHeight: 1.6,
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
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={17}>
                {/* Ingredients column */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      {/* Colored vertical bar */}
                      <Box
                        sx={{
                          width: '4px',
                          height: '1.5em',
                          bgcolor: 'primary.main',
                          borderRadius: '2px',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Ingredients
                      </Typography>
                    </Box>
                    <Box>
                      <List sx={{ pl: 0 }}>
                        {recipe.ingredients.map((ingredient, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              py: 1.5,
                              px: 0,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  flex: 1,
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  lineHeight: 1.6,
                                }}
                              >
                                {ingredient}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                </Grid>

                {/* Instructions column */}
                <Grid item xs={12} md={8}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      {/* Colored vertical bar */}
                      <Box
                        sx={{
                          width: '4px',
                          height: '1.5em',
                          bgcolor: 'text.secondary',
                          borderRadius: '2px',
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Instructions
                      </Typography>
                    </Box>
                    <Box>
                      <List sx={{ pl: 0 }}>
                        {recipe.steps.map((step, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              py: 1.5,
                              px: 0,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  color: 'text.secondary',
                                  minWidth: 32,
                                  flexShrink: 0,
                                  mt: 0.25,
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
                                  lineHeight: 1.6,
                                }}
                              >
                                {step}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Cookbook Info */}
            {recipe.cookbook_name && (
              <Box sx={{ mt: 5, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  From: {recipe.cookbook_name}
                  {recipe.cookbook_page && ` (Page ${recipe.cookbook_page})`}
                </Typography>
              </Box>
            )}
          </>
        )}

        {activeTab === 'notes' && (
          <RecipeNotesTab
            recipeId={recipeId}
            onNotesCountChange={setNotesCount}
            canAddNotes={isOwnRecipe}
          />
        )}
        </Box>
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

      {/* Recipe Chat FAB */}
      {recipe && (
        <RecipeChat recipeId={recipeId} recipe={recipe} />
      )}
    </Box>
  );
}

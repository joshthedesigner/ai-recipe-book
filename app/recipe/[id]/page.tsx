'use client';

import { useState, useEffect, MouseEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import TopNav from '@/components/TopNav';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Recipe } from '@/types';
import { supabase } from '@/db/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const recipeId = params.id as string;
  const menuOpen = Boolean(anchorEl);

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
        router.push('/browse');
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
        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          <Typography variant="h5">Recipe not found</Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/browse')}
            sx={{ mt: 2 }}
          >
            Back to Recipes
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/browse')}
          sx={{ 
            mb: 3,
            textTransform: 'none',
            color: 'black',
            '&:hover': {
              bgcolor: 'transparent',
              color: 'black',
              opacity: 0.7,
            },
          }}
        >
          Back to Recipes
        </Button>

        {/* Hero Image */}
        {recipe.image_url && (
          <Box
            sx={{
              width: '100%',
              height: 400,
              borderRadius: 2,
              overflow: 'hidden',
              mb: 4,
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

        {/* Title and Tags */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 600, fontSize: '2.125rem' }}>
              {recipe.title}
            </Typography>
            
            <IconButton
              onClick={handleMenuClick}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
          
          {recipe.source_url && (
            <Button
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
              sx={{ 
                textTransform: 'none',
                fontSize: '1.5rem',
                fontWeight: 400,
                p: 0,
                mb: 2,
                '&:hover': {
                  bgcolor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              {getSourceName(recipe.source_url)}
            </Button>
          )}
          
          {recipe.tags && recipe.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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

          {recipe.contributor_name && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Added by {recipe.contributor_name}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Ingredients */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Ingredients
          </Typography>
          <List sx={{ pl: 2 }}>
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
                }}
              >
                <ListItemText
                  primary={ingredient}
                  primaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Instructions */}
        <Box sx={{ mb: 4 }}>
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
                    }}
                  >
                    {index + 1}.
                  </Typography>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    {step}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>

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



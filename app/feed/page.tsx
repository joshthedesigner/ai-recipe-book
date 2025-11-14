'use client';

/**
 * Friends Feed Page
 * 
 * Displays recipes from all friends in chronological order
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  IconButton,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';

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

export default function FeedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { groups, switchGroup } = useGroup();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRecipe, setAddingRecipe] = useState<string | null>(null); // Track which recipe is being added
  const [addedRecipes, setAddedRecipes] = useState<Set<string>>(new Set()); // Track which recipes have been added
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Handle clicking on friend name - navigate to their cookbook
  const handleFriendClick = (friendName: string) => {
    const friendGroupName = `${friendName}'s recipes`;
    const friendGroup = groups.find(g => g.isFriend && g.name === friendGroupName);
    
    if (friendGroup) {
      switchGroup(friendGroup.id);
      router.push('/browse');
    } else {
      showToast('Could not find friend\'s cookbook', 'error');
    }
  };

  // Handle clicking on recipe card - navigate to full page
  const handleRecipeClick = (recipe: Recipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  // Handle adding recipe to own cookbook
  const handleAddRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!recipeId || addedRecipes.has(recipeId)) return;
    
    try {
      setAddingRecipe(recipeId);
      
      const response = await fetch('/api/recipes/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Recipe added to your cookbook!', 'success');
        // Mark recipe as added
        setAddedRecipes(prev => new Set([...prev, recipeId]));
      } else {
        showToast(data.error || 'Failed to add recipe', 'error');
      }
    } catch (err) {
      console.error('Error adding recipe:', err);
      showToast('Failed to add recipe', 'error');
    } finally {
      setAddingRecipe(null);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch initial feed recipes
  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        setOffset(0);
        
        const response = await fetch('/api/recipes/friends?offset=0');
        const data = await response.json();

        if (data.success) {
          setRecipes(data.recipes || []);
          setHasMore(data.hasMore || false);
          
          // Show friendly message if no friends yet (only once)
          if (data.message && data.recipes?.length === 0) {
            showToast(data.message, 'info');
          }
        } else {
          setError(data.error || 'Failed to load feed');
          showToast(data.error || 'Failed to load feed', 'error');
        }
      } catch (err) {
        console.error('Error fetching feed:', err);
        setError('Unable to connect to server');
        showToast('Unable to connect to server', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [user]); // Removed showToast from dependencies to prevent reload loop

  // Load more recipes
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + 6;
      
      const response = await fetch(`/api/recipes/friends?offset=${newOffset}`);
      const data = await response.json();

      if (data.success) {
        setRecipes(prev => [...prev, ...(data.recipes || [])]);
        setHasMore(data.hasMore || false);
        setOffset(newOffset);
      }
    } catch (err) {
      console.error('Error loading more recipes:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset]);

  // Infinite scroll - detect when near bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      // Load more when within 300px of bottom
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Show loading state
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ mb: 3 }}>
                <RecipeCardSkeleton />
              </Box>
            ))}
          </Box>
        )}

        {/* Empty State - No Friends */}
        {!loading && recipes.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 2,
            }}
          >
            <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No recipes yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Add friends to see their recipes here!
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/friends')}
              sx={{ textTransform: 'none' }}
            >
              Add Friends
            </Button>
          </Box>
        )}

        {/* Recipe Feed - Stacked Cards */}
        {!loading && recipes.length > 0 && (
          <Box>
            {recipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                elevation={0}
                sx={{ 
                  mb: 3,
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Friend Header - Above Image */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    p: 2,
                    pb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                    }}
                  >
                    {recipe.friend_name?.charAt(0).toUpperCase() || 'F'}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body1" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFriendClick(recipe.friend_name || recipe.contributor_name);
                      }}
                      sx={{ 
                        fontWeight: 600, 
                        lineHeight: 1.2,
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.main',
                        },
                      }}
                    >
                      {recipe.friend_name || recipe.contributor_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {recipe.created_at && formatRelativeTime(recipe.created_at)}
                    </Typography>
                  </Box>
                  
                  {/* Add to Cookbook Button */}
                  {addedRecipes.has(recipe.id!) ? (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckIcon />}
                      disabled
                      sx={{ 
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 90,
                        bgcolor: 'success.main',
                        color: 'white',
                        '&.Mui-disabled': {
                          bgcolor: 'success.main',
                          color: 'white',
                          opacity: 0.9,
                        },
                      }}
                    >
                      Added
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={addingRecipe === recipe.id ? <CircularProgress size={16} /> : <AddIcon />}
                      onClick={(e) => handleAddRecipe(recipe.id!, e)}
                      disabled={addingRecipe === recipe.id}
                      sx={{ 
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 90,
                      }}
                    >
                      Add
                    </Button>
                  )}
                </Box>

                {/* Recipe Card Content */}
                <RecipeCard 
                  recipe={recipe}
                  compact={true}
                  showFriendHeader={false}
                  isEmbedded={true}
                  onClick={() => handleRecipeClick(recipe)}
                />
              </Card>
            ))}

            {/* Loading More Indicator */}
            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* End of Feed Message */}
            {!hasMore && recipes.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  You've seen all recent recipes from your friends
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}


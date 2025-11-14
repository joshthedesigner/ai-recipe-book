'use client';

/**
 * Friends Feed Page
 * 
 * Displays recipes from all friends in chronological order
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function FeedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch feed recipes
  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/recipes/friends');
        const data = await response.json();

        if (data.success) {
          setRecipes(data.recipes || []);
          
          // Show friendly message if no friends yet
          if (data.message) {
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
  }, [user, showToast]);

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
      
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Friends' Recipes
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            See what your friends are cooking
          </Typography>
        </Box>

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
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
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {recipes.map((recipe) => (
              <Box key={recipe.id} sx={{ mb: 3 }}>
                <RecipeCard 
                  recipe={recipe}
                  compact={true}
                  showFriendHeader={true}
                />
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}


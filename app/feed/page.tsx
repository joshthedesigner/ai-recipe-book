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
  Card,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
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
  const [error, setError] = useState<string | null>(null);

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
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Friends' Recipes
          </Typography>
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
                </Box>

                {/* Recipe Card Content */}
                <RecipeCard 
                  recipe={recipe}
                  compact={true}
                  showFriendHeader={false}
                  isEmbedded={true}
                />
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}


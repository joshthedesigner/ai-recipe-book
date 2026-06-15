'use client';

/**
 * Feed Page
 *
 * "All" tab — all public recipes from every user
 * "Friends" tab — recipes from friends only
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
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PublicIcon from '@mui/icons-material/Public';
import CheckIcon from '@mui/icons-material/Check';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import FeedNoteCard from '@/components/FeedNoteCard';
import { Recipe, FeedItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';

type FeedFilter = 'all' | 'friends';

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

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [recipes, setRecipes] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRecipe, setAddingRecipe] = useState<string | null>(null);
  const [addedRecipes, setAddedRecipes] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const apiUrl = filter === 'all' ? '/api/feed/public' : '/api/recipes/friends';

  const handleFriendClick = (friendName: string) => {
    const friendGroup = groups.find(g => g.isFriend && g.name === `${friendName}'s recipes`);
    if (friendGroup) {
      switchGroup(friendGroup.id);
      router.push('/browse');
    } else {
      showToast("Could not find their cookbook", 'error');
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('feedScrollPosition', String(window.scrollY));
    }
    router.push(`/recipe/${recipe.id}?from=feed`);
  };

  const handleNoteClick = (note: FeedItem) => {
    if (note.type === 'note' && note.recipe_id) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('feedScrollPosition', String(window.scrollY));
      }
      router.push(`/recipe/${note.recipe_id}?from=feed&tab=notes`);
    }
  };

  const handleAddRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
        setAddedRecipes(prev => new Set([...prev, recipeId]));
      } else {
        showToast(data.error || 'Failed to save recipe', 'error');
      }
    } catch {
      showToast('Failed to save recipe', 'error');
    } finally {
      setAddingRecipe(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Re-fetch whenever filter changes
  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        setOffset(0);
        setRecipes([]);

        const response = await fetch(`${apiUrl}?offset=0`);
        const data = await response.json();

        if (data.success) {
          setRecipes(data.feedItems || data.recipes || []);
          setHasMore(data.hasMore || false);
          if (data.message && (data.feedItems || data.recipes)?.length === 0) {
            showToast(data.message, 'info');
          }
        } else {
          setError(data.error || 'Failed to load feed');
        }
      } catch {
        setError('Unable to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [user, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll position when returning from recipe page
  useEffect(() => {
    if (typeof window === 'undefined' || loading) return;
    const savedPosition = sessionStorage.getItem('feedScrollPosition');
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedPosition, 10));
        sessionStorage.removeItem('feedScrollPosition');
      }, 100);
    }
  }, [loading]);

  // Mark as viewed
  useEffect(() => {
    if (!user || !recipes.length || loading) return;
    let marked = false;
    const markViewed = async () => {
      if (marked) return;
      marked = true;
      try {
        await fetch('/api/feed/mark-viewed', { method: 'POST' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('feedViewed'));
        }
      } catch {}
    };
    const onScroll = () => { if (window.scrollY > 200) markViewed(); };
    window.addEventListener('scroll', onScroll, { once: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [user, recipes, loading]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const newOffset = offset + (filter === 'all' ? 10 : 6);
      const response = await fetch(`${apiUrl}?offset=${newOffset}`);
      const data = await response.json();
      if (data.success) {
        setRecipes(prev => [...prev, ...(data.feedItems || data.recipes || [])]);
        setHasMore(data.hasMore || false);
        setOffset(newOffset);
      }
    } catch {}
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, offset, apiUrl, filter]);

  useEffect(() => {
    const onScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 300) loadMore();
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore]);

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

  if (!user) return null;

  const emptyState = filter === 'all' ? (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
      <PublicIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>No recipes yet</Typography>
      <Typography variant="body1" color="text.secondary">
        Be the first to add a recipe!
      </Typography>
    </Box>
  ) : (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
      <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>No friend recipes yet</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Add friends to see their recipes here!
      </Typography>
      <Button variant="contained" onClick={() => router.push('/friends')} sx={{ textTransform: 'none' }}>
        Add Friends
      </Button>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>

        {/* Filter Toggle */}
        <Box sx={{ maxWidth: 625, mx: 'auto', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              bgcolor: 'grey.100',
              borderRadius: '100px',
              p: 0.5,
              gap: 0.5,
            }}
          >
            {(['all', 'friends'] as FeedFilter[]).map((f) => (
              <Box
                key={f}
                component="button"
                onClick={() => setFilter(f)}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '100px',
                  px: 2.5,
                  py: 0.75,
                  fontSize: '14px',
                  fontWeight: filter === f ? 600 : 400,
                  bgcolor: filter === f ? 'white' : 'transparent',
                  color: filter === f ? 'text.primary' : 'text.secondary',
                  boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                {f === 'all' ? 'All' : 'Friends'}
              </Box>
            ))}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading && (
          <Box sx={{ maxWidth: 625, mx: 'auto' }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ mb: 3 }}><RecipeCardSkeleton /></Box>
            ))}
          </Box>
        )}

        {!loading && recipes.length === 0 && emptyState}

        {!loading && recipes.length > 0 && (
          <Box sx={{ maxWidth: 625, mx: 'auto' }}>
            {recipes.map((item) => {
              if (item.type === 'note') {
                return (
                  <FeedNoteCard
                    key={item.id}
                    note={item}
                    onClick={() => handleNoteClick(item)}
                  />
                );
              }

              const recipe = item as Recipe;
              return (
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
                  {/* Poster Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, pb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {recipe.friend_name?.charAt(0).toUpperCase() || '?'}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography
                          component="span"
                          variant="body1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFriendClick(recipe.friend_name || recipe.contributor_name);
                          }}
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1.2,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline', color: 'primary.main' },
                          }}
                        >
                          {recipe.friend_name || recipe.contributor_name}
                        </Typography>
                        <Typography component="span" variant="body1" sx={{ fontWeight: 400, lineHeight: 1.2 }}>
                          added a new recipe
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {recipe.created_at && formatRelativeTime(recipe.created_at)}
                      </Typography>
                    </Box>

                    {/* Save Button */}
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
                          opacity: 1,
                          '&.Mui-disabled': { bgcolor: 'success.main', color: 'white', opacity: 1 },
                        }}
                      >
                        Saved
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={addingRecipe === recipe.id ? <CircularProgress size={16} /> : <BookmarkIcon />}
                        onClick={(e) => handleAddRecipe(recipe.id!, e)}
                        disabled={addingRecipe === recipe.id}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          minWidth: 90,
                          color: 'text.secondary',
                          borderColor: 'text.secondary',
                          '& .MuiButton-startIcon': { marginRight: '4px' },
                          '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
                          '&.Mui-disabled': { opacity: 1, color: 'text.secondary', borderColor: 'text.secondary' },
                        }}
                      >
                        Save
                      </Button>
                    )}
                  </Box>

                  <RecipeCard
                    recipe={recipe}
                    compact={true}
                    showFriendHeader={false}
                    isEmbedded={true}
                    isNew={recipe.is_new ?? false}
                    onClick={() => handleRecipeClick(recipe)}
                  />
                </Card>
              );
            })}

            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!hasMore && recipes.length > 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {filter === 'all' ? "You've seen all recent recipes" : "You've seen all recent recipes from your friends"}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

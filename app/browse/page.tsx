'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  InputLabel,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import AddRecipeButton from '@/components/AddRecipeButton';
import AppButton from '@/components/AppButton';
import RecipeSidebar from '@/components/RecipeSidebar';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGroup } from '@/contexts/GroupContext';
import { useInfiniteRecipes } from '@/hooks/useInfiniteRecipes';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function BrowsePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeGroup, groups, loading: groupsLoading, switchGroup } = useGroup();
  const { showToast } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Sort options (defined before state to avoid hoisting issues)
  const SORT_OPTIONS = {
    RECENTLY_ADDED: 'recently_added',
    FIRST_ADDED: 'first_added',
    RECENTLY_VIEWED: 'recently_viewed',
    DEFAULT: 'default',
  } as const;

  type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

  // localStorage keys
  const STORAGE_KEY_SORT_PREFERENCE = 'recipeSortPreference';
  const STORAGE_KEY_RECENTLY_VIEWED = 'recipeRecentlyViewed';

  const PAGE_SIZE = 12;
  const queryClient = useQueryClient();

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.RECENTLY_ADDED);
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMainIngredient, setFilterMainIngredient] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canAddRecipes, setCanAddRecipes] = useState(false);

  // Filter options are now provided by the server via facets API response

  // localStorage utilities for sort preference
  const loadSortPreference = (): SortOption => {
    if (typeof window === 'undefined') return SORT_OPTIONS.RECENTLY_ADDED;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SORT_PREFERENCE);
      if (stored && Object.values(SORT_OPTIONS).includes(stored as SortOption)) {
        return stored as SortOption;
      }
    } catch (error) {
      console.warn('Error loading sort preference:', error);
    }
    return SORT_OPTIONS.RECENTLY_ADDED; // Default
  };

  const saveSortPreference = (preference: SortOption) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SORT_PREFERENCE, preference);
    } catch (error) {
      console.warn('Error saving sort preference:', error);
    }
  };

  // localStorage utilities for recently viewed tracking
  const getRecentlyViewed = (): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENTLY_VIEWED);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error loading recently viewed:', error);
    }
    return {};
  };

  const trackRecipeView = (recipeId: string) => {
    if (typeof window === 'undefined' || !recipeId) return;
    try {
      const viewed = getRecentlyViewed();
      viewed[recipeId] = Date.now();
      // Keep only the last 100 viewed recipes to prevent localStorage bloat
      const entries = Object.entries(viewed)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 100);
      localStorage.setItem(STORAGE_KEY_RECENTLY_VIEWED, JSON.stringify(Object.fromEntries(entries)));
    } catch (error) {
      console.warn('Error tracking recipe view:', error);
    }
  };

  // Map client sort options to API sort parameters
  const apiSortBy = useMemo(() => {
    if (sortBy === SORT_OPTIONS.RECENTLY_ADDED || sortBy === SORT_OPTIONS.DEFAULT) {
      return 'created_at';
    } else if (sortBy === SORT_OPTIONS.FIRST_ADDED) {
      return 'created_at';
    } else {
      // For recently_viewed, we'll sort by created_at and handle client-side
      return 'created_at';
    }
  }, [sortBy]);

  const apiSortOrder = useMemo(() => {
    if (sortBy === SORT_OPTIONS.FIRST_ADDED) {
      return 'asc' as const;
    }
    return 'desc' as const;
  }, [sortBy]);

  // Infinite query hook - handles ALL pagination logic
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteRecipes({
    groupId: activeGroup?.id || null,
    sortBy: apiSortBy,
    sortOrder: apiSortOrder,
    search: searchQuery.trim() || undefined,
    cuisine: filterCuisine || undefined,
    ingredient: filterMainIngredient || undefined,
    favorites: filterFavorites || undefined,
    pageSize: PAGE_SIZE,
  });

  // Flatten pages into single array
  const recipes = useMemo(() => {
    return data?.pages.flatMap(page => page.recipes) ?? [];
  }, [data]);

  // Get facets from first page
  const availableCuisines = data?.pages[0]?.facets?.cuisines ?? [];
  const availableIngredients = data?.pages[0]?.facets?.ingredients ?? [];

  // Client-side sort for "recently_viewed" (uses localStorage)
  const sortedRecipes = useMemo(() => {
    if (sortBy === SORT_OPTIONS.RECENTLY_VIEWED) {
      const viewed = getRecentlyViewed();
      return [...recipes].sort((a, b) => {
        const aTime = (a.id ? (viewed[a.id] || 0) : 0);
        const bTime = (b.id ? (viewed[b.id] || 0) : 0);
        return bTime - aTime;
      });
    }
    return recipes;
  }, [recipes, sortBy]);

  // Total count from first page
  const totalRecipeCount = data?.pages[0]?.count ?? 0;

  // Infinite scroll using IntersectionObserver
  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    {
      enabled: hasNextPage && !isFetchingNextPage && !isLoading,
    }
  );

  // Load sort preference from localStorage on mount
  useEffect(() => {
    const savedPreference = loadSortPreference();
    setSortBy(savedPreference);
  }, []);

  // Auth protection: redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Check if user has permission to add recipes for active group
  useEffect(() => {
    if (!user || !activeGroup) {
      setCanAddRecipes(false);
      return;
    }

    // GroupContext already has the role - just check it!
    // owner and write can add, read and friend groups cannot
    const hasPermission = activeGroup.role === 'owner' || activeGroup.role === 'write';
    setCanAddRecipes(hasPermission);
  }, [user, activeGroup]);

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      showToast('Failed to load recipes', 'error');
    }
  }, [error, showToast]);

  const handleCardClick = (recipe: Recipe) => {
    if (recipe.id) {
      trackRecipeView(recipe.id);
    }
    router.push(`/recipe/${recipe.id}`);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    saveSortPreference(newSort);
  };

  const handleDeleteClick = (recipeId: string) => {
    // Find the recipe and show confirmation dialog
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) {
      setRecipeToDelete(recipe);
      setDeleteDialogOpen(true);
    }
  };

  const handleFavoriteToggle = async (recipeId: string, isFavorite: boolean) => {
    // Force immediate refetch to ensure UI updates immediately
    // This is especially important when unfavoriting with favorites filter active
    await queryClient.refetchQueries({ 
      queryKey: ['recipes', 'infinite'],
    });
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete?.id) return;

    setDeletingRecipe(true);
    const deletedRecipeId = recipeToDelete.id;

    try {
      const response = await fetch(`/api/recipes/${deletedRecipeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
        showToast('Recipe deleted successfully', 'success');
        
        // Invalidate queries to refetch without deleted recipe
        queryClient.invalidateQueries({ 
          queryKey: ['recipes', 'infinite'],
          refetchType: 'active'
        });
      } else {
        // Show specific error message from API (e.g., permission denied)
        showToast(data.error || 'Failed to delete recipe', 'error');
      }
    } catch (error) {
      showToast('Failed to delete recipe', 'error');
    } finally {
      setDeletingRecipe(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecipeToDelete(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCuisine('');
    setFilterMainIngredient('');
    handleSortChange(SORT_OPTIONS.RECENTLY_ADDED); // Reset to default
  };

  const hasActiveFilters = searchQuery || filterCuisine || filterMainIngredient || sortBy !== SORT_OPTIONS.RECENTLY_ADDED;

  const handleRecipeAdded = () => {
    showToast('Recipe saved successfully', 'success');
    // Invalidate queries to refetch with new recipe
    queryClient.invalidateQueries({ 
      queryKey: ['recipes', 'infinite'],
      refetchType: 'active'
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      {/* Header Container - Full Width White Container - Sticky */}
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: { xs: 56, sm: 64 }, // Account for TopNav height (mobile: 56px, desktop: 64px)
          zIndex: 100, // Higher than recipe card menu buttons (zIndex: 10) but below MUI Menu (zIndex: 1300)
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* Header Title and Search/Filters */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 2 }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: { xs: 'flex-start', sm: 'space-between' }, flexWrap: 'wrap' }}>
            {/* Title and CTA */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0, fontSize: '24px' }}>
                {activeGroup?.isFriend 
                  ? `${activeGroup.name}` 
                  : 'Your recipes'}
              </Typography>
              {canAddRecipes && <AddRecipeButton onClick={() => setSidebarOpen(true)} />}
            </Box>

            {/* Search and Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, flex: { xs: '1 1 100%', sm: '0 0 auto' }, minWidth: 0 }}>
            {/* Search Bar */}
            <TextField
              placeholder="Search recipes, ingredients, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ width: { xs: '100%', sm: 400 } }}
            />

            {/* Sort by Dropdown */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="sort-by-label">Sort by</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sort-by-select"
                value={sortBy}
                label="Sort by"
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
              >
                <MenuItem value={SORT_OPTIONS.RECENTLY_ADDED}>Recently Added</MenuItem>
                <MenuItem value={SORT_OPTIONS.FIRST_ADDED}>First Added</MenuItem>
                <MenuItem value={SORT_OPTIONS.RECENTLY_VIEWED}>Recently Viewed</MenuItem>
              </Select>
            </FormControl>

            {/* Cuisines Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="cuisine-filter-label">Cuisines</InputLabel>
              <Select
                labelId="cuisine-filter-label"
                id="cuisine-filter-select"
                value={filterCuisine}
                label="Cuisines"
                onChange={(e) => setFilterCuisine(e.target.value)}
              >
                <MenuItem value="">All Cuisines</MenuItem>
                {availableCuisines.map((cuisine) => (
                  <MenuItem key={cuisine} value={cuisine}>
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Ingredients Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="ingredient-filter-label">Ingredients</InputLabel>
              <Select
                labelId="ingredient-filter-label"
                id="ingredient-filter-select"
                value={filterMainIngredient}
                label="Ingredients"
                onChange={(e) => setFilterMainIngredient(e.target.value)}
              >
                <MenuItem value="">All Ingredients</MenuItem>
                {availableIngredients.map((ingredient) => (
                  <MenuItem key={ingredient} value={ingredient}>
                    {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Favorites Filter Chip */}
            <Chip
              icon={filterFavorites ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              label="Favorites"
              onClick={() => setFilterFavorites(!filterFavorites)}
              color={filterFavorites ? 'primary' : 'default'}
              variant="outlined" // Always use outlined to prevent visual flash
              size="small"
              sx={{
                cursor: 'pointer',
                fontWeight: filterFavorites ? 600 : 400,
                height: '40px', // Match MUI Select small size height
                paddingLeft: '14px', // Match Select small padding
                paddingRight: '14px', // Match Select small padding
                minWidth: '120px', // Fixed width to prevent layout shift
                justifyContent: 'center', // Center content within fixed width
                // When selected, use primary border color; otherwise default
                borderColor: filterFavorites ? 'primary.main' : 'divider',
                '&:hover': {
                  borderColor: 'text.primary', // Darken border on hover to match MUI Select
                },
              }}
            />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Content Container */}
      <Container maxWidth="xl" sx={{ pt: 4, pb: 4, flex: 1 }}>
        {/* Loading State */}
        {isLoading && (
          <Grid container spacing={3}>
            {[...Array(8)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <RecipeCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!isLoading && recipes.length === 0 && !hasActiveFilters && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 3,
            }}
          >
            <Box
              sx={{
                fontSize: '5rem',
                mb: 3,
                lineHeight: 1,
              }}
            >
              🎉
            </Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 500,
                color: 'text.primary',
                mb: 2,
              }}
            >
              Add your first recipe to get started!
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Your recipe collection is waiting to be filled with delicious discoveries. 
              Start building your culinary library!
            </Typography>
          </Box>
        )}

        {/* No Results State */}
        {!isLoading && recipes.length === 0 && totalRecipeCount === 0 && hasActiveFilters && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              No recipes match your search
            </Typography>
            <Typography variant="body2">Try different keywords or clear your filters</Typography>
          </Box>
        )}

        {/* Recipe Grid */}
        {!isLoading && sortedRecipes.length > 0 && (
          <>
            <Typography 
              color="text.secondary"
              sx={{ mb: 2, fontSize: 16 }}
            >
              Displaying <Box component="strong" sx={{ color: 'text.primary' }}>{totalRecipeCount}</Box> recipes
            </Typography>
            <Grid container spacing={3}>
              {sortedRecipes.map((recipe, index) => {
                // Load fewer images eagerly on mobile (4 vs 8)
                const eagerLoadCount = isMobile ? 4 : 8;
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                    <RecipeCard 
                      recipe={recipe} 
                      compact 
                      onClick={() => handleCardClick(recipe)}
                      onDelete={canAddRecipes ? handleDeleteClick : undefined}
                      onFavoriteToggle={handleFavoriteToggle}
                      loading={index < eagerLoadCount ? 'eager' : 'lazy'}
                    />
                  </Grid>
                );
              })}
            </Grid>

            {/* IntersectionObserver Sentinel */}
            {hasNextPage && <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} />}

            {/* Loading More Indicator */}
            {isFetchingNextPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}

            {/* End State - No More Recipes */}
            {!hasNextPage && sortedRecipes.length > 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  mt: 4,
                  pb: 4,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">
                  You've reached the end! 🎉
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        title={recipeToDelete?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deletingRecipe}
      />

      {/* Recipe Sidebar for Adding Recipes */}
      <RecipeSidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onRecipeAdded={handleRecipeAdded}
      />

    </Box>
  );
}


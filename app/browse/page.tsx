'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
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

  // TODO: Adjust page size based on screen size or user preference
  const PAGE_SIZE = 12;
  // TODO: Adjust scroll threshold for earlier/later loading
  const SCROLL_THRESHOLD = 300; // pixels from bottom

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.RECENTLY_ADDED);
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMainIngredient, setFilterMainIngredient] = useState('');
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [canAddRecipes, setCanAddRecipes] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  // Cuisine and ingredient filter options
  const CUISINE_OPTIONS = [
    'american', 'chinese', 'french', 'greek', 'indian', 'italian', 
    'japanese', 'korean', 'mexican', 'thai', 'vietnamese', 
    'middle eastern', 'mediterranean'
  ];
  
  const INGREDIENT_OPTIONS = [
    'fish', 'seafood', 'chicken', 'beef', 'pork', 'lamb', 'vegetarian', 'vegan'
  ];

  // Get available filter options (only show options that exist in recipes)
  const availableCuisines = useMemo(() => {
    return CUISINE_OPTIONS.filter(cuisine => 
      recipes.some(recipe => 
        recipe.tags.some(tag => tag.toLowerCase() === cuisine.toLowerCase())
      )
    );
  }, [recipes]);

  const availableIngredients = useMemo(() => {
    return INGREDIENT_OPTIONS.filter(ingredient => 
      recipes.some(recipe => 
        recipe.tags.some(tag => tag.toLowerCase() === ingredient.toLowerCase())
      )
    );
  }, [recipes]);

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

  // Fetch recipes from API
  const fetchRecipes = useCallback(async (silent = false, noCache = false) => {
    if (!activeGroup) return;
    
    try {
      if (!silent) {
        setLoading(true);
      }
      // Add cache-busting when needed (after delete/add operations)
      const cacheBuster = noCache ? `&_t=${Date.now()}` : '';
      const response = await fetch(`/api/recipes?groupId=${activeGroup.id}${cacheBuster}`, {
        ...(noCache && { cache: 'no-store' })
      });
      const data = await response.json();

      if (data.success) {
        setRecipes(data.recipes || []);
      } else {
        if (!silent) {
          showToast(data.error || 'Failed to load recipes', 'error');
        }
        setRecipes([]);
      }
    } catch (error) {
      if (!silent) {
        showToast('Unable to connect to server', 'error');
      }
      setRecipes([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeGroup, showToast]);

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
  // Use role from GroupContext (already fetched server-side) instead of querying client-side
  useEffect(() => {
    if (!user || !activeGroup) {
        setCanAddRecipes(false);
      setGroupId(null);
      return;
    }

    setGroupId(activeGroup.id);
    // GroupContext already has the role - just check it!
    // owner and write can add, read and friend groups cannot
    const hasPermission = activeGroup.role === 'owner' || activeGroup.role === 'write';
    setCanAddRecipes(hasPermission);
  }, [user, activeGroup]);

  // Eager loading: Fetch recipes when active group changes
  useEffect(() => {
    if (!user || authLoading || groupsLoading) return;

    if (activeGroup) {
      // Use cache-busting on initial load to ensure fresh data
      fetchRecipes(false, true);
    } else {
      setRecipes([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeGroup?.id, authLoading, groupsLoading]);
  // fetchRecipes intentionally omitted from deps - we only want to refetch when group ID changes,
  // not when the callback recreates due to activeGroup object reference changing in GroupContext
  // user?.id (not user) prevents re-fetch on session validation while maintaining login/logout behavior

  // Apply filters function
  const applyFilters = useCallback(() => {
    let filtered = [...recipes];

    // Search filter (title, ingredients, tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          recipe.ingredients.some((ing) => ing.toLowerCase().includes(query))
      );
    }

    // Cuisine filter
    if (filterCuisine) {
      filtered = filtered.filter((recipe) => 
        recipe.tags.some(tag => tag.toLowerCase() === filterCuisine.toLowerCase())
      );
    }

    // Main ingredient filter
    if (filterMainIngredient) {
      filtered = filtered.filter((recipe) => 
        recipe.tags.some(tag => tag.toLowerCase() === filterMainIngredient.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === SORT_OPTIONS.RECENTLY_VIEWED) {
        const viewed = getRecentlyViewed();
        const aViewed = a.id ? (viewed[a.id] || 0) : 0;
        const bViewed = b.id ? (viewed[b.id] || 0) : 0;
        // Most recently viewed first (higher timestamp = more recent)
        return bViewed - aViewed;
      } else if (sortBy === SORT_OPTIONS.RECENTLY_ADDED) {
        // Newest first (created_at DESC)
        return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
      } else if (sortBy === SORT_OPTIONS.FIRST_ADDED) {
        // Oldest first (created_at ASC)
        return new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime();
      }
      // Default to Recently Added (newest first)
      return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
    });

    setFilteredRecipes(filtered);
  }, [recipes, searchQuery, sortBy, filterCuisine, filterMainIngredient]);

  // Load more recipes function
  const loadMoreRecipes = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    
    // Simulate network delay for smooth UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = nextPage * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const nextBatch = filteredRecipes.slice(startIndex, endIndex);

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        // Deduplicate recipes by ID to prevent React key warnings
        setDisplayedRecipes(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newRecipes = nextBatch.filter(r => !existingIds.has(r.id));
          return [...prev, ...newRecipes];
        });
        setCurrentPage(nextPage);
        
        // Check if we've loaded all recipes
        if (endIndex >= filteredRecipes.length) {
          setHasMore(false);
        }
      }

      setLoadingMore(false);
    }, 300); // Small delay for smooth loading indicator
  }, [loadingMore, hasMore, currentPage, filteredRecipes]);

  // Apply filters whenever recipes, search, or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Load initial batch of displayed recipes when filtered recipes change
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    const initialBatch = filteredRecipes.slice(0, PAGE_SIZE);
    setDisplayedRecipes(initialBatch);
  }, [filteredRecipes]);

  // Infinite scroll: Load more recipes when user scrolls near bottom
  useEffect(() => {
    const handleScroll = () => {
      // Don't load if already loading, no more recipes, or initial load
      if (loadingMore || !hasMore || loading) return;

      // Calculate distance from bottom
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);

      // Load more if within threshold
      if (distanceFromBottom < SCROLL_THRESHOLD) {
        loadMoreRecipes();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, loading, currentPage, filteredRecipes, loadMoreRecipes]);

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
        // Optimistically remove recipe from all state arrays immediately
        setRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
        setFilteredRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
        setDisplayedRecipes(prev => prev.filter(r => r.id !== deletedRecipeId));
        
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
        showToast('Recipe deleted successfully', 'success');
        
        // Silently refetch in background with cache-busting to ensure fresh data
        fetchRecipes(true, true);
      } else {
        // Show specific error message from API (e.g., permission denied)
        showToast(data.error || 'Failed to delete recipe', 'error');
      }
    } catch (error) {
      showToast('Failed to delete recipe', 'error');
      // Restore recipe on error (optimistic update rollback)
      // Note: This is a simple approach - in production, you might want to
      // store the deleted recipe temporarily and restore it if needed
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
    
    // Silently refetch immediately with cache-busting to ensure new recipe appears
    fetchRecipes(true, true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      {/* Header Container - Full Width White Container */}
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Header Title and Search/Filters */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 2 }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: { xs: 'flex-start', sm: 'space-between' }, flexWrap: 'wrap' }}>
            {/* Title and CTA */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 0 }}>
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

            {/* Filter by Section */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="ingredient-filter-label">Main Ingredient</InputLabel>
                <Select
                  labelId="ingredient-filter-label"
                  id="ingredient-filter-select"
                  value={filterMainIngredient}
                  label="Main Ingredient"
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
            </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Content Container */}
      <Container maxWidth="xl" sx={{ pt: 4, pb: 4, flex: 1 }}>
        {/* Loading State */}
        {loading && (
          <Grid container spacing={3}>
            {[...Array(8)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <RecipeCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
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
        {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
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
        {!loading && filteredRecipes.length > 0 && (
          <>
            <Grid container spacing={3}>
              {displayedRecipes.map((recipe, index) => {
                // Load fewer images eagerly on mobile (4 vs 8)
                const eagerLoadCount = isMobile ? 4 : 8;
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                    <RecipeCard 
                      recipe={recipe} 
                      compact 
                      onClick={() => handleCardClick(recipe)}
                      onDelete={canAddRecipes ? handleDeleteClick : undefined}
                      loading={index < eagerLoadCount ? 'eager' : 'lazy'}
                    />
                  </Grid>
                );
              })}
            </Grid>

            {/* Loading More Indicator */}
            {loadingMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, pb: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}

            {/* End State - No More Recipes */}
            {!loadingMore && !hasMore && displayedRecipes.length > 0 && (
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


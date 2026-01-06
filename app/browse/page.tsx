'use client';

import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
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
  const [totalRecipeCount, setTotalRecipeCount] = useState<number>(0); // Total count from API
  const [availableCuisines, setAvailableCuisines] = useState<string[]>([]); // From API facets
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]); // From API facets
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(SORT_OPTIONS.RECENTLY_ADDED);
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMainIngredient, setFilterMainIngredient] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [canAddRecipes, setCanAddRecipes] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  
  // Store scroll position to preserve it during recipe list updates
  const scrollPositionRef = useRef<number | null>(null);
  
  // Track previous filter/sort values to detect if they changed
  const previousFiltersRef = useRef<{
    sortBy: SortOption;
    searchQuery: string;
    filterCuisine: string;
    filterMainIngredient: string;
    filterFavorites: boolean;
  } | null>(null);

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

  // Fetch recipes from API with server-side filtering
  const fetchRecipes = useCallback(async (silent = false, noCache = false) => {
    if (!activeGroup) return;
    
    try {
      if (!silent) {
        setLoading(true);
      }
      // Build query parameters for server-side filtering
      const params = new URLSearchParams({
        groupId: activeGroup.id,
        limit: '100', // Max allowed by API
      });
      
      // Add sorting parameters (map client sort options to API sort columns)
      if (sortBy === SORT_OPTIONS.RECENTLY_ADDED || sortBy === SORT_OPTIONS.DEFAULT) {
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'desc');
      } else if (sortBy === SORT_OPTIONS.FIRST_ADDED) {
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'asc');
      } else {
        // For recently_viewed, we'll sort by created_at and handle client-side
        params.append('sortBy', 'created_at');
        params.append('sortOrder', 'desc');
      }
      
      // Add filter parameters
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (filterCuisine) {
        params.append('cuisine', filterCuisine);
      }
      if (filterMainIngredient) {
        params.append('ingredient', filterMainIngredient);
      }
      if (filterFavorites) {
        params.append('favorites', 'true');
      }
      
      // Add cache-busting when needed
      if (noCache) {
        params.append('_t', Date.now().toString());
      }
      
      const response = await fetch(`/api/recipes?${params.toString()}`, {
        ...(noCache && { cache: 'no-store' })
      });
      const data = await response.json();

      if (data.success) {
        const fetchedRecipes = data.recipes || [];
        setRecipes(fetchedRecipes);
        // Use API count for total (accurate server-side filtered count)
        setTotalRecipeCount(data.count || 0);
        
        // Update filter options from server facets (only if provided)
        if (data.facets) {
          setAvailableCuisines(data.facets.cuisines || []);
          setAvailableIngredients(data.facets.ingredients || []);
        }
        
        // For "Recently Viewed" sorting, we still need client-side sorting
        // since it uses localStorage. Other sorts are already done server-side.
        if (sortBy === SORT_OPTIONS.RECENTLY_VIEWED) {
          // Client-side sort by recently viewed
          const viewed = getRecentlyViewed();
          const sorted = [...fetchedRecipes].sort((a, b) => {
            const aViewed = a.id ? (viewed[a.id] || 0) : 0;
            const bViewed = b.id ? (viewed[b.id] || 0) : 0;
            return bViewed - aViewed;
          });
          setFilteredRecipes(sorted);
        } else {
          // Server-side sorting already applied, use recipes as-is
          setFilteredRecipes(fetchedRecipes);
        }
      } else {
        if (!silent) {
          showToast(data.error || 'Failed to load recipes', 'error');
        }
        setRecipes([]);
        setFilteredRecipes([]);
        setTotalRecipeCount(0);
      }
    } catch (error) {
      if (!silent) {
        showToast('Unable to connect to server', 'error');
      }
      setRecipes([]);
      setFilteredRecipes([]);
      setTotalRecipeCount(0);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeGroup, showToast, searchQuery, filterCuisine, filterMainIngredient, filterFavorites, sortBy]);

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

  // Fetch recipes whenever filters change (server-side filtering)
  // This includes initial load when activeGroup changes
  useEffect(() => {
    if (!user || authLoading || groupsLoading) return;

    if (activeGroup) {
      // Use cache-busting on initial load (when group changes), normal cache otherwise
      const isInitialLoad = recipes.length === 0;
      fetchRecipes(false, isInitialLoad);
    } else {
      setRecipes([]);
      setFilteredRecipes([]);
      setTotalRecipeCount(0);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeGroup?.id, authLoading, groupsLoading, searchQuery, filterCuisine, filterMainIngredient, filterFavorites, sortBy]);
  // fetchRecipes intentionally omitted from deps - it's already in the useCallback deps
  // This effect handles both initial load and filter changes

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

  // Note: Server-side filtering is now handled in fetchRecipes
  // Only "Recently Viewed" sorting is done client-side (uses localStorage)

  // Load initial batch of displayed recipes when filtered recipes change
  useEffect(() => {
    // Check if filters/sort changed by comparing current values with previous
    const filtersChanged = previousFiltersRef.current === null ||
      sortBy !== previousFiltersRef.current.sortBy ||
      searchQuery !== previousFiltersRef.current.searchQuery ||
      filterCuisine !== previousFiltersRef.current.filterCuisine ||
      filterMainIngredient !== previousFiltersRef.current.filterMainIngredient ||
      filterFavorites !== previousFiltersRef.current.filterFavorites;

    if (filtersChanged) {
      // Filters/sort changed - reset everything (normal behavior)
      setCurrentPage(0);
      setHasMore(filteredRecipes.length > PAGE_SIZE);
      const initialBatch = filteredRecipes.slice(0, PAGE_SIZE);
      setDisplayedRecipes(initialBatch);
    } else {
      // Filters/sort didn't change - just adding/updating recipes
      // Find new recipes that aren't in displayedRecipes
      const currentIds = new Set(displayedRecipes.map(r => r.id));
      const newRecipes = filteredRecipes.filter(r => r.id && !currentIds.has(r.id));
      
      if (newRecipes.length > 0) {
        // New recipes added - insert them at correct sorted position
        // Since filteredRecipes is already sorted from API, we can merge maintaining order
        // For "Recently Added" (default), new recipes go at the top
        setDisplayedRecipes(prev => {
          const merged = [...newRecipes, ...prev];
          // Deduplicate by ID (in case of any overlap)
          const seen = new Set<string>();
          return merged.filter(r => {
            if (!r.id || seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
        });
      }
      // If no new recipes, displayedRecipes stays the same (no reset needed)
      // This handles cases like favoriting where we just update properties
      // Note: hasMore is managed by loadMoreRecipes (lazy loading) and the if branch (filter changes)
    }
    
    // Update ref with current filter/sort values
    previousFiltersRef.current = {
      sortBy,
      searchQuery,
      filterCuisine,
      filterMainIngredient,
      filterFavorites,
    };
    
    // Restore scroll position if it was saved (prevents jitter when adding recipes)
    if (scrollPositionRef.current !== null) {
      // Use double requestAnimationFrame to ensure browser layout is complete
      // First RAF: React has updated DOM
      // Second RAF: Browser has completed layout calculation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPositionRef.current!);
          scrollPositionRef.current = null; // Clear after restoring
        });
      });
    }
  }, [filteredRecipes, sortBy, searchQuery, filterCuisine, filterMainIngredient, filterFavorites]);

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

  const handleFavoriteToggle = (recipeId: string, isFavorite: boolean) => {
    // Update recipes array (always update property)
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
    );

    // If favorites filter is active and recipe is unfavorited, remove from filtered arrays
    if (filterFavorites && !isFavorite) {
      setFilteredRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setDisplayedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } else {
      // Otherwise, just update the property
      setFilteredRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
      );
      setDisplayedRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: isFavorite } : r))
      );
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
    
    // Save scroll position before refetching to prevent jitter
    scrollPositionRef.current = window.scrollY;
    
    // Use startTransition to mark recipe list update as non-urgent
    // This keeps UI responsive and allows React to optimize rendering
    startTransition(() => {
      // Silently refetch immediately with cache-busting to ensure new recipe appears
      fetchRecipes(true, true);
    });
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
                icon={<BookmarkIcon />}
                label="Favorites"
                onClick={() => setFilterFavorites(!filterFavorites)}
                color={filterFavorites ? 'primary' : 'default'}
                variant={filterFavorites ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  cursor: 'pointer',
                  fontWeight: filterFavorites ? 600 : 400,
                  height: '40px', // Match MUI Select small size height
                  paddingLeft: '14px', // Match Select small padding
                  paddingRight: '14px', // Match Select small padding
                  minWidth: '120px', // Fixed width to prevent layout shift
                  justifyContent: 'center', // Center content within fixed width
                }}
              />
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
            <Typography 
              color="text.secondary"
              sx={{ mb: 2, fontSize: 16 }}
            >
              Displaying <Box component="strong" sx={{ color: 'text.primary' }}>{totalRecipeCount}</Box> recipes
            </Typography>
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
                      onFavoriteToggle={handleFavoriteToggle}
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


'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import AddRecipeButton from '@/components/AddRecipeButton';
import RecipeSidebar from '@/components/RecipeSidebar';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/db/supabaseClient';
import { canUserAddRecipes } from '@/utils/permissions';
import { useGroup } from '@/contexts/GroupContext';

export default function BrowsePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeGroup, loading: groupsLoading } = useGroup();
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMainIngredient, setFilterMainIngredient] = useState('');
  const [filterContributor, setFilterContributor] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [canAddRecipes, setCanAddRecipes] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  // TODO: Adjust page size based on screen size or user preference
  const PAGE_SIZE = 12;
  // TODO: Adjust scroll threshold for earlier/later loading
  const SCROLL_THRESHOLD = 300; // pixels from bottom

  // Common cuisine types
  const CUISINE_TYPES = ['american', 'chinese', 'french', 'greek', 'indian', 'italian', 'japanese', 'korean', 'mexican', 'thai', 'vietnamese', 'middle eastern', 'mediterranean'];
  
  // Main ingredient types (matching auto-tagging categories)
  const MAIN_INGREDIENT_TYPES = ['fish', 'seafood', 'chicken', 'beef', 'pork', 'lamb', 'vegetarian', 'vegan'];

  // Get unique cuisines and contributors for filter dropdowns
  const allContributors = Array.from(new Set(recipes.map(r => r.contributor_name))).sort();
  
  // Extract cuisine types from tags
  const allCuisines = Array.from(
    new Set(
      recipes.flatMap(r => 
        r.tags.filter(tag => 
          CUISINE_TYPES.includes(tag.toLowerCase())
        )
      )
    )
  ).sort();
  
  // Extract main ingredient types from tags
  const allMainIngredients = Array.from(
    new Set(
      recipes.flatMap(r => 
        r.tags.filter(tag => 
          MAIN_INGREDIENT_TYPES.includes(tag.toLowerCase())
        )
      )
    )
  ).sort();

  // Fetch recipes from API
  const fetchRecipes = useCallback(async () => {
    console.log('🔵 fetchRecipes CALLED', new Date().toISOString());
    if (!activeGroup) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/recipes?groupId=${activeGroup.id}`);
      const data = await response.json();

      if (data.success) {
        setRecipes(data.recipes || []);
      } else {
        showToast(data.error || 'Failed to load recipes', 'error');
        setRecipes([]);
      }
    } catch (error) {
      showToast('Unable to connect to server', 'error');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup, showToast]);

  // Auth protection: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Check if user has permission to add recipes for active group
  useEffect(() => {
    async function checkPermissions() {
      if (!user || !activeGroup) return;

      try {
        setGroupId(activeGroup.id);
        const hasPermission = await canUserAddRecipes(supabase, user.id, activeGroup.id);
        setCanAddRecipes(hasPermission);
      } catch (error) {
        setCanAddRecipes(false);
      }
    }

    checkPermissions();
  }, [user, activeGroup]);

  // Eager loading: Fetch recipes when active group changes
  useEffect(() => {
    console.log('🟠 useEffect TRIGGERED', {
      user: !!user,
      activeGroupId: activeGroup?.id,
      authLoading,
      groupsLoading,
      fetchRecipesRef: fetchRecipes.toString().slice(0, 50),
    });
    
    if (!user || authLoading || groupsLoading) return;

    if (activeGroup) {
      fetchRecipes();
    } else {
      setRecipes([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeGroup?.id, authLoading, groupsLoading]);
  // fetchRecipes intentionally omitted from deps - we only want to refetch when group ID changes,
  // not when the callback recreates due to activeGroup object reference changing in GroupContext
  // user?.id (not user) prevents re-fetch on session validation while maintaining login/logout behavior

  // Apply filters whenever recipes, search, or filters change
  useEffect(() => {
    applyFilters();
  }, [recipes, searchQuery, sortBy, filterCuisine, filterMainIngredient, filterContributor]);

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
  }, [loadingMore, hasMore, loading, currentPage, filteredRecipes]);

  const loadMoreRecipes = () => {
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
        setDisplayedRecipes(prev => [...prev, ...nextBatch]);
        setCurrentPage(nextPage);
        
        // Check if we've loaded all recipes
        if (endIndex >= filteredRecipes.length) {
          setHasMore(false);
        }
      }

      setLoadingMore(false);
    }, 300); // Small delay for smooth loading indicator
  };

  const applyFilters = () => {
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

    // Contributor filter
    if (filterContributor) {
      filtered = filtered.filter((recipe) => recipe.contributor_name === filterContributor);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'contributor_name') {
        return a.contributor_name.localeCompare(b.contributor_name);
      } else {
        // Default: created_at (newest first)
        return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
      }
    });

    setFilteredRecipes(filtered);
  };

  const handleCardClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalOpen(true);
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

    try {
      const response = await fetch(`/api/recipes/${recipeToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
        
        if (selectedRecipe?.id === recipeToDelete.id) {
          setModalOpen(false);
          setSelectedRecipe(null);
        }
        
        showToast('Recipe deleted successfully', 'success');
        
        // Wait for database, then refresh
        setTimeout(() => {
          fetchRecipes();
        }, 2000);
      } else {
        showToast('Failed to delete recipe', 'error');
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

  const handleDeleteRecipe = (recipeId: string) => {
    // This is called from the RecipeDetailModal
    // We can reuse the same flow
    handleDeleteClick(recipeId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCuisine('');
    setFilterMainIngredient('');
    setFilterContributor('');
    setSortBy('created_at');
  };

  const hasActiveFilters = searchQuery || filterCuisine || filterMainIngredient || filterContributor || sortBy !== 'created_at';

  const handleRecipeAdded = () => {
    console.log('🟢 handleRecipeAdded CALLED', new Date().toISOString());
    showToast('Recipe saved successfully', 'success');
    
    // Wait for database, then refresh
    setTimeout(() => {
      console.log('🟢 handleRecipeAdded setTimeout FIRED', new Date().toISOString());
    fetchRecipes();
    }, 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
              Recipe Collection
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Browse and search your saved recipes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {canAddRecipes && <AddRecipeButton onClick={() => setSidebarOpen(true)} />}
            {activeGroup?.isOwn && (
              <Button
                variant="text"
                onClick={() => router.push('/manage-users')}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                Manage Users
              </Button>
            )}
          </Box>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            {/* Search Bar - Left Aligned */}
            <Grid item xs={12} md="auto">
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
                sx={{ width: { xs: '100%', md: '400px' } }}
              />
            </Grid>

            {/* Filters - Right Aligned */}
            <Grid item xs={12} md="auto">
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md="auto">
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                      <MenuItem value="created_at">Date Added (Newest)</MenuItem>
                      <MenuItem value="title">Title (A-Z)</MenuItem>
                      <MenuItem value="contributor_name">Contributor (A-Z)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md="auto">
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                    <InputLabel>Cuisine</InputLabel>
                    <Select
                      value={filterCuisine}
                      label="Cuisine"
                      onChange={(e) => setFilterCuisine(e.target.value)}
                    >
                      <MenuItem value="">All Cuisines</MenuItem>
                      {allCuisines.map((cuisine) => (
                        <MenuItem key={cuisine} value={cuisine}>
                          {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md="auto">
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                    <InputLabel>Main Ingredient</InputLabel>
                    <Select
                      value={filterMainIngredient}
                      label="Main Ingredient"
                      onChange={(e) => setFilterMainIngredient(e.target.value)}
                    >
                      <MenuItem value="">All Ingredients</MenuItem>
                      {allMainIngredients.map((ingredient) => (
                        <MenuItem key={ingredient} value={ingredient}>
                          {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md="auto">
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                    <InputLabel>Contributor</InputLabel>
                    <Select
                      value={filterContributor}
                      label="Contributor"
                      onChange={(e) => setFilterContributor(e.target.value)}
                    >
                      <MenuItem value="">All Contributors</MenuItem>
                      {allContributors.map((contributor) => (
                        <MenuItem key={contributor} value={contributor}>
                          {contributor}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {hasActiveFilters && (
                  <Grid item xs={12} sm={6} md="auto">
                    <Chip
                      label="Clear Filters"
                      onDelete={clearFilters}
                      deleteIcon={<ClearIcon />}
                      color="primary"
                      variant="outlined"
                      sx={{ height: 40, px: 1 }}
                    />
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Box>


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
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              No recipes yet
            </Typography>
            <Typography variant="body2">
              Start by adding your first recipe in the chat!
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
              {displayedRecipes.map((recipe) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                  <RecipeCard 
                    recipe={recipe} 
                    compact 
                    onClick={() => handleCardClick(recipe)}
                    onDelete={handleDeleteClick}
                  />
                </Grid>
              ))}
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

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={handleDeleteRecipe}
      />

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


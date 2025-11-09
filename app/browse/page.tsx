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
  Card,
  CardContent,
  Popover,
  Button,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import RamenDiningIcon from '@mui/icons-material/RamenDining';
import PizzaIcon from '@mui/icons-material/LocalPizza';
import SushiIcon from '@mui/icons-material/SetMeal';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import SpaIcon from '@mui/icons-material/Spa';
import EggIcon from '@mui/icons-material/Egg';
import FishIcon from '@mui/icons-material/SetMeal';
import PetsIcon from '@mui/icons-material/Pets';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
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
  const [cuisineAnchorEl, setCuisineAnchorEl] = useState<HTMLElement | null>(null);
  const [ingredientAnchorEl, setIngredientAnchorEl] = useState<HTMLElement | null>(null);
  const [tempCuisine, setTempCuisine] = useState('');
  const [tempIngredient, setTempIngredient] = useState('');

  // TODO: Adjust page size based on screen size or user preference
  const PAGE_SIZE = 12;
  // TODO: Adjust scroll threshold for earlier/later loading
  const SCROLL_THRESHOLD = 300; // pixels from bottom

  // Common cuisine types with icons
  const CUISINE_TYPES = [
    { value: 'american', label: 'American', icon: <FastfoodIcon /> },
    { value: 'chinese', label: 'Chinese', icon: <RamenDiningIcon /> },
    { value: 'french', label: 'French', icon: <BakeryDiningIcon /> },
    { value: 'greek', label: 'Greek', icon: <RestaurantIcon /> },
    { value: 'indian', label: 'Indian', icon: <EmojiFoodBeverageIcon /> },
    { value: 'italian', label: 'Italian', icon: <PizzaIcon /> },
    { value: 'japanese', label: 'Japanese', icon: <SushiIcon /> },
    { value: 'korean', label: 'Korean', icon: <LunchDiningIcon /> },
    { value: 'mexican', label: 'Mexican', icon: <FastfoodIcon /> },
    { value: 'thai', label: 'Thai', icon: <RamenDiningIcon /> },
    { value: 'vietnamese', label: 'Vietnamese', icon: <LunchDiningIcon /> },
    { value: 'middle eastern', label: 'Middle Eastern', icon: <RestaurantIcon /> },
    { value: 'mediterranean', label: 'Mediterranean', icon: <RestaurantIcon /> },
  ];
  
  // Main ingredient types with icons (matching auto-tagging categories)
  const MAIN_INGREDIENT_TYPES = [
    { value: 'fish', label: 'Fish', icon: <FishIcon /> },
    { value: 'seafood', label: 'Seafood', icon: <FishIcon /> },
    { value: 'chicken', label: 'Chicken', icon: <EggIcon /> },
    { value: 'beef', label: 'Beef', icon: <PetsIcon /> },
    { value: 'pork', label: 'Pork', icon: <PetsIcon /> },
    { value: 'lamb', label: 'Lamb', icon: <PetsIcon /> },
    { value: 'vegetarian', label: 'Vegetarian', icon: <SpaIcon /> },
    { value: 'vegan', label: 'Vegan', icon: <SpaIcon /> },
  ];

  // Calculate counts for each filter option
  const getCuisineCount = (cuisineValue: string) => {
    return recipes.filter(r => 
      r.tags.some(tag => tag.toLowerCase() === cuisineValue.toLowerCase())
    ).length;
  };

  const getIngredientCount = (ingredientValue: string) => {
    return recipes.filter(r => 
      r.tags.some(tag => tag.toLowerCase() === ingredientValue.toLowerCase())
    ).length;
  };

  // Get cuisines and ingredients that actually exist in recipes
  const availableCuisines = CUISINE_TYPES.filter(c => getCuisineCount(c.value) > 0);
  const availableIngredients = MAIN_INGREDIENT_TYPES.filter(i => getIngredientCount(i.value) > 0);

  // Fetch recipes from API
  const fetchRecipes = useCallback(async () => {
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
  }, [recipes, searchQuery, sortBy, filterCuisine, filterMainIngredient]);

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
    router.push(`/recipe/${recipe.id}`);
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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCuisine('');
    setFilterMainIngredient('');
    setSortBy('created_at');
    setTempCuisine('');
    setTempIngredient('');
  };

  const hasActiveFilters = searchQuery || filterCuisine || filterMainIngredient || sortBy !== 'created_at';

  const handleCuisineOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTempCuisine(filterCuisine);
    setCuisineAnchorEl(event.currentTarget);
  };

  const handleCuisineClose = () => {
    setCuisineAnchorEl(null);
    setTempCuisine('');
  };

  const handleCuisineApply = () => {
    setFilterCuisine(tempCuisine);
    setCuisineAnchorEl(null);
  };

  const handleIngredientOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTempIngredient(filterMainIngredient);
    setIngredientAnchorEl(event.currentTarget);
  };

  const handleIngredientClose = () => {
    setIngredientAnchorEl(null);
    setTempIngredient('');
  };

  const handleIngredientApply = () => {
    setFilterMainIngredient(tempIngredient);
    setIngredientAnchorEl(null);
  };

  const handleRecipeAdded = () => {
    showToast('Recipe saved successfully', 'success');
    
    // Wait for database, then refresh
    setTimeout(() => {
      fetchRecipes();
    }, 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
                {activeGroup?.isFriend 
                  ? `${activeGroup.name}` 
                  : 'Your RecipeBook'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
          {canAddRecipes && <AddRecipeButton onClick={() => setSidebarOpen(true)} />}
            </Box>
          </Box>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
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
            sx={{ width: { xs: '100%', sm: 300 } }}
          />

          {/* Filter Buttons - Right Aligned */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cuisine Filter Button */}
          <Chip
            label={filterCuisine ? `Cuisine: ${filterCuisine.charAt(0).toUpperCase() + filterCuisine.slice(1)}` : 'Cuisines'}
            onClick={handleCuisineOpen}
            onDelete={filterCuisine ? () => setFilterCuisine('') : undefined}
            deleteIcon={filterCuisine ? <ClearIcon /> : undefined}
            icon={<ExpandMoreIcon />}
            sx={{
              height: 40,
              px: 2,
              fontWeight: 600,
              bgcolor: filterCuisine ? 'primary.main' : 'background.paper',
              color: filterCuisine ? 'white' : 'text.primary',
              border: '1px solid',
              borderColor: filterCuisine ? 'primary.main' : 'divider',
              '&:hover': {
                bgcolor: filterCuisine ? 'primary.dark' : 'action.hover',
              },
              '& .MuiChip-icon': {
                color: filterCuisine ? 'white' : 'text.secondary',
              },
            }}
          />

          {/* Ingredient Filter Button */}
          <Chip
            label={filterMainIngredient ? `Ingredient: ${filterMainIngredient.charAt(0).toUpperCase() + filterMainIngredient.slice(1)}` : 'Main Ingredient'}
            onClick={handleIngredientOpen}
            onDelete={filterMainIngredient ? () => setFilterMainIngredient('') : undefined}
            deleteIcon={filterMainIngredient ? <ClearIcon /> : undefined}
            icon={<ExpandMoreIcon />}
            sx={{
              height: 40,
              px: 2,
              fontWeight: 600,
              bgcolor: filterMainIngredient ? 'primary.main' : 'background.paper',
              color: filterMainIngredient ? 'white' : 'text.primary',
              border: '1px solid',
              borderColor: filterMainIngredient ? 'primary.main' : 'divider',
              '&:hover': {
                bgcolor: filterMainIngredient ? 'primary.dark' : 'action.hover',
              },
              '& .MuiChip-icon': {
                color: filterMainIngredient ? 'white' : 'text.secondary',
              },
            }}
          />

          {/* Clear All */}
          {hasActiveFilters && (
            <Chip
              label="Clear All Filters"
              onDelete={clearFilters}
              onClick={clearFilters}
              deleteIcon={<ClearIcon />}
              color="error"
              variant="outlined"
              sx={{ height: 40, fontWeight: 600 }}
            />
          )}
          </Box>
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
              {displayedRecipes.map((recipe) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                  <RecipeCard 
                    recipe={recipe} 
                    compact 
                    onClick={() => handleCardClick(recipe)}
                    onDelete={canAddRecipes ? handleDeleteClick : undefined}
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

      {/* Cuisine Filter Popover */}
      <Popover
        open={Boolean(cuisineAnchorEl)}
        anchorEl={cuisineAnchorEl}
        onClose={handleCuisineClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            maxWidth: 600,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Cuisines
          </Typography>
          <Grid container spacing={2}>
            {availableCuisines.map((cuisine) => {
              const isSelected = tempCuisine === cuisine.value;
              return (
                <Grid item xs={4} sm={3} key={cuisine.value}>
                  <Card
                    onClick={() => setTempCuisine(isSelected ? '' : cuisine.value)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? 'hsl(24, 85%, 55%)' : 'background.paper',
                      border: '1px solid',
                      borderColor: isSelected ? 'hsl(24, 85%, 55%)' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'hsl(24, 85%, 55%)',
                        transform: 'scale(1.05)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                      <Box sx={{ color: isSelected ? 'white' : 'hsl(24, 85%, 55%)', fontSize: 36, mb: 0.5 }}>
                        {cuisine.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: isSelected ? 'white' : 'text.primary',
                        }}
                      >
                        {cuisine.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setTempCuisine('')} color="inherit">
              Reset
            </Button>
            <Button
              onClick={handleCuisineApply}
              variant="contained"
              sx={{
                bgcolor: 'hsl(24, 85%, 55%)',
                '&:hover': { bgcolor: 'hsl(24, 85%, 45%)' },
              }}
            >
              View Results
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Ingredient Filter Popover */}
      <Popover
        open={Boolean(ingredientAnchorEl)}
        anchorEl={ingredientAnchorEl}
        onClose={handleIngredientClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            maxWidth: 600,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Main Ingredient
          </Typography>
          <Grid container spacing={2}>
            {availableIngredients.map((ingredient) => {
              const isSelected = tempIngredient === ingredient.value;
              return (
                <Grid item xs={4} sm={3} key={ingredient.value}>
                  <Card
                    onClick={() => setTempIngredient(isSelected ? '' : ingredient.value)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? 'hsl(24, 85%, 55%)' : 'background.paper',
                      border: '1px solid',
                      borderColor: isSelected ? 'hsl(24, 85%, 55%)' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'hsl(24, 85%, 55%)',
                        transform: 'scale(1.05)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
                      <Box sx={{ color: isSelected ? 'white' : 'hsl(24, 85%, 55%)', fontSize: 36, mb: 0.5 }}>
                        {ingredient.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          color: isSelected ? 'white' : 'text.primary',
                        }}
                      >
                        {ingredient.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setTempIngredient('')} color="inherit">
              Reset
            </Button>
            <Button
              onClick={handleIngredientApply}
              variant="contained"
              sx={{
                bgcolor: 'hsl(24, 85%, 55%)',
                '&:hover': { bgcolor: 'hsl(24, 85%, 45%)' },
              }}
            >
              View Results
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}


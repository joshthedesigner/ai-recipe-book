'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import TopNav from '@/components/TopNav';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function BrowsePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filterTag, setFilterTag] = useState('');
  const [filterContributor, setFilterContributor] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Get unique tags and contributors for filter dropdowns
  const allTags = Array.from(new Set(recipes.flatMap(r => r.tags))).sort();
  const allContributors = Array.from(new Set(recipes.map(r => r.contributor_name))).sort();

  // Auth protection: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch recipes on mount
  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  // Apply filters whenever recipes, search, or filters change
  useEffect(() => {
    applyFilters();
  }, [recipes, searchQuery, sortBy, filterTag, filterContributor]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recipes');
      const data = await response.json();

      if (data.success) {
        setRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
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

    // Tag filter
    if (filterTag) {
      filtered = filtered.filter((recipe) => recipe.tags.includes(filterTag));
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

  const handleDeleteRecipe = (recipeId: string) => {
    // Remove the deleted recipe from state
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId));
    setSelectedRecipe(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTag('');
    setFilterContributor('');
    setSortBy('created_at');
  };

  const hasActiveFilters = searchQuery || filterTag || filterContributor || sortBy !== 'created_at';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Recipe Collection
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse and search your saved recipes
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 4 }}>
          {/* Search Bar */}
          <TextField
            fullWidth
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
            sx={{ mb: 2 }}
          />

          {/* Filters Row */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="created_at">Date Added (Newest)</MenuItem>
                  <MenuItem value="title">Title (A-Z)</MenuItem>
                  <MenuItem value="contributor_name">Contributor (A-Z)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Tag</InputLabel>
                <Select
                  value={filterTag}
                  label="Filter by Tag"
                  onChange={(e) => setFilterTag(e.target.value)}
                >
                  <MenuItem value="">All Tags</MenuItem>
                  {allTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Contributor</InputLabel>
                <Select
                  value={filterContributor}
                  label="Filter by Contributor"
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
              <Grid item xs={12} sm={6} md={3}>
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
        </Box>

        {/* Results Count */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? (
              'Loading recipes...'
            ) : (
              <>
                Showing {filteredRecipes.length} of {recipes.length} recipe
                {recipes.length !== 1 ? 's' : ''}
              </>
            )}
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
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
          <Grid container spacing={3}>
            {filteredRecipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                <RecipeCard recipe={recipe} compact onClick={() => handleCardClick(recipe)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={handleDeleteRecipe}
      />
    </Box>
  );
}


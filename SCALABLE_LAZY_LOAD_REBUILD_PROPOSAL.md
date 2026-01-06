# Scalable Lazy Load Rebuild Proposal

## Current Architecture Issues

### Problems with Current Approach:
1. **Mixed responsibilities**: Pagination logic mixed with filter/reset logic
2. **State conflicts**: Multiple places updating `hasMore`, `currentPage`, `displayedRecipes`
3. **Race conditions**: `setTimeout` with no cancellation, stale closures
4. **Scroll listener overhead**: Event listener recreated on every state change
5. **Tight coupling**: Lazy loading logic tightly coupled to filter changes

## Proposed Architecture: Separation of Concerns

### Core Principles:
1. **Single Responsibility**: Each piece has one job
2. **Single Source of Truth**: Pagination state managed in one place
3. **Immutable Updates**: Use functional updates for all state
4. **Cancelable Operations**: All async operations can be cancelled
5. **Performance First**: Use modern APIs (IntersectionObserver) instead of scroll events

## New Architecture Design

### 1. Data Layer: Recipe Store

```typescript
// Separate hook for managing recipe data and pagination
function useRecipePagination(filteredRecipes: Recipe[], pageSize: number) {
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  
  // Single source of truth for "has more"
  const hasMore = useMemo(() => {
    const totalItems = filteredRecipes.length;
    const itemsDisplayed = displayedRecipes.length;
    return itemsDisplayed < totalItems;
  }, [filteredRecipes.length, displayedRecipes.length]);
  
  // Reset when filtered recipes change (new filter/search)
  useEffect(() => {
    setCurrentPage(0);
    setDisplayedRecipes(filteredRecipes.slice(0, pageSize));
  }, [filteredRecipes, pageSize]); // Only when filteredRecipes array reference changes
  
  // Load more function - pure and predictable
  const loadMore = useCallback(() => {
    setCurrentPage(prev => {
      const nextPage = prev + 1;
      const startIndex = nextPage * pageSize;
      const endIndex = startIndex + pageSize;
      const nextBatch = filteredRecipes.slice(startIndex, endIndex);
      
      if (nextBatch.length > 0) {
        setDisplayedRecipes(prevDisplayed => {
          const existingIds = new Set(prevDisplayed.map(r => r.id));
          const newRecipes = nextBatch.filter(r => r.id && !existingIds.has(r.id));
          return [...prevDisplayed, ...newRecipes];
        });
      }
      
      return nextPage;
    });
  }, [filteredRecipes, pageSize]);
  
  // Merge new recipes when filters don't change (recipe added/favorited)
  const mergeNewRecipes = useCallback((newRecipes: Recipe[]) => {
    setDisplayedRecipes(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const recipesToAdd = newRecipes.filter(r => r.id && !existingIds.has(r.id));
      if (recipesToAdd.length === 0) return prev;
      
      // Maintain sort order from filteredRecipes
      return [...recipesToAdd, ...prev].filter((r, i, arr) => 
        arr.findIndex(other => other.id === r.id) === i
      );
    });
  }, []);
  
  return {
    displayedRecipes,
    hasMore,
    loadMore,
    mergeNewRecipes,
    reset: () => {
      setCurrentPage(0);
      setDisplayedRecipes(filteredRecipes.slice(0, pageSize));
    },
  };
}
```

### 2. Scroll Detection: IntersectionObserver Hook

```typescript
// Modern, performant scroll detection using IntersectionObserver
function useInfiniteScroll(
  callback: () => void,
  enabled: boolean,
  threshold: number = 300
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback ref up to date without recreating observer
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Create observer once, reuse it
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            callbackRef.current();
          }
        },
        {
          root: null, // viewport
          rootMargin: `${threshold}px`, // Trigger before reaching bottom
          threshold: 0.1,
        }
      );
    }
    
    const observer = observerRef.current;
    const sentinel = sentinelRef.current;
    
    if (sentinel) {
      observer.observe(sentinel);
    }
    
    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [enabled, threshold]);
  
  return sentinelRef;
}
```

### 3. Filter Change Detection: Smart Reset Logic

```typescript
// Separate hook for detecting filter changes vs recipe updates
function useFilterChangeDetection(
  sortBy: string,
  searchQuery: string,
  filterCuisine: string,
  filterMainIngredient: string,
  filterFavorites: boolean
) {
  const previousFiltersRef = useRef<{
    sortBy: string;
    searchQuery: string;
    filterCuisine: string;
    filterMainIngredient: string;
    filterFavorites: boolean;
  } | null>(null);
  
  const filtersChanged = useMemo(() => {
    if (previousFiltersRef.current === null) return true;
    
    return (
      sortBy !== previousFiltersRef.current.sortBy ||
      searchQuery !== previousFiltersRef.current.searchQuery ||
      filterCuisine !== previousFiltersRef.current.filterCuisine ||
      filterMainIngredient !== previousFiltersRef.current.filterMainIngredient ||
      filterFavorites !== previousFiltersRef.current.filterFavorites
    );
  }, [sortBy, searchQuery, filterCuisine, filterMainIngredient, filterFavorites]);
  
  useEffect(() => {
    previousFiltersRef.current = {
      sortBy,
      searchQuery,
      filterCuisine,
      filterMainIngredient,
      filterFavorites,
    };
  });
  
  return filtersChanged;
}
```

### 4. Integration: Main Component

```typescript
export default function BrowsePage() {
  // ... existing state ...
  
  // Detect filter changes
  const filtersChanged = useFilterChangeDetection(
    sortBy,
    searchQuery,
    filterCuisine,
    filterMainIngredient,
    filterFavorites
  );
  
  // Pagination hook - manages displayed recipes
  const {
    displayedRecipes,
    hasMore,
    loadMore,
    mergeNewRecipes,
    reset: resetPagination,
  } = useRecipePagination(filteredRecipes, PAGE_SIZE);
  
  // Reset pagination when filters change
  useEffect(() => {
    if (filtersChanged) {
      resetPagination();
    }
  }, [filtersChanged, resetPagination]);
  
  // Merge new recipes when filters don't change
  useEffect(() => {
    if (!filtersChanged && filteredRecipes.length > displayedRecipes.length) {
      const currentIds = new Set(displayedRecipes.map(r => r.id));
      const newRecipes = filteredRecipes.filter(r => r.id && !currentIds.has(r.id));
      if (newRecipes.length > 0) {
        mergeNewRecipes(newRecipes);
      }
    }
  }, [filteredRecipes, filtersChanged, displayedRecipes, mergeNewRecipes]);
  
  // Infinite scroll using IntersectionObserver
  const sentinelRef = useInfiniteScroll(
    loadMore,
    hasMore && !loadingMore && !loading,
    SCROLL_THRESHOLD
  );
  
  // Loading state management
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Wrap loadMore with loading state
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      // Small delay for smooth UX (optional)
      await new Promise(resolve => setTimeout(resolve, 100));
      loadMore();
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loadMore]);
  
  // Update sentinel to use new handler
  const sentinelRef = useInfiniteScroll(
    handleLoadMore,
    hasMore && !loadingMore && !loading,
    SCROLL_THRESHOLD
  );
  
  return (
    // ... JSX ...
    <Grid container spacing={2}>
      {displayedRecipes.map((recipe, index) => (
        <Grid item key={recipe.id} xs={12} sm={6} md={4}>
          <RecipeCard recipe={recipe} />
        </Grid>
      ))}
    </Grid>
    
    {/* IntersectionObserver Sentinel */}
    {hasMore && (
      <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} />
    )}
    
    {loadingMore && (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )}
  );
}
```

## Key Improvements

### 1. **Separation of Concerns**
- Pagination logic in its own hook
- Scroll detection in its own hook
- Filter detection in its own hook
- Main component orchestrates them

### 2. **Single Source of Truth**
- `hasMore` calculated from data, not managed separately
- Pagination state managed in one place
- No conflicting updates

### 3. **Performance**
- IntersectionObserver instead of scroll events (native browser optimization)
- Observer created once, reused
- No event listener overhead
- Efficient re-renders

### 4. **Reliability**
- No `setTimeout` race conditions
- No stale closures (use refs for callbacks)
- Cancelable operations
- Predictable state updates

### 5. **Maintainability**
- Each hook has one job
- Easy to test individual pieces
- Easy to modify without breaking other parts
- Clear data flow

### 6. **Scalability**
- Works with any data source
- Easy to add features (virtual scrolling, skeleton loaders, etc.)
- Easy to optimize further (memoization, etc.)

## Migration Strategy

### Phase 1: Extract Hooks (Non-Breaking)
1. Create `useRecipePagination` hook
2. Create `useInfiniteScroll` hook
3. Create `useFilterChangeDetection` hook
4. Test each hook in isolation

### Phase 2: Integrate (Gradual)
1. Replace current pagination logic with `useRecipePagination`
2. Replace scroll listener with `useInfiniteScroll`
3. Replace filter detection with `useFilterChangeDetection`
4. Test thoroughly

### Phase 3: Optimize (Optional)
1. Add request cancellation if needed
2. Add debouncing for rapid scroll
3. Add skeleton loaders
4. Consider virtual scrolling for very large lists

## Benefits Summary

✅ **No race conditions**: Single source of truth, no conflicting updates
✅ **Better performance**: IntersectionObserver > scroll events
✅ **More maintainable**: Clear separation of concerns
✅ **More testable**: Each hook can be tested independently
✅ **More scalable**: Easy to extend and optimize
✅ **No stale closures**: Refs for callbacks
✅ **Predictable**: Functional updates, immutable patterns

## Code Organization

```
hooks/
  useRecipePagination.ts      # Pagination state management
  useInfiniteScroll.ts         # IntersectionObserver scroll detection
  useFilterChangeDetection.ts  # Smart filter change detection
  index.ts                     # Exports

components/
  BrowsePage.tsx              # Main component (orchestrates hooks)
  RecipeCard.tsx              # Existing
  ...
```

## Additional Optimizations (Future)

1. **Virtual Scrolling**: For 1000+ items (react-window or react-virtuoso)
2. **Request Deduplication**: Prevent multiple simultaneous requests
3. **Prefetching**: Load next page before user scrolls
4. **Skeleton Loaders**: Better loading UX
5. **Error Boundaries**: Graceful error handling
6. **Retry Logic**: Automatic retry on failure


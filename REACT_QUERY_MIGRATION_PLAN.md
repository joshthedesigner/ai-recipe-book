# Best Plan: Migrate to React Query (Industry Standard)

## Why React Query?

✅ **Industry Standard**: Most popular solution (millions of downloads)
✅ **Battle-tested**: Used by Netflix, Amazon, Microsoft, etc.
✅ **Handles everything**: Caching, refetching, error handling, loading states
✅ **Built-in infinite scroll**: `useInfiniteQuery` pattern is the standard
✅ **Server-side pagination ready**: Works perfectly with your existing API
✅ **Less code**: Replaces custom pagination hooks
✅ **Better DX**: Excellent TypeScript support, DevTools

## Current State Analysis

### What You Already Have:
✅ Server-side API with pagination (`limit`, `offset` params)
✅ Filter support (search, cuisine, ingredient, favorites)
✅ Sort support (created_at, title, etc.)

### What Needs Migration:
❌ Custom pagination hooks → React Query `useInfiniteQuery`
❌ Custom scroll detection → IntersectionObserver hook (can keep this, it's simple)
❌ Manual state management → React Query handles it
❌ Manual error handling → React Query handles it

## Migration Plan

### Phase 1: Install & Setup (5 minutes)

```bash
npm install @tanstack/react-query
```

Create React Query provider:

```typescript
// app/providers.tsx (new file)
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Update root layout:

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Phase 2: Create Infinite Query Hook (15 minutes)

```typescript
// hooks/useInfiniteRecipes.ts (new file)
import { useInfiniteQuery } from '@tanstack/react-query';
import { Recipe } from '@/types';

interface InfiniteRecipesParams {
  groupId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  cuisine?: string;
  ingredient?: string;
  favorites?: boolean;
  pageSize?: number;
}

interface RecipesResponse {
  recipes: Recipe[];
  count: number;
  facets?: {
    cuisines: string[];
    ingredients: string[];
  };
}

export function useInfiniteRecipes(params: InfiniteRecipesParams) {
  const {
    groupId,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    cuisine,
    ingredient,
    favorites,
    pageSize = 12,
  } = params;

  return useInfiniteQuery({
    queryKey: ['recipes', 'infinite', {
      groupId,
      sortBy,
      sortOrder,
      search,
      cuisine,
      ingredient,
      favorites,
      pageSize,
    }],
    queryFn: async ({ pageParam = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: pageSize.toString(),
        offset: pageParam.toString(),
        sortBy,
        sortOrder,
      });

      if (groupId) searchParams.set('groupId', groupId);
      if (search) searchParams.set('search', search);
      if (cuisine) searchParams.set('cuisine', cuisine);
      if (ingredient) searchParams.set('ingredient', ingredient);
      if (favorites) searchParams.set('favorites', 'true');

      const response = await fetch(`/api/recipes?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      
      const data: RecipesResponse = await response.json();
      return {
        recipes: data.recipes,
        count: data.count,
        facets: data.facets,
        nextCursor: pageParam + pageSize < data.count ? pageParam + pageSize : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Phase 3: Create IntersectionObserver Hook (10 minutes)

```typescript
// hooks/useInfiniteScroll.ts (new file)
import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  enabled?: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll(
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
) {
  const { enabled = true, rootMargin = '300px' } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.1,
      }
    );

    const sentinel = sentinelRef.current;
    observer.observe(sentinel);

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [enabled, rootMargin]);

  return sentinelRef;
}
```

### Phase 4: Update BrowsePage Component (30 minutes)

```typescript
// app/browse/page.tsx (simplified with React Query)
'use client';

import { useMemo } from 'react';
import { useInfiniteRecipes } from '@/hooks/useInfiniteRecipes';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
// ... other imports

export default function BrowsePage() {
  // ... existing state (only filters/sort, no pagination state)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterMainIngredient, setFilterMainIngredient] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('recently_added');

  // Get active group
  const { activeGroup } = useGroup();

  // Infinite query hook - handles ALL pagination logic
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteRecipes({
    groupId: activeGroup?.id,
    sortBy: sortBy === 'recently_viewed' ? 'created_at' : sortBy,
    sortOrder: 'desc',
    search: searchQuery,
    cuisine: filterCuisine,
    ingredient: filterMainIngredient,
    favorites: filterFavorites,
    pageSize: 12,
  });

  // Flatten pages into single array
  const recipes = useMemo(() => {
    return data?.pages.flatMap(page => page.recipes) ?? [];
  }, [data]);

  // Get facets from first page
  const facets = data?.pages[0]?.facets;

  // Client-side sort for "recently_viewed" (uses localStorage)
  const sortedRecipes = useMemo(() => {
    if (sortBy === 'recently_viewed') {
      const viewed = getRecentlyViewed();
      return [...recipes].sort((a, b) => {
        const aTime = viewed[a.id!] || 0;
        const bTime = viewed[b.id!] || 0;
        return bTime - aTime;
      });
    }
    return recipes;
  }, [recipes, sortBy]);

  // Infinite scroll
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

  // Total count from first page
  const totalRecipeCount = data?.pages[0]?.count ?? 0;

  // Handle recipe added
  const handleRecipeAdded = () => {
    showToast('Recipe saved successfully', 'success');
    // React Query will refetch automatically due to query invalidation
    // Or manually: queryClient.invalidateQueries({ queryKey: ['recipes'] });
  };

  // ... rest of component (filters, UI, etc.)

  return (
    <>
      {/* Filters */}
      {/* ... */}

      {/* Recipe Grid */}
      <Grid container spacing={2}>
        {sortedRecipes.map((recipe) => (
          <Grid item key={recipe.id} xs={12} sm={6} md={4}>
            <RecipeCard recipe={recipe} />
          </Grid>
        ))}
      </Grid>

      {/* IntersectionObserver Sentinel */}
      {hasNextPage && <div ref={sentinelRef} style={{ height: '1px' }} />}

      {/* Loading Indicator */}
      {isFetchingNextPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography color="error">
            Failed to load recipes. Please try again.
          </Typography>
        </Box>
      )}
    </>
  );
}
```

### Phase 5: Handle Recipe Mutations (10 minutes)

For adding/favoriting recipes, invalidate queries:

```typescript
// In components where recipes are added/updated
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// After adding recipe
await addRecipe();
queryClient.invalidateQueries({ queryKey: ['recipes'] });

// After favoriting
await toggleFavorite();
queryClient.invalidateQueries({ queryKey: ['recipes', 'infinite'] });
```

## Benefits After Migration

### Code Reduction:
- ❌ Remove: `useRecipePagination` hook (~100 lines)
- ❌ Remove: Manual `hasMore`, `currentPage`, `displayedRecipes` state
- ❌ Remove: Manual `loadMoreRecipes` function
- ❌ Remove: Manual error handling
- ❌ Remove: Manual loading states
- ✅ Add: React Query setup (~50 lines)
- ✅ Add: `useInfiniteRecipes` hook (~60 lines)
- ✅ Add: `useInfiniteScroll` hook (~40 lines)
- **Net reduction: ~150 lines of code**

### Features Gained:
- ✅ Automatic caching
- ✅ Automatic refetching on window focus
- ✅ Automatic retry on error
- ✅ Request deduplication
- ✅ Background updates
- ✅ DevTools for debugging

### Bugs Fixed:
- ✅ No race conditions (React Query handles it)
- ✅ No stale closures (React Query handles it)
- ✅ No manual request cancellation needed
- ✅ No manual error handling needed
- ✅ No manual loading state needed

## Migration Timeline

**Total Time: ~1-2 hours**

1. Phase 1: Install & Setup (5 min)
2. Phase 2: Create hooks (25 min)
3. Phase 3: Update BrowsePage (30 min)
4. Phase 4: Update mutations (10 min)
5. Phase 5: Testing & cleanup (30 min)

## Rollout Strategy

1. ✅ Install React Query
2. ✅ Create new hooks in parallel (don't break existing code)
3. ✅ Test new hooks in isolation
4. ✅ Migrate BrowsePage component
5. ✅ Remove old pagination code
6. ✅ Test thoroughly
7. ✅ Deploy

## Risk Assessment

**Low Risk:**
- React Query is stable and well-tested
- Can keep old code during migration
- Easy to rollback if needed
- API already supports pagination

**Benefits Outweigh Risks:**
- Industry standard approach
- Less custom code to maintain
- Better performance (caching)
- Better DX (DevTools)

## Recommendation

✅ **Proceed with React Query migration**

This is the industry standard approach and will result in:
- Less code to maintain
- Fewer bugs (library handles edge cases)
- Better performance (caching)
- Easier to extend (well-documented patterns)


import { useInfiniteQuery } from '@tanstack/react-query';
import { Recipe } from '@/types';

interface InfiniteRecipesParams {
  groupId?: string | null;
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
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      
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


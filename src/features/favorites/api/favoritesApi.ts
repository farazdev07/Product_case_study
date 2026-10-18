import { baseApi } from '@shared/api/baseApi';
import type { QueuedAction } from '@features/favorites/model/favoritesSlice';

// dummyjson has no favourites resource. PUT /products/{id} is the closest
// write it offers: it answers with a simulated update and persists nothing.
// This stands in for a real favourites API; it proves the queue delivers each
// action in order and handles failure, not that anything is stored server-side.
export const favoritesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    syncFavorite: build.mutation<
      { id: number },
      Pick<QueuedAction, 'productId' | 'type'>
    >({
      query: ({ productId, type }) => ({
        url: `/products/${productId}`,
        method: 'PUT',
        body: { favorite: type === 'add' },
      }),
    }),
  }),
});

export const { useSyncFavoriteMutation } = favoritesApi;

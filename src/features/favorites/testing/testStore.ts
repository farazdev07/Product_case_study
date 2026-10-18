// Shared by the favourites' tests only; nothing in the app imports this.
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import { networkReducer } from '@features/connectivity';
import {
  favoritesReducer,
  type FavoritesState,
} from '@features/favorites/model/favoritesSlice';

const noFavorites: FavoritesState = { ids: [], queue: [], status: 'idle' };

export const makeStore = (
  favorites: FavoritesState = noFavorites,
  isOnline = true,
) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      network: networkReducer,
      favorites: favoritesReducer,
    },
    preloadedState: {
      network: { isOnline, isInternetReachable: isOnline },
      favorites,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(baseApi.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({ autoBatch: false }),
  });

export type TestStore = ReturnType<typeof makeStore>;

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const stubFetch = (
  handler: (request: Request) => Response | Promise<Response>,
) =>
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async input => handler(input as Request));

export const teardownStore = (store: TestStore) => {
  store.dispatch(baseApi.util.resetApiState());
};

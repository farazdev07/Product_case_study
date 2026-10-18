import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import {
  catalogReducer,
  filtersReducer,
  loadPersistedCatalog,
  registerCatalogPersistence,
  registerFeedReset,
} from '@features/catalog';
import {
  favoritesReducer,
  loadPersistedFavorites,
  registerFavoritesPersistence,
} from '@features/favorites';

// Features register persistence listeners against this instance, so it is
// created here and shared rather than owned by any one feature.
export const listenerMiddleware = createListenerMiddleware();

// Read synchronously, before configureStore, so the very first render already
// has the cached products. An async read would show one empty frame and then
// re-render; MMKV's synchronous API is the reason it was chosen over
// AsyncStorage.
const persistedCatalog = loadPersistedCatalog();
// The queue gets the same treatment: a cold start must find it intact.
const persistedFavorites = loadPersistedFavorites();

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  catalog: catalogReducer,
  filters: filtersReducer,
  favorites: favoritesReducer,
});

const preloadedState: Partial<ReturnType<typeof rootReducer>> = {
  ...(persistedCatalog && { catalog: persistedCatalog }),
  ...(persistedFavorites && { favorites: persistedFavorites }),
};

export const store = configureStore({
  reducer: rootReducer,
  preloadedState,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware),
});

registerCatalogPersistence(listenerMiddleware);
registerFeedReset(listenerMiddleware);
registerFavoritesPersistence(listenerMiddleware);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

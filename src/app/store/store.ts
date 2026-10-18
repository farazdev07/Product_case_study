import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import {
  catalogReducer,
  filtersReducer,
  loadPersistedCatalog,
  registerCatalogPersistence,
  registerFeedReset,
} from '@features/catalog';

// Features register persistence listeners against this instance, so it is
// created here and shared rather than owned by any one feature.
export const listenerMiddleware = createListenerMiddleware();

// Read synchronously, before configureStore, so the very first render already
// has the cached products. An async read would show one empty frame and then
// re-render; MMKV's synchronous API is the reason it was chosen over
// AsyncStorage.
const persistedCatalog = loadPersistedCatalog();

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    catalog: catalogReducer,
    filters: filtersReducer,
  },
  preloadedState: persistedCatalog ? { catalog: persistedCatalog } : undefined,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware),
});

registerCatalogPersistence(listenerMiddleware);
registerFeedReset(listenerMiddleware);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { useQueueSync } from '@features/favorites/lib/useQueueSync';
export {
  favoritesReducer,
  selectQueueLength,
  toggleFavorite,
} from '@features/favorites/model/favoritesSlice';
export {
  loadPersistedFavorites,
  registerFavoritesPersistence,
} from '@features/favorites/model/persistence';

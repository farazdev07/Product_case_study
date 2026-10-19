export { useQueueSync } from '@features/favorites/lib/useQueueSync';
export {
  favoritesReducer,
  selectFavoriteIds,
  selectQueueLength,
  toggleFavorite,
} from '@features/favorites/model/favoritesSlice';
export {
  loadPersistedFavorites,
  registerFavoritesPersistence,
} from '@features/favorites/model/persistence';
export { FavoriteButton } from '@features/favorites/ui/FavoriteButton';

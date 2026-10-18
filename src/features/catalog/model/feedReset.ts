import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import {
  feedCleared,
  type CatalogRootState,
} from '@features/catalog/model/catalogSlice';
import type { FiltersRootState } from '@features/catalog/model/filtersSlice';

// The feed is replaced only when the search term or category actually changes.
// Doing it in a reducer on the action itself would also empty the feed for a
// repeated value, or for clearFilters when only a price filter was set, and no
// refetch would follow because the query arguments had not changed.
export const registerFeedReset = (
  listener: ListenerMiddlewareInstance,
): void => {
  const startListening = listener.startListening.withTypes<
    CatalogRootState & FiltersRootState
  >();

  startListening({
    predicate: (_action, current, previous) =>
      current.filters.searchTerm !== previous.filters.searchTerm ||
      current.filters.categorySlug !== previous.filters.categorySlug,
    effect: (_action, api) => {
      api.dispatch(feedCleared());
    },
  });
};

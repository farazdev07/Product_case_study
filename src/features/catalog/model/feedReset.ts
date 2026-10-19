import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { selectIsOnline, type NetworkRootState } from '@features/connectivity';
import {
  feedCleared,
  type CatalogRootState,
} from '@features/catalog/model/catalogSlice';
import type { FiltersRootState } from '@features/catalog/model/filtersSlice';

// The feed is replaced only when the search term or category actually changes.
// A reducer on the action itself would also empty it for a repeated value or a
// price-only clearFilters, and no refetch would follow.
//
// Offline it is left alone: nothing can replace the feed, and the screen filters
// the cache directly. The first fetch after reconnecting replaces it.
export const registerFeedReset = (
  listener: ListenerMiddlewareInstance,
): void => {
  const startListening = listener.startListening.withTypes<
    CatalogRootState & FiltersRootState & NetworkRootState
  >();

  startListening({
    predicate: (_action, current, previous) =>
      selectIsOnline(current) &&
      (current.filters.searchTerm !== previous.filters.searchTerm ||
        current.filters.categorySlug !== previous.filters.categorySlug),
    effect: (_action, api) => {
      api.dispatch(feedCleared());
    },
  });
};

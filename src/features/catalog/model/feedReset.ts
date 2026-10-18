import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { selectIsOnline, type NetworkRootState } from '@features/connectivity';
import {
  feedCleared,
  type CatalogRootState,
} from '@features/catalog/model/catalogSlice';
import type { FiltersRootState } from '@features/catalog/model/filtersSlice';

// The feed is replaced only when the search term or category actually changes.
// Doing it in a reducer on the action itself would also empty the feed for a
// repeated value, or for clearFilters when only a price filter was set, and no
// refetch would follow because the query arguments had not changed.
//
// Offline it is left alone. Nothing can replace the feed while there is no
// connection, and the screen filters the cached products directly, so clearing
// would only leave the list empty with no way to restore it. The first fetch
// after reconnecting replaces the feed for whichever source is selected then.
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

export type EmptyState =
  | { kind: 'loading' }
  | { kind: 'offline'; filtered: boolean }
  | { kind: 'error' }
  | { kind: 'unloaded-matches' }
  | { kind: 'no-results'; searchTerm: string }
  | { kind: 'empty' };

type EmptyStateInput = {
  isFetching: boolean;
  isError: boolean;
  isNetworkError: boolean;
  hasMore: boolean;
  isOffline: boolean;
  hasCache: boolean;
  searchTerm: string;
  hasActiveFilters: boolean;
};

// An empty list means several different things, and each needs different words
// and a different way out.
export const getEmptyState = ({
  isFetching,
  isError,
  isNetworkError,
  hasMore,
  isOffline,
  hasCache,
  searchTerm,
  hasActiveFilters,
}: EmptyStateInput): EmptyState => {
  if (isFetching) {
    return { kind: 'loading' };
  }
  // Offline the cache is filtered in place, so an empty list is either no cache
  // at all or a filter that matches nothing in it.
  if (isOffline) {
    return hasCache
      ? { kind: 'no-results', searchTerm: searchTerm.trim() }
      : { kind: 'offline', filtered: hasActiveFilters };
  }
  if (isError) {
    return isNetworkError
      ? { kind: 'offline', filtered: hasActiveFilters }
      : { kind: 'error' };
  }
  // The server holds more products than are loaded, so "no results" would be
  // wrong: price and rating only see the pages fetched so far.
  if (hasMore) {
    return { kind: 'unloaded-matches' };
  }
  if (hasActiveFilters) {
    return { kind: 'no-results', searchTerm: searchTerm.trim() };
  }
  return { kind: 'empty' };
};

// fetchBaseQuery reports a request that never received a response (no
// connection, DNS failure) as FETCH_ERROR; an HTTP failure carries a status code.
export const isNetworkError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  error.status === 'FETCH_ERROR';

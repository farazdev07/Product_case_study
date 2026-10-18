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
  searchTerm,
  hasActiveFilters,
}: EmptyStateInput): EmptyState => {
  if (isFetching) {
    return { kind: 'loading' };
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

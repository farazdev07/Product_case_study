// The only backend is the public dummyjson API, which has no secrets or
// per-environment values, so there is no env management (e.g.
// react-native-dotenv) to justify a build-time dependency.
export const API_BASE_URL = 'https://dummyjson.com';

export const PAGE_SIZE = 20;

export const SEARCH_DEBOUNCE_MS = 400;

// Catalog data changes rarely, so the cache exists to make launches instant and
// survive offline rather than to stay fresh. Ten minutes avoids a refetch on
// every quick relaunch while still picking up changes within one session.
export const CACHE_TTL_MS = 10 * 60 * 1000;

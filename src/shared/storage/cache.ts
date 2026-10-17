export type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

export const createCacheEntry = <T>(data: T): CacheEntry<T> => ({
  data,
  cachedAt: Date.now(),
});

// An entry is fresh for the half-open interval [0, ttl): at exactly ttlMs old it
// is already stale, so a TTL of N means "usable for strictly less than N ms".
export const isStale = (entry: CacheEntry<unknown>, ttlMs: number): boolean =>
  Date.now() - entry.cachedAt >= ttlMs;

import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { CACHE_TTL_MS } from '@shared/config/constants';
import {
  createCacheEntry,
  isStale,
  type CacheEntry,
} from '@shared/storage/cache';
import { storage } from '@shared/storage/storage';
import type {
  CatalogRootState,
  CatalogState,
} from '@features/catalog/model/catalogSlice';

const STORAGE_KEY = 'catalog';

// Paging fires a burst of state changes; this bounds MMKV writes to one per window.
const WRITE_THROTTLE_MS = 1000;

// Valid JSON from an older app version can still have the wrong shape, and
// hydrating it would crash the selectors on launch instead of missing the cache.
const isPersistedEntry = (
  value: unknown,
): value is CacheEntry<CatalogState> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { cachedAt, data } = value as Partial<
    CacheEntry<Partial<CatalogState> | null>
  >;

  return (
    typeof cachedAt === 'number' &&
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.ids) &&
    typeof data.entities === 'object' &&
    data.entities !== null &&
    Array.isArray(data.feedIds) &&
    typeof data.total === 'number'
  );
};

export const loadPersistedCatalog = (): CatalogState | undefined => {
  const entry = storage.get<unknown>(STORAGE_KEY);

  if (!isPersistedEntry(entry) || isStale(entry, CACHE_TTL_MS)) {
    return undefined;
  }
  return entry.data;
};

export const registerCatalogPersistence = (
  listener: ListenerMiddlewareInstance,
): void => {
  const startListening = listener.startListening.withTypes<CatalogRootState>();
  let writePending = false;

  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.catalog !== previousState.catalog,
    effect: async (_action, api) => {
      if (writePending) {
        return;
      }
      writePending = true;

      try {
        await api.delay(WRITE_THROTTLE_MS);
        // Read after the delay so the write carries every change in the window.
        storage.set(STORAGE_KEY, createCacheEntry(api.getState().catalog));
      } finally {
        writePending = false;
      }
    },
  });
};

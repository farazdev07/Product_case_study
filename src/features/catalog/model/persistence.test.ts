import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { MMKV } from 'react-native-mmkv';
import { CACHE_TTL_MS } from '@shared/config/constants';
import * as logger from '@shared/lib/logger';
import { createCacheEntry } from '@shared/storage/cache';
import { storage } from '@shared/storage/storage';
import {
  catalogReducer,
  feedCleared,
} from '@features/catalog/model/catalogSlice';
import { makeCatalogState } from '@features/catalog/testing/testStore';
import {
  loadPersistedCatalog,
  registerCatalogPersistence,
} from '@features/catalog/model/persistence';

const NOW = 1_700_000_000_000;

const catalogState = makeCatalogState([1, 2], 10, NOW, [
  { slug: 'beauty', name: 'Beauty' },
]);

describe('loadPersistedCatalog', () => {
  beforeEach(() => {
    storage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the persisted state when it is fresh', () => {
    storage.set('catalog', createCacheEntry(catalogState));

    expect(loadPersistedCatalog()).toEqual(catalogState);
  });

  it('restores the category list', () => {
    storage.set('catalog', createCacheEntry(catalogState));

    expect(loadPersistedCatalog()?.categories).toEqual([
      { slug: 'beauty', name: 'Beauty' },
    ]);
  });

  it('returns undefined when nothing is persisted', () => {
    expect(loadPersistedCatalog()).toBeUndefined();
  });

  it('returns undefined without throwing when the stored JSON is corrupt', () => {
    jest.spyOn(MMKV.prototype, 'getString').mockReturnValue('{not json');
    jest.spyOn(logger, 'devWarn').mockImplementation(() => {});

    expect(loadPersistedCatalog()).toBeUndefined();
  });

  it.each([
    ['a non-object', 42],
    ['an entry without data', { cachedAt: NOW }],
    ['data of the wrong shape', { cachedAt: NOW, data: { ids: 'nope' } }],
    [
      'data from before feeds had a source',
      {
        cachedAt: NOW,
        data: { ...catalogState, feedKey: undefined },
      },
    ],
    [
      'data from before categories were cached',
      { cachedAt: NOW, data: { ...catalogState, categories: undefined } },
    ],
    ['an entry without a timestamp', { data: catalogState }],
  ])('returns undefined for %s', (_, value) => {
    storage.set('catalog', value);

    expect(loadPersistedCatalog()).toBeUndefined();
  });

  // The TTL decides when to revalidate, never what survives a launch.
  it.each([
    ['just inside the ttl', CACHE_TTL_MS - 1],
    ['exactly the ttl', CACHE_TTL_MS],
    ['a week past the ttl', 7 * 24 * 60 * 60 * 1000],
  ])('still returns an entry that is %s old', (_, age) => {
    storage.set('catalog', { data: catalogState, cachedAt: NOW - age });

    expect(loadPersistedCatalog()).toEqual(catalogState);
  });
});

describe('registerCatalogPersistence', () => {
  const makeStore = () => {
    const listener = createListenerMiddleware();
    registerCatalogPersistence(listener);

    return configureStore({
      reducer: { catalog: catalogReducer },
      preloadedState: { catalog: catalogState },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().prepend(listener.middleware),
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    storage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not write on the dispatch itself', async () => {
    const setSpy = jest.spyOn(storage, 'set');

    makeStore().dispatch(feedCleared());
    await jest.advanceTimersByTimeAsync(999);

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('writes the latest state once for a burst of changes', async () => {
    const setSpy = jest.spyOn(storage, 'set');
    const store = makeStore();

    store.dispatch(feedCleared());
    await jest.advanceTimersByTimeAsync(300);
    store.dispatch(feedCleared());
    await jest.advanceTimersByTimeAsync(700);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(loadPersistedCatalog()).toEqual(store.getState().catalog);
  });

  it('writes again for changes in a later window', async () => {
    const setSpy = jest.spyOn(storage, 'set');
    const store = makeStore();

    store.dispatch(feedCleared());
    await jest.advanceTimersByTimeAsync(1000);
    store.dispatch(feedCleared());
    await jest.advanceTimersByTimeAsync(1000);

    expect(setSpy).toHaveBeenCalledTimes(2);
  });

  it('ignores actions that leave the catalog unchanged', async () => {
    const setSpy = jest.spyOn(storage, 'set');

    makeStore().dispatch({ type: 'unrelated' });
    await jest.advanceTimersByTimeAsync(2000);

    expect(setSpy).not.toHaveBeenCalled();
  });
});

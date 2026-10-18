import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { MMKV } from 'react-native-mmkv';
import * as logger from '@shared/lib/logger';
import { storage } from '@shared/storage/storage';
import {
  favoritesReducer,
  syncStarted,
  toggleFavorite,
  type FavoritesState,
} from '@features/favorites/model/favoritesSlice';
import {
  loadPersistedFavorites,
  registerFavoritesPersistence,
} from '@features/favorites/model/persistence';

const action = {
  id: 'a1',
  productId: 3,
  type: 'add',
  createdAt: 1_700_000_000_000,
  attempts: 2,
} as const;

const makeStore = (preloaded?: FavoritesState) => {
  const listener = createListenerMiddleware();
  registerFavoritesPersistence(listener);

  return configureStore({
    reducer: { favorites: favoritesReducer },
    preloadedState: preloaded ? { favorites: preloaded } : undefined,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().prepend(listener.middleware),
  });
};

describe('loadPersistedFavorites', () => {
  beforeEach(() => {
    storage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates ids and queue and starts idle', () => {
    storage.set('favorites', { ids: [3], queue: [action] });

    expect(loadPersistedFavorites()).toEqual({
      ids: [3],
      queue: [action],
      status: 'idle',
    });
  });

  it('returns undefined when nothing is persisted', () => {
    expect(loadPersistedFavorites()).toBeUndefined();
  });

  it('returns undefined without throwing when the stored JSON is corrupt', () => {
    jest.spyOn(MMKV.prototype, 'getString').mockReturnValue('{not json');
    jest.spyOn(logger, 'devWarn').mockImplementation(() => {});

    expect(loadPersistedFavorites()).toBeUndefined();
  });

  it.each([
    ['a non-object', 42],
    ['missing queue', { ids: [1] }],
    ['non-numeric ids', { ids: ['1'], queue: [] }],
    ['a queue that is not an array', { ids: [], queue: {} }],
    [
      'a queued action with an unknown type',
      {
        ids: [],
        queue: [{ ...action, type: 'toggle' }],
      },
    ],
    [
      'a queued action without attempts',
      {
        ids: [],
        queue: [{ ...action, attempts: undefined }],
      },
    ],
    ['a queue entry that is not an object', { ids: [], queue: [null] }],
  ])('returns undefined for %s', (_, value) => {
    storage.set('favorites', value);

    expect(loadPersistedFavorites()).toBeUndefined();
  });
});

describe('registerFavoritesPersistence', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('writes a toggle synchronously', () => {
    const store = makeStore();

    store.dispatch(toggleFavorite(5));

    expect(storage.get('favorites')).toEqual({
      ids: [5],
      queue: [expect.objectContaining({ productId: 5, type: 'add' })],
    });
  });

  it('does not write for status-only changes', () => {
    const store = makeStore();
    const set = jest.spyOn(storage, 'set');

    store.dispatch(syncStarted());

    expect(set).not.toHaveBeenCalled();
  });

  it('survives a restart: what one store wrote the next one loads', () => {
    const first = makeStore();
    first.dispatch(toggleFavorite(5));
    first.dispatch(toggleFavorite(6));
    first.dispatch(syncStarted());

    const hydrated = loadPersistedFavorites();
    const second = makeStore(hydrated);

    expect(second.getState().favorites.ids).toEqual([5, 6]);
    expect(second.getState().favorites.queue).toEqual(
      first.getState().favorites.queue,
    );
    expect(second.getState().favorites.status).toBe('idle');
  });
});

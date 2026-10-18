import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { storage } from '@shared/storage/storage';
import type {
  FavoritesRootState,
  FavoritesState,
  QueuedAction,
} from '@features/favorites/model/favoritesSlice';

const STORAGE_KEY = 'favorites';

type Persisted = Pick<FavoritesState, 'ids' | 'queue'>;

const isQueuedAction = (value: unknown): value is QueuedAction => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const action = value as Partial<QueuedAction>;

  return (
    typeof action.id === 'string' &&
    typeof action.productId === 'number' &&
    (action.type === 'add' || action.type === 'remove') &&
    typeof action.createdAt === 'number' &&
    typeof action.attempts === 'number'
  );
};

// Valid JSON of the wrong shape would crash the selectors on launch; an
// unreadable queue is discarded instead, which loses pending syncs but not
// the app.
const isPersisted = (value: unknown): value is Persisted => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { ids, queue } = value as Partial<Persisted>;

  return (
    Array.isArray(ids) &&
    ids.every(id => typeof id === 'number') &&
    Array.isArray(queue) &&
    queue.every(isQueuedAction)
  );
};

export const loadPersistedFavorites = (): FavoritesState | undefined => {
  const stored = storage.get<unknown>(STORAGE_KEY);
  if (!isPersisted(stored)) {
    return undefined;
  }

  // The status is not persisted: a launch interrupted mid-sync would
  // otherwise hydrate as "syncing" with nothing running.
  return { ids: stored.ids, queue: stored.queue, status: 'idle' };
};

export const registerFavoritesPersistence = (
  listener: ListenerMiddlewareInstance,
): void => {
  const startListening =
    listener.startListening.withTypes<FavoritesRootState>();

  // No throttle, unlike the catalog cache: this is the user's data rather than
  // a disposable copy, writes are rare (one per tap), and the MMKV write is
  // synchronous, so the queue is on disk before a kill can lose it. Status
  // changes are excluded; they carry nothing worth persisting.
  startListening({
    predicate: (_action, currentState, previousState) =>
      currentState.favorites.ids !== previousState.favorites.ids ||
      currentState.favorites.queue !== previousState.favorites.queue,
    effect: (_action, api) => {
      const { ids, queue } = api.getState().favorites;
      storage.set<Persisted>(STORAGE_KEY, { ids, queue });
    },
  });
};

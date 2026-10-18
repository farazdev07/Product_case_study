import {
  MAX_ATTEMPTS,
  actionFailed,
  actionSucceeded,
  favoritesReducer,
  selectIsFavorite,
  selectQueue,
  selectQueueLength,
  syncFinished,
  syncStarted,
  toggleFavorite,
  type FavoritesState,
} from '@features/favorites/model/favoritesSlice';

const empty = favoritesReducer(undefined, { type: 'init' });

const toggleAll = (state: FavoritesState, ...productIds: number[]) =>
  productIds.reduce(
    (current, id) => favoritesReducer(current, toggleFavorite(id)),
    state,
  );

describe('favoritesSlice', () => {
  it('starts empty and idle', () => {
    expect(empty).toEqual({ ids: [], queue: [], status: 'idle' });
  });

  describe('toggleFavorite', () => {
    it('marks the product as a favourite immediately', () => {
      const state = toggleAll(empty, 7);

      expect(state.ids).toEqual([7]);
      expect(selectIsFavorite({ favorites: state }, 7)).toBe(true);
      expect(selectIsFavorite({ favorites: state }, 8)).toBe(false);
    });

    it('enqueues an add with no attempts', () => {
      const state = toggleAll(empty, 7);

      expect(state.queue).toEqual([
        {
          id: expect.any(String),
          productId: 7,
          type: 'add',
          createdAt: expect.any(Number),
          attempts: 0,
        },
      ]);
    });

    it('stamps each action with a distinct id', () => {
      const [first, second] = toggleAll(empty, 1, 2).queue;

      expect(first?.id).not.toBe(second?.id);
    });

    it('unfavouriting a synced favourite enqueues a remove', () => {
      const synced: FavoritesState = { ...empty, ids: [7] };

      const state = toggleAll(synced, 7);

      expect(state.ids).toEqual([]);
      expect(state.queue.map(({ type }) => type)).toEqual(['remove']);
    });

    it('cancels a pending add when the product is unfavourited', () => {
      const state = toggleAll(empty, 7, 7);

      expect(state.ids).toEqual([]);
      expect(state.queue).toEqual([]);
    });

    it('cancels a pending remove when the product is favourited again', () => {
      const synced: FavoritesState = { ...empty, ids: [7] };

      const state = toggleAll(synced, 7, 7);

      expect(state.ids).toEqual([7]);
      expect(state.queue).toEqual([]);
    });

    it('cancels only the matching product and keeps the rest in order', () => {
      const state = toggleAll(empty, 1, 2, 3, 2);

      expect(state.ids).toEqual([1, 3]);
      expect(state.queue.map(({ productId }) => productId)).toEqual([1, 3]);
    });

    it('does not cancel the action that is being sent', () => {
      const sending = { ...toggleAll(empty, 7), status: 'syncing' as const };

      const state = toggleAll(sending, 7);

      expect(state.queue.map(({ type }) => type)).toEqual(['add', 'remove']);
    });

    it('still cancels a queued action behind the one being sent', () => {
      const sending = { ...toggleAll(empty, 1, 7), status: 'syncing' as const };

      const state = toggleAll(sending, 7);

      expect(state.queue.map(({ productId }) => productId)).toEqual([1]);
    });

    it('preserves first-in first-out order', () => {
      const state = toggleAll(empty, 3, 1, 2);

      expect(state.queue.map(({ productId }) => productId)).toEqual([3, 1, 2]);
    });
  });

  describe('drain lifecycle', () => {
    it('tracks the syncing status', () => {
      const started = favoritesReducer(empty, syncStarted());
      expect(started.status).toBe('syncing');

      expect(favoritesReducer(started, syncFinished()).status).toBe('idle');
    });

    it('removes a delivered action and keeps the others', () => {
      const queued = toggleAll(empty, 1, 2);
      const [first] = queued.queue;

      const state = favoritesReducer(queued, actionSucceeded(first?.id ?? ''));

      expect(state.queue.map(({ productId }) => productId)).toEqual([2]);
    });

    it('counts failed attempts and keeps the action at the front', () => {
      const queued = toggleAll(empty, 1, 2);
      const [first] = queued.queue;

      const state = favoritesReducer(queued, actionFailed(first?.id ?? ''));

      expect(state.queue.map(({ productId }) => productId)).toEqual([1, 2]);
      expect(state.queue[0]?.attempts).toBe(1);
      expect(state.queue[1]?.attempts).toBe(0);
    });

    it('drops an action once it reaches the attempt cap', () => {
      let state = toggleAll(empty, 1, 2);
      const id = state.queue[0]?.id ?? '';

      for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
        state = favoritesReducer(state, actionFailed(id));
        expect(state.queue).toHaveLength(2);
      }
      state = favoritesReducer(state, actionFailed(id));

      expect(state.queue.map(({ productId }) => productId)).toEqual([2]);
    });

    it('keeps the optimistic state of a dropped action', () => {
      let state = toggleAll(empty, 1);
      const id = state.queue[0]?.id ?? '';

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        state = favoritesReducer(state, actionFailed(id));
      }

      expect(state.queue).toEqual([]);
      expect(state.ids).toEqual([1]);
    });

    it('ignores an outcome for an action that is no longer queued', () => {
      const queued = toggleAll(empty, 1);

      expect(favoritesReducer(queued, actionFailed('gone'))).toBe(queued);
      expect(favoritesReducer(queued, actionSucceeded('gone'))).toEqual(queued);
    });
  });

  it('selects the queue and its length', () => {
    const state = { favorites: toggleAll(empty, 1, 2) };

    expect(selectQueue(state)).toHaveLength(2);
    expect(selectQueueLength(state)).toBe(2);
  });
});

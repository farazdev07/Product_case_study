import { listenerMiddleware, store } from '@app/store/store';

describe('store', () => {
  it('mounts the api reducer', () => {
    expect(store.getState()).toHaveProperty('api');
  });

  it('runs dispatched actions through the listener middleware', () => {
    const effect = jest.fn();
    const unsubscribe = listenerMiddleware.startListening({
      type: 'test/ping',
      effect,
    });

    store.dispatch({ type: 'test/ping' });
    unsubscribe();

    expect(effect).toHaveBeenCalledTimes(1);
  });
});

describe('store hydration', () => {
  const NOW = 1_700_000_000_000;
  const persisted = {
    ids: [1],
    entities: {
      1: {
        id: 1,
        title: 'Cached',
        description: 'd',
        category: 'beauty',
        price: 1,
        discountPercentage: 0,
        rating: 4,
        stock: 1,
        thumbnail: 't',
        images: [],
      },
    },
    feedIds: [1],
    feedKey: 'all',
    total: 5,
    lastFetchedAt: NOW,
    categories: [{ slug: 'beauty', name: 'Beauty' }],
  };

  // The store hydrates when its module is evaluated, so each case seeds
  // storage and then loads a fresh copy of the module.
  const loadStoreWith = (
    seed: (set: (value: unknown) => void) => void,
    key = 'catalog',
  ) => {
    let hydrated: unknown;
    jest.isolateModules(() => {
      const { storage } = jest.requireActual('@shared/storage/storage');
      seed(value => storage.set(key, value));
      hydrated = jest.requireActual('@app/store/store').store.getState();
    });
    return hydrated as {
      catalog: typeof persisted;
      favorites: { ids: number[]; queue: unknown[]; status: string };
    };
  };

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with the persisted catalog before anything is dispatched', () => {
    const state = loadStoreWith(set => set({ data: persisted, cachedAt: NOW }));

    expect(state.catalog).toEqual(persisted);
  });

  it('starts empty when nothing is persisted', () => {
    const state = loadStoreWith(() => {});

    expect(state.catalog.ids).toEqual([]);
    expect(state.catalog.feedIds).toEqual([]);
  });

  it('starts with the persisted catalog however old it is', () => {
    const state = loadStoreWith(set =>
      set({ data: persisted, cachedAt: NOW - 24 * 60 * 60 * 1000 }),
    );

    expect(state.catalog).toEqual(persisted);
  });

  it('starts with the persisted favourites and queue, idle', () => {
    const queue = [
      { id: 'a', productId: 4, type: 'add', createdAt: NOW, attempts: 1 },
    ];

    const state = loadStoreWith(set => set({ ids: [4], queue }), 'favorites');

    expect(state.favorites).toEqual({ ids: [4], queue, status: 'idle' });
  });

  it('starts with no favourites when nothing is persisted', () => {
    const state = loadStoreWith(() => {});

    expect(state.favorites).toEqual({ ids: [], queue: [], status: 'idle' });
  });
});

import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { CACHE_TTL_MS, PAGE_SIZE } from '@shared/config/constants';
import {
  canLoadMore,
  useProductFeed,
} from '@features/catalog/lib/useProductFeed';
import {
  setCategory,
  setMaxPrice,
  setSearchTerm,
} from '@features/catalog/model/filtersSlice';
import {
  jsonResponse,
  makeCatalogState,
  makeStore,
  pagedCatalog,
  stubFetch,
  stubGatedFetch,
  teardownStore,
  type TestStore,
} from '@features/catalog/testing/testStore';

// RTK Query batches subscription updates on a timer, and the navigation and list
// libraries schedule frames. Fake timers discard whatever is still pending when
// a test ends; real ones would fire after Jest has closed the environment.
jest.useFakeTimers();

describe('canLoadMore', () => {
  const idle = { isFetching: false, isError: false, loaded: 20, total: 50 };

  it('allows loading when idle and more products remain', () => {
    expect(canLoadMore(idle)).toBe(true);
  });

  it('blocks while a request is in flight', () => {
    expect(canLoadMore({ ...idle, isFetching: true })).toBe(false);
  });

  it('blocks after a failure until the user retries', () => {
    expect(canLoadMore({ ...idle, isError: true })).toBe(false);
  });

  it('blocks once every product is loaded', () => {
    expect(canLoadMore({ ...idle, loaded: 50 })).toBe(false);
  });

  it('blocks before the first page has reported a total', () => {
    expect(canLoadMore({ ...idle, loaded: 0, total: 0 })).toBe(false);
  });
});

describe('useProductFeed', () => {
  let store: TestStore;
  let requestedSkips: number[];
  let requestedPaths: string[];

  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );

  const serve = (total: number) => {
    const page = pagedCatalog(total);
    stubFetch(url => {
      requestedSkips.push(Number(url.searchParams.get('skip')));
      requestedPaths.push(url.pathname);
      return page(url);
    });
  };

  beforeEach(() => {
    store = makeStore();
    requestedSkips = [];
    requestedPaths = [];
  });

  afterEach(() => {
    // Unmounting unsubscribes the query, which arms RTK Query's expiry timer;
    // it must happen before the reset that cancels those timers.
    cleanup();
    teardownStore(store);
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('loads the first page on mount', async () => {
    serve(50);

    const { result } = renderHook(() => useProductFeed(), { wrapper });

    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );
    expect(requestedSkips).toEqual([0]);
  });

  it('requests the next page when the end is reached', async () => {
    serve(50);
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE * 2),
    );
    expect(requestedSkips).toEqual([0, PAGE_SIZE]);
  });

  it('ignores end-reached events while the first page is loading', async () => {
    serve(50);
    const { result } = renderHook(() => useProductFeed(), { wrapper });

    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );

    expect(requestedSkips).toEqual([0]);
  });

  it('requests a page once when end-reached fires twice before a re-render', async () => {
    serve(100);
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE * 2),
    );

    expect(requestedSkips).toEqual([0, PAGE_SIZE]);
  });

  it('stops requesting once every product is loaded', async () => {
    serve(PAGE_SIZE + 5);
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );
    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE + 5),
    );

    act(() => result.current.loadMore());

    expect(requestedSkips).toEqual([0, PAGE_SIZE]);
  });

  it('refreshes from a later page by requesting the first page again', async () => {
    serve(100);
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );
    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE * 2),
    );

    act(() => result.current.refresh());

    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );
    expect(requestedSkips).toEqual([0, PAGE_SIZE, 0]);
  });

  it('refreshes the first page in place', async () => {
    serve(50);
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );

    act(() => result.current.refresh());

    await waitFor(() => expect(requestedSkips).toEqual([0, 0]));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it('reports an error, blocks paging, and recovers on retry', async () => {
    let failing = true;
    const page = pagedCatalog(50);
    stubFetch(url => {
      requestedSkips.push(Number(url.searchParams.get('skip')));
      return failing ? jsonResponse({ message: 'down' }, 500) : page(url);
    });
    const { result } = renderHook(() => useProductFeed(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => result.current.loadMore());
    expect(requestedSkips).toEqual([0]);

    failing = false;
    act(() => {
      result.current.retry();
    });
    await waitFor(() =>
      expect(result.current.products).toHaveLength(PAGE_SIZE),
    );
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.isError).toBe(false);
  });

  it('shows cached products immediately, before any request completes', async () => {
    store = makeStore(makeCatalogState([1, 2, 3], 50));
    const release = stubGatedFetch(pagedCatalog(50));

    const { result } = renderHook(() => useProductFeed(), { wrapper });

    expect(result.current.products.map(product => product.id)).toEqual([
      1, 2, 3,
    ]);
    expect(result.current.isRefreshing).toBe(true);

    release();
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  describe('with a hydrated feed', () => {
    const hydrate = (lastFetchedAt: number) => {
      const loaded = Array.from({ length: PAGE_SIZE * 2 }, (_, i) => i + 1);
      store = makeStore(makeCatalogState(loaded, 100, lastFetchedAt));
    };

    it('makes no request on mount while the cache is fresh', async () => {
      hydrate(Date.now() - CACHE_TTL_MS + 60_000);
      serve(100);

      const { result } = renderHook(() => useProductFeed(), { wrapper });

      expect(result.current.products).toHaveLength(PAGE_SIZE * 2);
      expect(result.current.isFetching).toBe(false);
      expect(requestedSkips).toEqual([]);
    });

    it('revalidates the first page on mount once the cache is as old as the ttl', async () => {
      hydrate(Date.now() - CACHE_TTL_MS);
      serve(100);

      const { result } = renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() => expect(requestedSkips).toEqual([0]));
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('continues paging after the loaded products, not from the first page', async () => {
      hydrate(Date.now());
      serve(100);
      const { result } = renderHook(() => useProductFeed(), { wrapper });

      act(() => result.current.loadMore());

      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE * 3),
      );
      expect(requestedSkips).toEqual([PAGE_SIZE * 2]);
    });

    it('refreshes from the first page even when nothing was fetched on mount', async () => {
      hydrate(Date.now());
      serve(100);
      const { result } = renderHook(() => useProductFeed(), { wrapper });

      act(() => result.current.refresh());

      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE),
      );
      expect(requestedSkips).toEqual([0]);
    });
  });

  describe('choosing the endpoint', () => {
    const filter = (action: Parameters<TestStore['dispatch']>[0]) =>
      act(() => {
        store.dispatch(action);
      });

    it('lists everything by default', async () => {
      serve(50);

      renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() => expect(requestedPaths).toEqual(['/products']));
    });

    it('searches when there is a search term', async () => {
      store.dispatch(setSearchTerm('phone'));
      serve(50);

      renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() => expect(requestedPaths).toEqual(['/products/search']));
    });

    it('uses the category endpoint when only a category is chosen', async () => {
      store.dispatch(setCategory('beauty'));
      serve(50);

      renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() =>
        expect(requestedPaths).toEqual(['/products/category/beauty']),
      );
    });

    it('searches on the server and ignores the category endpoint when both are set', async () => {
      store.dispatch(setSearchTerm('phone'));
      store.dispatch(setCategory('beauty'));
      serve(50);

      const { result } = renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(requestedPaths).toEqual(['/products/search']);
    });

    it('treats a whitespace-only term as no search', async () => {
      store.dispatch(setSearchTerm('   '));
      serve(50);

      renderHook(() => useProductFeed(), { wrapper });

      await waitFor(() => expect(requestedPaths).toEqual(['/products']));
    });

    it('switches endpoint when the filters change and restarts at the first page', async () => {
      serve(100);
      const { result } = renderHook(() => useProductFeed(), { wrapper });
      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE),
      );
      act(() => result.current.loadMore());
      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE * 2),
      );

      filter(setSearchTerm('phone'));

      await waitFor(() =>
        expect(requestedPaths).toEqual([
          '/products',
          '/products',
          '/products/search',
        ]),
      );
      expect(requestedSkips).toEqual([0, PAGE_SIZE, 0]);
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('hides the previous source feed as soon as the source changes', async () => {
      serve(50);
      const { result } = renderHook(() => useProductFeed(), { wrapper });
      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE),
      );

      filter(setSearchTerm('phone'));

      expect(result.current.products).toEqual([]);
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('does not show a hydrated feed that belongs to another source', async () => {
      store = makeStore(makeCatalogState([1, 2, 3], 50, Date.now()));
      store.dispatch(setSearchTerm('phone'));
      serve(50);

      const { result } = renderHook(() => useProductFeed(), { wrapper });

      expect(result.current.products).toEqual([]);
      await waitFor(() => expect(requestedPaths).toEqual(['/products/search']));
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('pages from the loaded count, not the filtered one, when a client filter hides rows', async () => {
      store = makeStore(makeCatalogState([1, 2, 3], 50, Date.now()));
      store.dispatch(setMaxPrice(0.01));
      serve(50);
      const { result } = renderHook(() => useProductFeed(), { wrapper });
      expect(result.current.products).toEqual([]);

      act(() => result.current.loadMore());

      await waitFor(() => expect(requestedSkips).toEqual([3]));
      await waitFor(() => expect(result.current.isFetching).toBe(false));
    });

    it('pages within the chosen source', async () => {
      store.dispatch(setCategory('beauty'));
      serve(50);
      const { result } = renderHook(() => useProductFeed(), { wrapper });
      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE),
      );

      act(() => result.current.loadMore());

      await waitFor(() =>
        expect(result.current.products).toHaveLength(PAGE_SIZE * 2),
      );
      expect(requestedPaths).toEqual([
        '/products/category/beauty',
        '/products/category/beauty',
      ]);
    });
  });
});

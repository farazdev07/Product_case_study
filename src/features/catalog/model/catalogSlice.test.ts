import { catalogApi } from '@features/catalog/api/catalogApi';
import {
  feedCleared,
  selectCategories,
  selectFeedIds,
  selectFeedKey,
  selectFeedProducts,
  selectFeedTotal,
  selectProductById,
} from '@features/catalog/model/catalogSlice';
import {
  jsonResponse,
  makeCatalogState,
  makeProduct,
  makeStore,
  pagedCatalog,
  stubFetch,
  teardownStore,
  testCategories,
  type TestStore,
} from '@features/catalog/testing/testStore';

const TOTAL = 6;

describe('catalogSlice', () => {
  let store: TestStore;

  const loadPage = (skip: number) =>
    store.dispatch(
      catalogApi.endpoints.getProducts.initiate(
        { limit: 2, skip },
        { subscribe: false, forceRefetch: true },
      ),
    );

  beforeEach(() => {
    const page = pagedCatalog(TOTAL);
    stubFetch(url =>
      url.pathname === '/products/1'
        ? jsonResponse({ ...makeProduct(1), title: 'Detail' })
        : page(url),
    );
    store = makeStore();
  });

  afterEach(() => {
    teardownStore(store);
    jest.restoreAllMocks();
  });

  it('upserts the first page and records the total and fetch time', async () => {
    await loadPage(0);

    const state = store.getState();
    expect(selectFeedIds(state)).toEqual([1, 2]);
    expect(selectFeedTotal(state)).toBe(TOTAL);
    expect(state.catalog.lastFetchedAt).toEqual(expect.any(Number));
    expect(selectProductById(state, 2)?.title).toBe('Product 2');
  });

  it('appends later pages in order', async () => {
    await loadPage(0);
    await loadPage(2);
    await loadPage(4);

    expect(selectFeedIds(store.getState())).toEqual([1, 2, 3, 4, 5, 6]);
    expect(selectFeedProducts(store.getState()).map(p => p.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('replaces the feed when skip is 0 but keeps the entities', async () => {
    await loadPage(0);
    await loadPage(2);

    await loadPage(0);

    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
    expect(selectProductById(store.getState(), 4)).toBeDefined();
  });

  it('does not duplicate rows when a page is fetched again', async () => {
    await loadPage(0);
    await loadPage(2);

    await loadPage(2);

    expect(selectFeedIds(store.getState())).toEqual([1, 2, 3, 4]);
  });

  it('clears the feed without dropping cached products', async () => {
    await loadPage(0);

    store.dispatch(feedCleared());

    expect(selectFeedIds(store.getState())).toEqual([]);
    expect(selectFeedTotal(store.getState())).toBe(0);
    expect(selectProductById(store.getState(), 1)).toBeDefined();
  });

  it('applies search pages to the same feed', async () => {
    await loadPage(0);

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'any', limit: 2, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
  });

  it('applies category pages to the same feed', async () => {
    await loadPage(0);

    await store.dispatch(
      catalogApi.endpoints.getProductsByCategory.initiate(
        { slug: 'beauty', limit: 2, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
    expect(selectFeedTotal(store.getState())).toBe(TOTAL);
  });

  it('upserts a fetched product detail over the cached row', async () => {
    await loadPage(0);

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(1, { subscribe: false }),
    );

    expect(selectProductById(store.getState(), 1)?.title).toBe('Detail');
    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
  });

  it('stores the fetched category list', async () => {
    await store.dispatch(
      catalogApi.endpoints.getCategories.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(selectCategories(store.getState())).toEqual(testCategories);
  });

  it('keeps the categories when the feed is cleared', () => {
    store = makeStore(makeCatalogState([1], 1, null, testCategories));

    store.dispatch(feedCleared());

    expect(selectCategories(store.getState())).toEqual(testCategories);
  });

  it('memoises the feed selector for an unchanged state', async () => {
    await loadPage(0);

    expect(selectFeedProducts(store.getState())).toBe(
      selectFeedProducts(store.getState()),
    );
  });

  it('skips feed ids that have no cached product', () => {
    store = makeStore({ ...makeCatalogState([1]), feedIds: [1, 99] });

    expect(selectFeedProducts(store.getState()).map(p => p.id)).toEqual([1]);
  });

  describe('feed identity', () => {
    const loadSearchPage = (q: string, skip: number) =>
      store.dispatch(
        catalogApi.endpoints.searchProducts.initiate(
          { q, limit: 2, skip },
          { subscribe: false, forceRefetch: true },
        ),
      );

    it('records which source produced the feed', async () => {
      await loadPage(0);
      expect(selectFeedKey(store.getState())).toBe('all');

      await loadSearchPage('phone', 0);
      expect(selectFeedKey(store.getState())).toBe('search:phone');

      await store.dispatch(
        catalogApi.endpoints.getProductsByCategory.initiate(
          { slug: 'beauty', limit: 2, skip: 0 },
          { subscribe: false },
        ),
      );
      expect(selectFeedKey(store.getState())).toBe('category:beauty');
    });

    it('appends later pages of the same source', async () => {
      await loadSearchPage('phone', 0);
      await loadSearchPage('phone', 2);

      expect(selectFeedIds(store.getState())).toEqual([1, 2, 3, 4]);
    });

    it('does not append a late page of a source that was replaced', async () => {
      await loadPage(0);
      await loadSearchPage('phone', 0);

      await loadPage(2);

      expect(selectFeedIds(store.getState())).toEqual([1, 2]);
      expect(selectFeedKey(store.getState())).toBe('search:phone');
    });

    it('still caches the products of a late page', async () => {
      await loadPage(0);
      await loadSearchPage('phone', 0);

      await loadPage(4);

      expect(selectProductById(store.getState(), 5)).toBeDefined();
    });

    it('forgets the source when the feed is cleared', async () => {
      await loadPage(0);

      store.dispatch(feedCleared());

      expect(selectFeedKey(store.getState())).toBeNull();
    });
  });
});

import { catalogApi } from '@features/catalog/api/catalogApi';
import {
  feedCleared,
  selectFeedIds,
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

  it('upserts a fetched product detail over the cached row', async () => {
    await loadPage(0);

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(1, { subscribe: false }),
    );

    expect(selectProductById(store.getState(), 1)?.title).toBe('Detail');
    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
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
});

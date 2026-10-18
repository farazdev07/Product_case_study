import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import { catalogApi } from '@features/catalog/api/catalogApi';
import {
  catalogReducer,
  feedCleared,
  selectFeedIds,
  selectFeedProducts,
  selectFeedTotal,
  selectProductById,
} from '@features/catalog/model/catalogSlice';
import type { Product } from '@features/catalog/model/types';

const TOTAL = 6;

const product = (id: number): Product => ({
  id,
  title: `Product ${id}`,
  description: 'desc',
  category: 'beauty',
  price: 10,
  discountPercentage: 0,
  rating: 4,
  stock: 1,
  thumbnail: 'thumb',
  images: ['img'],
});

// Serves pages of a fixed catalogue of TOTAL products, like the real API.
const stubFetch = () =>
  jest.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = new URL((input as Request).url);
    if (
      url.pathname.startsWith('/products/') &&
      !url.pathname.includes('search')
    ) {
      return json({
        ...product(Number(url.pathname.split('/')[2])),
        title: 'Detail',
      });
    }
    const limit = Number(url.searchParams.get('limit'));
    const skip = Number(url.searchParams.get('skip'));
    const ids = Array.from({ length: TOTAL }, (_, i) => i + 1).slice(
      skip,
      skip + limit,
    );
    return json({ products: ids.map(product), total: TOTAL, skip, limit });
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });

// Auto-batching notifies subscribers on requestAnimationFrame, which fires after
// Jest tears the environment down.
const makeStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      catalog: catalogReducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(baseApi.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({ autoBatch: false }),
  });

const loadPage = (store: ReturnType<typeof makeStore>, skip: number) =>
  store.dispatch(
    catalogApi.endpoints.getProducts.initiate(
      { limit: 2, skip },
      { subscribe: false, forceRefetch: true },
    ),
  );

describe('catalogSlice', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    stubFetch();
    store = makeStore();
  });

  afterEach(() => {
    // Cancels RTK Query's cache-expiry timers, which would otherwise keep the
    // Jest process alive for their full 60 seconds.
    store.dispatch(baseApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  it('upserts the first page and records the total and fetch time', async () => {
    await loadPage(store, 0);

    const state = store.getState();
    expect(selectFeedIds(state)).toEqual([1, 2]);
    expect(selectFeedTotal(state)).toBe(TOTAL);
    expect(state.catalog.lastFetchedAt).toEqual(expect.any(Number));
    expect(selectProductById(state, 2)?.title).toBe('Product 2');
  });

  it('appends later pages in order', async () => {
    await loadPage(store, 0);
    await loadPage(store, 2);
    await loadPage(store, 4);

    expect(selectFeedIds(store.getState())).toEqual([1, 2, 3, 4, 5, 6]);
    expect(selectFeedProducts(store.getState()).map(p => p.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('replaces the feed when skip is 0 but keeps the entities', async () => {
    await loadPage(store, 0);
    await loadPage(store, 2);

    await loadPage(store, 0);

    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
    expect(selectProductById(store.getState(), 4)).toBeDefined();
  });

  it('does not duplicate rows when a page is fetched again', async () => {
    await loadPage(store, 0);
    await loadPage(store, 2);

    await loadPage(store, 2);

    expect(selectFeedIds(store.getState())).toEqual([1, 2, 3, 4]);
  });

  it('clears the feed without dropping cached products', async () => {
    await loadPage(store, 0);

    store.dispatch(feedCleared());

    expect(selectFeedIds(store.getState())).toEqual([]);
    expect(selectFeedTotal(store.getState())).toBe(0);
    expect(selectProductById(store.getState(), 1)).toBeDefined();
  });

  it('applies search pages to the same feed', async () => {
    await loadPage(store, 0);

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'any', limit: 2, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
  });

  it('upserts a fetched product detail over the cached row', async () => {
    await loadPage(store, 0);

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(1, { subscribe: false }),
    );

    expect(selectProductById(store.getState(), 1)?.title).toBe('Detail');
    expect(selectFeedIds(store.getState())).toEqual([1, 2]);
  });

  it('memoises the feed selector for an unchanged state', async () => {
    await loadPage(store, 0);

    expect(selectFeedProducts(store.getState())).toBe(
      selectFeedProducts(store.getState()),
    );
  });
});

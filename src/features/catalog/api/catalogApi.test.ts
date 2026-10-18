import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import { catalogApi } from '@features/catalog/api/catalogApi';
import type { Product } from '@features/catalog/model/types';

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

// Auto-batching notifies subscribers on requestAnimationFrame, which fires after
// Jest tears the environment down.
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(baseApi.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({ autoBatch: false }),
  });

const stubFetch = (body: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      }),
  );

const requestedUrl = (fetchSpy: jest.SpyInstance): URL =>
  new URL((fetchSpy.mock.calls[0][0] as Request).url);

describe('catalogApi', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    // Cancels RTK Query's cache-expiry timers, which would otherwise keep the
    // Jest process alive for their full 60 seconds.
    store.dispatch(baseApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  it('requests a page of products', async () => {
    const fetchSpy = stubFetch({ products: [], total: 0, skip: 20, limit: 20 });

    await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(
        { limit: 20, skip: 20 },
        { subscribe: false },
      ),
    );

    const url = requestedUrl(fetchSpy);
    expect(url.pathname).toBe('/products');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '20',
      skip: '20',
    });
  });

  it('searches products with the query', async () => {
    const fetchSpy = stubFetch({ products: [], total: 0, skip: 0, limit: 20 });

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'phone', limit: 20, skip: 0 },
        { subscribe: false },
      ),
    );

    const url = requestedUrl(fetchSpy);
    expect(url.pathname).toBe('/products/search');
    expect(url.searchParams.get('q')).toBe('phone');
  });

  it('requests the category list', async () => {
    const fetchSpy = stubFetch([{ slug: 'beauty', name: 'Beauty' }]);

    const result = await store.dispatch(
      catalogApi.endpoints.getCategories.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(requestedUrl(fetchSpy).pathname).toBe('/products/categories');
    expect(result.data).toEqual([{ slug: 'beauty', name: 'Beauty' }]);
  });

  it('requests a single product by id', async () => {
    const fetchSpy = stubFetch(product(7));

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(7, { subscribe: false }),
    );

    expect(requestedUrl(fetchSpy).pathname).toBe('/products/7');
  });

  it('tags a product page per product and as a list', async () => {
    stubFetch({
      products: [product(1), product(2)],
      total: 2,
      skip: 0,
      limit: 20,
    });

    await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(
        { limit: 20, skip: 0 },
        { subscribe: false },
      ),
    );

    const invalidatedBy = (id: number | string) =>
      baseApi.util.selectInvalidatedBy(store.getState(), [
        { type: 'Product', id },
      ]);
    expect(invalidatedBy(2)).toHaveLength(1);
    expect(invalidatedBy('LIST')).toHaveLength(1);
    expect(invalidatedBy(3)).toHaveLength(0);
  });

  it('tags a product detail with its own id only', async () => {
    stubFetch(product(5));

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(5, { subscribe: false }),
    );

    const invalidatedBy = (id: number) =>
      baseApi.util.selectInvalidatedBy(store.getState(), [
        { type: 'Product', id },
      ]);
    expect(invalidatedBy(5)).toHaveLength(1);
    expect(invalidatedBy(6)).toHaveLength(0);
  });

  it('tags a search the same way as a list', async () => {
    stubFetch({ products: [product(9)], total: 1, skip: 0, limit: 20 });

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'x', limit: 20, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(
      baseApi.util.selectInvalidatedBy(store.getState(), [
        { type: 'Product', id: 9 },
      ]),
    ).toHaveLength(1);
  });
});

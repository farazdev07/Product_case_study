import { baseApi } from '@shared/api/baseApi';
import { catalogApi } from '@features/catalog/api/catalogApi';
import {
  jsonResponse,
  makeProduct,
  makeStore,
  stubFetch,
  teardownStore,
  type TestStore,
} from '@features/catalog/testing/testStore';

const respondWith = (body: unknown) => {
  const handler = jest.fn((_url: URL) => jsonResponse(body));
  stubFetch(handler);
  return handler;
};

const requestedUrl = (handler: jest.Mock<unknown, [URL]>): URL =>
  handler.mock.calls[0]![0];

describe('catalogApi', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    teardownStore(store);
    jest.restoreAllMocks();
  });

  const invalidatedBy = (id: number | string) =>
    baseApi.util.selectInvalidatedBy(store.getState(), [
      { type: 'Product', id },
    ]);

  it('requests a page of products', async () => {
    const handler = respondWith({
      products: [],
      total: 0,
      skip: 20,
      limit: 20,
    });

    await store.dispatch(
      catalogApi.endpoints.getProducts.initiate(
        { limit: 20, skip: 20 },
        { subscribe: false },
      ),
    );

    const url = requestedUrl(handler);
    expect(url.pathname).toBe('/products');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '20',
      skip: '20',
    });
  });

  it('searches products with the query', async () => {
    const handler = respondWith({ products: [], total: 0, skip: 0, limit: 20 });

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'phone', limit: 20, skip: 0 },
        { subscribe: false },
      ),
    );

    const url = requestedUrl(handler);
    expect(url.pathname).toBe('/products/search');
    expect(url.searchParams.get('q')).toBe('phone');
  });

  it('requests the category list', async () => {
    const handler = respondWith([{ slug: 'beauty', name: 'Beauty' }]);

    const result = await store.dispatch(
      catalogApi.endpoints.getCategories.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(requestedUrl(handler).pathname).toBe('/products/categories');
    expect(result.data).toEqual([{ slug: 'beauty', name: 'Beauty' }]);
  });

  it('requests a single product by id', async () => {
    const handler = respondWith(makeProduct(7));

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(7, { subscribe: false }),
    );

    expect(requestedUrl(handler).pathname).toBe('/products/7');
  });

  it('tags a product page per product and as a list', async () => {
    respondWith({
      products: [makeProduct(1), makeProduct(2)],
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

    expect(invalidatedBy(2)).toHaveLength(1);
    expect(invalidatedBy('LIST')).toHaveLength(1);
    expect(invalidatedBy(3)).toHaveLength(0);
  });

  it('tags a product detail with its own id only', async () => {
    respondWith(makeProduct(5));

    await store.dispatch(
      catalogApi.endpoints.getProductById.initiate(5, { subscribe: false }),
    );

    expect(invalidatedBy(5)).toHaveLength(1);
    expect(invalidatedBy(6)).toHaveLength(0);
  });

  it('tags a search the same way as a list', async () => {
    respondWith({ products: [makeProduct(9)], total: 1, skip: 0, limit: 20 });

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'x', limit: 20, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(invalidatedBy(9)).toHaveLength(1);
  });
});

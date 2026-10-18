// Shared by the catalog's tests only; nothing in the app imports this.
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';
import {
  catalogReducer,
  type CatalogState,
} from '@features/catalog/model/catalogSlice';
import type { Product } from '@features/catalog/model/types';

export const makeProduct = (id: number): Product => ({
  id,
  title: `Product ${id}`,
  description: 'A product',
  category: 'mens-shirts',
  price: 10,
  discountPercentage: 0,
  rating: 4,
  stock: 1,
  thumbnail: `https://example.test/${id}.webp`,
  images: [`https://example.test/${id}-1.webp`],
});

export const makeCatalogState = (
  ids: number[],
  total = ids.length,
): CatalogState => ({
  ids,
  entities: Object.fromEntries(ids.map(id => [id, makeProduct(id)])),
  feedIds: ids,
  total,
  lastFetchedAt: null,
});

// Auto-batching notifies subscribers on requestAnimationFrame, which fires after
// Jest tears the environment down.
export const makeStore = (catalog?: CatalogState) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      catalog: catalogReducer,
    },
    preloadedState: catalog ? { catalog } : undefined,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(baseApi.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({ autoBatch: false }),
  });

export type TestStore = ReturnType<typeof makeStore>;

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const stubFetch = (
  handler: (url: URL) => Response | Promise<Response>,
) =>
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async input =>
      handler(new URL((input as Request).url)),
    );

// Serves a fixed catalogue of `total` products in pages, like the real API.
export const pagedCatalog = (total: number) => (url: URL) => {
  const limit = Number(url.searchParams.get('limit'));
  const skip = Number(url.searchParams.get('skip'));
  const ids = Array.from({ length: total }, (_, index) => index + 1).slice(
    skip,
    skip + limit,
  );

  return jsonResponse({ products: ids.map(makeProduct), total, skip, limit });
};

// Cancels RTK Query's cache-expiry timers, which would otherwise keep the Jest
// process alive for their full 60 seconds.
export const teardownStore = (store: TestStore) => {
  store.dispatch(baseApi.util.resetApiState());
};

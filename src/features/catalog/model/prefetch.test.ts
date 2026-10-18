import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { Image } from 'react-native';
import { baseApi } from '@shared/api/baseApi';
import { catalogApi } from '@features/catalog/api/catalogApi';
import { registerThumbnailPrefetch } from '@features/catalog/model/prefetch';
import {
  jsonResponse,
  makeProduct,
  pagedCatalog,
  stubFetch,
} from '@features/catalog/testing/testStore';

const makeStore = () => {
  const listener = createListenerMiddleware();
  registerThumbnailPrefetch(listener);

  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .prepend(listener.middleware)
        .concat(baseApi.middleware),
    enhancers: getDefaultEnhancers => getDefaultEnhancers({ autoBatch: false }),
  });
};

const thumbnailsOf = (ids: number[]) =>
  ids.map(id => makeProduct(id).thumbnail);

describe('registerThumbnailPrefetch', () => {
  let store: ReturnType<typeof makeStore>;
  let prefetch: jest.SpyInstance;

  beforeEach(() => {
    store = makeStore();
    prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });

  afterEach(() => {
    store.dispatch(baseApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  const load = (
    arg: Parameters<typeof catalogApi.endpoints.getProducts.initiate>[0],
  ) =>
    store.dispatch(
      catalogApi.endpoints.getProducts.initiate(arg, { subscribe: false }),
    );

  it('prefetches the thumbnail of every product on a fetched page', async () => {
    stubFetch(pagedCatalog(10));

    await load({ limit: 3, skip: 0 });

    expect(prefetch.mock.calls.map(([url]) => url)).toEqual(
      thumbnailsOf([1, 2, 3]),
    );
  });

  it('prefetches each later page as it arrives', async () => {
    stubFetch(pagedCatalog(10));

    await load({ limit: 3, skip: 0 });
    await load({ limit: 3, skip: 3 });

    expect(prefetch.mock.calls.map(([url]) => url)).toEqual(
      thumbnailsOf([1, 2, 3, 4, 5, 6]),
    );
  });

  it('prefetches search and category pages too', async () => {
    stubFetch(pagedCatalog(10));

    await store.dispatch(
      catalogApi.endpoints.searchProducts.initiate(
        { q: 'a', limit: 2, skip: 0 },
        { subscribe: false },
      ),
    );
    await store.dispatch(
      catalogApi.endpoints.getProductsByCategory.initiate(
        { slug: 'beauty', limit: 2, skip: 0 },
        { subscribe: false },
      ),
    );

    expect(prefetch).toHaveBeenCalledTimes(4);
  });

  it('does not prefetch for other endpoints', async () => {
    stubFetch(() => jsonResponse([{ slug: 'beauty', name: 'Beauty' }]));

    await store.dispatch(
      catalogApi.endpoints.getCategories.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(prefetch).not.toHaveBeenCalled();
  });

  it('ignores a prefetch that fails', async () => {
    prefetch.mockRejectedValue(new Error('offline'));
    stubFetch(pagedCatalog(10));

    await expect(load({ limit: 2, skip: 0 })).resolves.toMatchObject({
      isSuccess: true,
    });
  });
});

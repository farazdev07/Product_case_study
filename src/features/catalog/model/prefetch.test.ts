import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import TurboImage from 'react-native-turbo-image';
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

// Each product contributes its list thumbnail, then its detail image.
const imagesOf = (ids: number[]) =>
  ids.flatMap(id => {
    const { thumbnail, images } = makeProduct(id);
    return [thumbnail, ...images];
  });

describe('registerThumbnailPrefetch', () => {
  let store: ReturnType<typeof makeStore>;
  const prefetch = jest.mocked(TurboImage.prefetch);

  beforeEach(() => {
    store = makeStore();
    prefetch.mockClear();
  });

  afterEach(() => {
    store.dispatch(baseApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  const prefetchedUrls = () =>
    prefetch.mock.calls.flatMap(([sources]) => sources.map(({ uri }) => uri));

  const load = (
    arg: Parameters<typeof catalogApi.endpoints.getProducts.initiate>[0],
  ) =>
    store.dispatch(
      catalogApi.endpoints.getProducts.initiate(arg, { subscribe: false }),
    );

  it('prefetches the thumbnail and the detail image of every product on a fetched page', async () => {
    stubFetch(pagedCatalog(10));

    await load({ limit: 3, skip: 0 });

    expect(prefetchedUrls()).toEqual(imagesOf([1, 2, 3]));
  });

  it('prefetches into the library disk cache, not the HTTP cache', async () => {
    stubFetch(pagedCatalog(10));

    await load({ limit: 1, skip: 0 });

    expect(prefetch.mock.calls.map(([, policy]) => policy)).toEqual([
      'dataCache',
      'dataCache',
    ]);
  });

  it('prefetches each later page as it arrives', async () => {
    stubFetch(pagedCatalog(10));

    await load({ limit: 3, skip: 0 });
    await load({ limit: 3, skip: 3 });

    expect(prefetchedUrls()).toEqual(imagesOf([1, 2, 3, 4, 5, 6]));
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

    expect(prefetch).toHaveBeenCalledTimes(8);
  });

  it('requests an image once when the detail image is the thumbnail', async () => {
    const same = {
      ...makeProduct(1),
      images: [makeProduct(1).thumbnail],
    };
    stubFetch(() =>
      jsonResponse({ products: [same], total: 1, skip: 0, limit: 1 }),
    );

    await load({ limit: 1, skip: 0 });

    expect(prefetchedUrls()).toEqual([same.thumbnail]);
  });

  it('prefetches only the thumbnail when a product has no images', async () => {
    const bare = { ...makeProduct(1), images: [] };
    stubFetch(() =>
      jsonResponse({ products: [bare], total: 1, skip: 0, limit: 1 }),
    );

    await load({ limit: 1, skip: 0 });

    expect(prefetchedUrls()).toEqual([bare.thumbnail]);
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

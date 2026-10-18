import * as ReactNative from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '@shared/config/constants';
import { CatalogScreen } from '@features/catalog/ui/CatalogScreen';
import { networkStatusChanged } from '@features/connectivity';
import {
  clearFilters,
  setCategory,
  setMaxPrice,
  setSearchTerm,
} from '@features/catalog/model/filtersSlice';
import {
  jsonResponse,
  makeCatalogState,
  makeProduct,
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

describe('CatalogScreen', () => {
  let store: TestStore;

  const renderScreen = (onProductPress = jest.fn()) =>
    render(
      <Provider store={store}>
        <SafeAreaProvider>
          <CatalogScreen onProductPress={onProductPress} />
        </SafeAreaProvider>
      </Provider>,
    );

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    // Unmount first: it arms RTK Query's expiry timers, which the reset cancels.
    cleanup();
    teardownStore(store);
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders cached products immediately while the network is still pending', async () => {
    store = makeStore(makeCatalogState([1, 2, 3], 50));
    const release = stubGatedFetch(pagedCatalog(50));

    renderScreen();

    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('Product 3')).toBeOnTheScreen();

    release();
    await waitFor(() =>
      expect(store.getState().catalog.feedIds).toHaveLength(PAGE_SIZE),
    );
  });

  it('shows a spinner, then the first page, on a cold start', async () => {
    stubFetch(pagedCatalog(50));

    renderScreen();
    expect(screen.queryByText('No products found.')).not.toBeOnTheScreen();

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
  });

  it('opens a product when its card is pressed', async () => {
    stubFetch(pagedCatalog(50));
    const onProductPress = jest.fn();
    renderScreen(onProductPress);

    fireEvent.press(await screen.findByRole('button', { name: 'Product 2' }));

    expect(onProductPress).toHaveBeenCalledWith(2);
  });

  it('shows an empty state when the catalogue has no products', async () => {
    stubFetch(pagedCatalog(0));

    renderScreen();

    expect(await screen.findByText('No products found.')).toBeOnTheScreen();
  });

  it('shows an error with a working retry when the first load fails', async () => {
    let failing = true;
    const page = pagedCatalog(50);
    stubFetch(url =>
      failing ? jsonResponse({ message: 'down' }, 500) : page(url),
    );
    renderScreen();
    expect(
      await screen.findByText('Could not load products.'),
    ).toBeOnTheScreen();

    failing = false;
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
  });

  it('loads the next page when the end of the list is reached', async () => {
    const requested: number[] = [];
    const page = pagedCatalog(PAGE_SIZE * 2);
    stubFetch(url => {
      if (url.pathname !== '/products/categories') {
        requested.push(Number(url.searchParams.get('skip')));
      }
      return page(url);
    });
    renderScreen();
    await screen.findByText('Product 1');

    fireEvent(screen.getByTestId('product-feed'), 'endReached');

    await waitFor(() => expect(requested).toEqual([0, PAGE_SIZE]));
  });

  it('keeps the loaded products visible and offers a retry when a later page fails', async () => {
    const page = pagedCatalog(PAGE_SIZE * 2);
    stubFetch(url =>
      url.searchParams.get('skip') === '0'
        ? page(url)
        : jsonResponse({ message: 'down' }, 500),
    );
    renderScreen();
    await screen.findByText('Product 1');

    fireEvent(screen.getByTestId('product-feed'), 'endReached');

    expect(
      await screen.findByText('Could not load products.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
  });

  it('refetches the first page on pull to refresh', async () => {
    const requested: number[] = [];
    const page = pagedCatalog(50);
    stubFetch(url => {
      if (url.pathname !== '/products/categories') {
        requested.push(Number(url.searchParams.get('skip')));
      }
      return page(url);
    });
    renderScreen();
    await screen.findByText('Product 1');

    fireEvent(screen.getByTestId('product-feed'), 'refresh');

    await waitFor(() => expect(requested).toEqual([0, 0]));
  });

  describe('filters', () => {
    let requested: string[];

    // Distinct titles per endpoint show which one the list is reading from.
    const serve = () => {
      requested = [];
      const page = pagedCatalog(PAGE_SIZE);
      stubFetch(url => {
        const q = url.searchParams.get('q');
        requested.push(url.pathname + (q ? `?q=${q}` : ''));
        if (url.pathname === '/products/search') {
          return jsonResponse({
            products: [{ ...makeProduct(101), title: 'Search hit' }],
            total: 1,
            skip: 0,
            limit: PAGE_SIZE,
          });
        }
        if (url.pathname === '/products/category/beauty') {
          return jsonResponse({
            products: [{ ...makeProduct(201), title: 'Beauty item' }],
            total: 1,
            skip: 0,
            limit: PAGE_SIZE,
          });
        }
        return page(url);
      });
    };
    const productRequests = () =>
      requested.filter(path => !path.startsWith('/products/categories'));
    const press = (name: string) =>
      fireEvent.press(screen.getByRole('button', { name }));

    beforeEach(() => {
      store = makeStore(undefined, { feedReset: true });
      serve();
    });

    it('waits for the debounce before searching, then shows the results', async () => {
      renderScreen();
      await screen.findByText('Product 1');

      fireEvent.changeText(screen.getByLabelText('Search products'), 'phone');
      act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
      expect(productRequests()).toEqual(['/products']);

      act(() => jest.advanceTimersByTime(1));

      expect(await screen.findByText('Search hit')).toBeOnTheScreen();
      expect(productRequests()).toEqual([
        '/products',
        '/products/search?q=phone',
      ]);
      expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
    });

    it('resets the feed when a category is selected', async () => {
      renderScreen();
      await screen.findByText('Product 1');

      fireEvent.press(await screen.findByRole('button', { name: 'Beauty' }));

      expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
      expect(await screen.findByText('Beauty item')).toBeOnTheScreen();
      expect(productRequests()).toEqual([
        '/products',
        '/products/category/beauty',
      ]);
    });

    it('restores the defaults and the full feed with clear all', async () => {
      renderScreen();
      await screen.findByText('Product 1');
      fireEvent.press(await screen.findByRole('button', { name: 'Beauty' }));
      await screen.findByText('Beauty item');
      press('More filters');
      press('Under $25');

      press('Clear all filters');

      expect(store.getState().filters).toEqual({
        searchTerm: '',
        categorySlug: null,
        maxPrice: null,
        minRating: null,
        sortBy: 'default',
      });
      expect(await screen.findByText('Product 1')).toBeOnTheScreen();
      expect(screen.queryByText('Beauty item')).not.toBeOnTheScreen();
    });

    it('hides products over the price limit without another request', async () => {
      requested = [];
      stubFetch(url => {
        requested.push(url.pathname);
        if (url.pathname === '/products/categories') {
          return jsonResponse([]);
        }
        return jsonResponse({
          products: [
            { ...makeProduct(1), title: 'Cheap', price: 10 },
            { ...makeProduct(2), title: 'Dear', price: 400 },
          ],
          total: 2,
          skip: 0,
          limit: PAGE_SIZE,
        });
      });
      renderScreen();
      await screen.findByText('Dear');

      press('More filters');
      press('Under $25');

      expect(screen.getByText('Cheap')).toBeOnTheScreen();
      expect(screen.queryByText('Dear')).not.toBeOnTheScreen();
      expect(requested.filter(path => path === '/products')).toHaveLength(1);
    });

    it('does not drop the feed when only the price limit is cleared', async () => {
      renderScreen();
      await screen.findByText('Product 1');
      press('More filters');
      press('Under $25');

      act(() => {
        store.dispatch(clearFilters());
      });

      expect(screen.getByText('Product 1')).toBeOnTheScreen();
      expect(productRequests()).toEqual(['/products']);
    });
  });

  describe('empty states', () => {
    const goOffline = () =>
      jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('Network request failed'));
    const press = (name: string) =>
      fireEvent.press(screen.getByRole('button', { name }));
    const emptyOfProducts = (total: number) =>
      jsonResponse({ products: [], total, skip: 0, limit: PAGE_SIZE });

    beforeEach(() => {
      store = makeStore(undefined, { feedReset: true });
    });

    it('says the device is offline when nothing is saved yet', async () => {
      goOffline();

      renderScreen();

      expect(await screen.findByText('You are offline')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'No products are saved on this device yet. Connect to the internet to load them.',
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByText('No products found.')).not.toBeOnTheScreen();
    });

    it('does not call a server failure offline', async () => {
      stubFetch(() => jsonResponse({ message: 'down' }, 500));

      renderScreen();

      expect(
        await screen.findByText('Could not load products.'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('You are offline')).not.toBeOnTheScreen();
    });

    it('recovers from the offline state when the retry succeeds', async () => {
      const fetchSpy = goOffline();
      renderScreen();
      await screen.findByText('You are offline');

      fetchSpy.mockRestore();
      stubFetch(pagedCatalog(50));
      press('Retry');

      expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    });

    it('explains that searching needs a connection when a search is offline', async () => {
      store = makeStore(undefined, { feedReset: true });
      store.dispatch(setSearchTerm('phone'));
      goOffline();

      renderScreen();

      expect(
        await screen.findByText('Searching and filtering need a connection.'),
      ).toBeOnTheScreen();
    });

    it('keeps cached products on screen when launched offline', async () => {
      store = makeStore(makeCatalogState([1, 2, 3], 50));
      goOffline();

      renderScreen();

      expect(
        await screen.findByText('Could not load products.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Product 1')).toBeOnTheScreen();
      expect(screen.queryByText('You are offline')).not.toBeOnTheScreen();
    });

    it('distinguishes no results for a search from an empty catalogue', async () => {
      stubFetch(url =>
        url.pathname === '/products/search'
          ? emptyOfProducts(0)
          : pagedCatalog(50)(url),
      );
      renderScreen();
      await screen.findByText('Product 1');

      fireEvent.changeText(screen.getByLabelText('Search products'), 'zzz');
      act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

      expect(
        await screen.findByText('No results for "zzz".'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('No products found.')).not.toBeOnTheScreen();
      expect(screen.queryByText('You are offline')).not.toBeOnTheScreen();
    });

    it('offers to clear the filters from a no-results state', async () => {
      stubFetch(url =>
        url.pathname === '/products/search'
          ? emptyOfProducts(0)
          : pagedCatalog(50)(url),
      );
      renderScreen();
      await screen.findByText('Product 1');
      fireEvent.changeText(screen.getByLabelText('Search products'), 'zzz');
      act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
      await screen.findByText('No results for "zzz".');

      // The filter bar has its own clear-all; the last match is the empty state's.
      fireEvent.press(
        screen.getAllByRole('button', { name: 'Clear all filters' }).at(-1)!,
      );

      expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    });

    it('says filters match nothing when every product is already loaded', async () => {
      stubFetch(url =>
        url.pathname === '/products/categories'
          ? jsonResponse([])
          : jsonResponse({
              products: [{ ...makeProduct(1), price: 400 }],
              total: 1,
              skip: 0,
              limit: PAGE_SIZE,
            }),
      );
      renderScreen();
      await screen.findByText('Product 1');

      press('More filters');
      press('Under $25');

      expect(
        screen.getByText('No products match these filters.'),
      ).toBeOnTheScreen();
    });

    it('keeps loading pages while the loaded ones have no match, instead of reporting none', async () => {
      const requested: number[] = [];
      stubFetch(url => {
        if (url.pathname === '/products/categories') {
          return jsonResponse([]);
        }
        const skip = Number(url.searchParams.get('skip'));
        requested.push(skip);
        return jsonResponse({
          products: [
            {
              ...makeProduct(skip + 1),
              title: `Item ${skip + 1}`,
              price: skip === 0 ? 400 : 10,
            },
          ],
          total: 2,
          skip,
          limit: PAGE_SIZE,
        });
      });
      renderScreen();
      await screen.findByText('Item 1');

      press('More filters');
      press('Under $25');

      expect(await screen.findByText('Item 2')).toBeOnTheScreen();
      expect(screen.queryByText('Item 1')).not.toBeOnTheScreen();
      expect(
        screen.queryByText('No products match these filters.'),
      ).not.toBeOnTheScreen();
      expect(requested).toEqual([0, 1]);
    });
  });

  it.each([
    ['a phone', 400],
    ['a tablet in portrait', 834],
    ['a tablet in landscape', 1376],
  ])('lists every cached product on %s', (_, width) => {
    jest
      .spyOn(ReactNative, 'useWindowDimensions')
      .mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
    store = makeStore(makeCatalogState([1, 2, 3, 4], 4));
    stubFetch(pagedCatalog(4));

    renderScreen();

    for (const id of [1, 2, 3, 4]) {
      expect(screen.getByText(`Product ${id}`)).toBeOnTheScreen();
    }
  });

  describe('offline', () => {
    const cachedCatalog = () => {
      const state = makeCatalogState([1, 2, 3], 50);
      state.entities = {
        1: { ...makeProduct(1), category: 'beauty', price: 10 },
        2: { ...makeProduct(2), category: 'laptops', price: 900 },
        3: { ...makeProduct(3), category: 'beauty', price: 50 },
      };
      return state;
    };

    beforeEach(() => {
      store = makeStore(cachedCatalog(), { feedReset: true, isOnline: false });
    });

    it('filters the cached products by category without a request', () => {
      const fetchSpy = stubFetch(pagedCatalog(50));
      renderScreen();

      act(() => {
        store.dispatch(setCategory('beauty'));
      });

      expect(screen.getByText('Product 1')).toBeOnTheScreen();
      expect(screen.getByText('Product 3')).toBeOnTheScreen();
      expect(screen.queryByText('Product 2')).not.toBeOnTheScreen();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows products from outside the stored feed for the chosen category', () => {
      store = makeStore(
        {
          ...cachedCatalog(),
          feedIds: [2],
        },
        { feedReset: true, isOnline: false },
      );
      renderScreen();

      act(() => {
        store.dispatch(setCategory('beauty'));
      });

      expect(screen.getByText('Product 1')).toBeOnTheScreen();
      expect(screen.queryByText('Product 2')).not.toBeOnTheScreen();
    });

    it('ignores pull-to-refresh and end-reached without a request', () => {
      const fetchSpy = stubFetch(pagedCatalog(50));
      renderScreen();

      fireEvent(screen.getByTestId('product-feed'), 'refresh');
      fireEvent(screen.getByTestId('product-feed'), 'endReached');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Product 1')).toBeOnTheScreen();
    });

    it('applies price filters to the cache', () => {
      renderScreen();

      act(() => {
        store.dispatch(setMaxPrice(100));
      });

      expect(screen.queryByText('Product 2')).not.toBeOnTheScreen();
      expect(screen.getByText('Product 3')).toBeOnTheScreen();
    });

    it('restores the full cached feed when the filters are cleared', () => {
      renderScreen();
      act(() => {
        store.dispatch(setCategory('laptops'));
      });
      expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();

      act(() => {
        store.dispatch(clearFilters());
      });

      expect(screen.getByText('Product 1')).toBeOnTheScreen();
      expect(screen.getByText('Product 2')).toBeOnTheScreen();
      expect(screen.getByText('Product 3')).toBeOnTheScreen();
    });

    it('says nothing matches, not that the device is offline, when the cache has no match', () => {
      renderScreen();

      act(() => {
        store.dispatch(setSearchTerm('zzz'));
      });

      expect(screen.getByText('No results for "zzz".')).toBeOnTheScreen();
      expect(screen.queryByText('You are offline')).not.toBeOnTheScreen();
    });

    it('says the device is offline when there is no cache at all', () => {
      store = makeStore(undefined, { isOnline: false });
      stubFetch(pagedCatalog(50));

      renderScreen();

      expect(screen.getByText('You are offline')).toBeOnTheScreen();
    });

    it('does not retry while offline', () => {
      store = makeStore(undefined, { isOnline: false });
      const fetchSpy = stubFetch(pagedCatalog(50));
      renderScreen();

      fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches the selected source normally once the connection returns', async () => {
      const requested: string[] = [];
      stubFetch(url => {
        requested.push(url.pathname);
        return pagedCatalog(50)(url);
      });
      renderScreen();
      act(() => {
        store.dispatch(setCategory('beauty'));
      });
      expect(requested).toEqual([]);

      act(() => {
        store.dispatch(
          networkStatusChanged({ isOnline: true, isInternetReachable: true }),
        );
      });

      await waitFor(() =>
        expect(requested).toContain('/products/category/beauty'),
      );
      await waitFor(() =>
        expect(store.getState().catalog.feedKey).toBe('category:beauty'),
      );
    });
  });
});

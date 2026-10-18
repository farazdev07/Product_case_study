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
import { clearFilters } from '@features/catalog/model/filtersSlice';
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
});

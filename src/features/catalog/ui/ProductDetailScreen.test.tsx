import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ProductDetailScreen } from '@features/catalog/ui/ProductDetailScreen';
import {
  jsonResponse,
  makeCatalogState,
  makeProduct,
  makeStore,
  stubFetch,
  stubGatedFetch,
  teardownStore,
  type TestStore,
} from '@features/catalog/testing/testStore';

// RTK Query batches subscription updates on a timer, and the navigation and list
// libraries schedule frames. Fake timers discard whatever is still pending when
// a test ends; real ones would fire after Jest has closed the environment.
jest.useFakeTimers();

describe('ProductDetailScreen', () => {
  let store: TestStore;

  const renderScreen = (productId: number) =>
    render(
      <Provider store={store}>
        <SafeAreaProvider>
          <ProductDetailScreen productId={productId} />
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

  it('renders a cached product at once, before the request completes', async () => {
    store = makeStore(makeCatalogState([5]));
    const release = stubGatedFetch(() => jsonResponse(makeProduct(5)));

    renderScreen(5);

    expect(screen.getByText('Product 5')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByText('A product')).toBeOnTheScreen();

    release();
    await waitFor(() =>
      expect(
        Object.values(store.getState().api.queries).every(
          query => query?.status === 'fulfilled',
        ),
      ).toBe(true),
    );
  });

  it('refreshes a cached product with the fetched version', async () => {
    store = makeStore(makeCatalogState([5]));
    stubFetch(() => jsonResponse({ ...makeProduct(5), title: 'Refreshed' }));

    renderScreen(5);

    expect(await screen.findByText('Refreshed')).toBeOnTheScreen();
  });

  it('keeps showing the cached product when the refresh fails', async () => {
    store = makeStore(makeCatalogState([5]));
    const failing = jest.fn(() => jsonResponse({ message: 'down' }, 500));
    stubFetch(failing);

    renderScreen(5);
    await waitFor(() => expect(failing).toHaveBeenCalled());

    expect(screen.getByText('Product 5')).toBeOnTheScreen();
    expect(
      screen.queryByText('Could not load this product.'),
    ).not.toBeOnTheScreen();
  });

  it('fetches a product that is not cached', async () => {
    stubFetch(() => jsonResponse(makeProduct(8)));

    renderScreen(8);

    expect(await screen.findByText('Product 8')).toBeOnTheScreen();
  });

  it('shows an error with a working retry when an uncached product fails to load', async () => {
    let failing = true;
    stubFetch(() =>
      failing
        ? jsonResponse({ message: 'down' }, 500)
        : jsonResponse(makeProduct(8)),
    );
    renderScreen(8);
    expect(
      await screen.findByText('Could not load this product.'),
    ).toBeOnTheScreen();

    failing = false;
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Product 8')).toBeOnTheScreen();
  });

  it('shows the brand next to the category when there is one', () => {
    store = makeStore({
      ...makeCatalogState([1]),
      entities: { 1: { ...makeProduct(1), brand: 'Acme' } },
    });
    stubFetch(() => jsonResponse(makeProduct(1)));

    renderScreen(1);

    expect(screen.getByText('Acme - Mens shirts')).toBeOnTheScreen();
  });

  it('shows only the category when the product has no brand', () => {
    store = makeStore(makeCatalogState([2]));
    stubFetch(() => jsonResponse(makeProduct(2)));

    renderScreen(2);

    expect(screen.getByText('Mens shirts')).toBeOnTheScreen();
  });

  it('reports a product with no stock as out of stock', () => {
    store = makeStore({
      ...makeCatalogState([3]),
      entities: { 3: { ...makeProduct(3), stock: 0 } },
    });
    stubFetch(() => jsonResponse({ ...makeProduct(3), stock: 0 }));

    renderScreen(3);

    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
  });
});

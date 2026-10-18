import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { PAGE_SIZE } from '@shared/config/constants';
import { CatalogScreen } from '@features/catalog/ui/CatalogScreen';
import {
  jsonResponse,
  makeCatalogState,
  makeStore,
  pagedCatalog,
  stubFetch,
  teardownStore,
  type TestStore,
} from '@features/catalog/testing/testStore';

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
    jest.restoreAllMocks();
  });

  it('renders cached products immediately while the network is still pending', () => {
    store = makeStore(makeCatalogState([1, 2, 3], 50));
    stubFetch(() => new Promise<Response>(() => {}));

    renderScreen();

    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('Product 3')).toBeOnTheScreen();
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
      requested.push(Number(url.searchParams.get('skip')));
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
      requested.push(Number(url.searchParams.get('skip')));
      return page(url);
    });
    renderScreen();
    await screen.findByText('Product 1');

    fireEvent(screen.getByTestId('product-feed'), 'refresh');

    await waitFor(() => expect(requested).toEqual([0, 0]));
  });
});

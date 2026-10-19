import * as ReactNative from 'react-native';
import { StyleSheet } from 'react-native';
import TurboImage from 'react-native-turbo-image';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { ProductDetailScreen } from '@features/catalog/ui/ProductDetailScreen';
import {
  jsonResponse,
  makeCatalogState,
  makeProduct,
  makeStore,
  stubFetch,
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

  it('lets the product be favourited from the detail screen', () => {
    store = makeStore(makeCatalogState([5]));
    renderScreen(5);

    fireEvent.press(screen.getByRole('button', { name: 'Add to favorites' }));

    expect(store.getState().favorites.ids).toEqual([5]);
  });

  describe('layout', () => {
    const setWidth = (width: number) =>
      jest
        .spyOn(ReactNative.Dimensions, 'get')
        .mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
    const imageStyle = () =>
      StyleSheet.flatten(screen.UNSAFE_getByType(TurboImage).props.style);
    // The nearest ancestor of the price that lays its children out in a row.
    const priceRowStyle = () => {
      for (
        let node = screen.getByText('$10.00').parent;
        node;
        node = node.parent
      ) {
        const style = StyleSheet.flatten(node.props.style);
        if (style?.flexDirection === 'row') {
          return style;
        }
      }
      throw new Error('price is not in a row');
    };
    const saveStyle = () =>
      StyleSheet.flatten(
        screen.getByRole('button', { name: 'Add to favorites' }).props.style,
      );

    beforeEach(() => {
      store = makeStore(makeCatalogState([5]));
    });

    it('stacks a full-width banner image on a phone', () => {
      setWidth(400);
      renderScreen(5);

      expect(imageStyle()).toMatchObject({ width: '100%', height: 280 });
      expect(priceRowStyle().justifyContent).toBe('space-between');
    });

    it.each([
      ['a tablet in portrait', 834],
      ['a tablet in landscape', 1376],
    ])('puts a square image beside the details on %s', (_, width) => {
      setWidth(width);
      renderScreen(5);

      expect(imageStyle()).toMatchObject({ width: '45%', aspectRatio: 1 });
      expect(priceRowStyle().justifyContent).toBeUndefined();
    });

    it('keeps the price and rating together on a wide screen', () => {
      setWidth(834);
      renderScreen(5);

      expect(priceRowStyle().gap).toBeGreaterThan(0);
      expect(screen.getByText('4.0 / 5')).toBeOnTheScreen();
    });

    it('gives the save button a full-size touch target on the detail screen', () => {
      setWidth(834);
      renderScreen(5);

      expect(saveStyle()).toMatchObject({ minWidth: 96, minHeight: 44 });
    });

    it('still shows every field on a wide screen', () => {
      setWidth(834);
      renderScreen(5);

      for (const text of ['Product 5', '$10.00', 'A product', '1 in stock']) {
        expect(screen.getByText(text)).toBeOnTheScreen();
      }
    });
  });

  it('renders a cached product without making a request', () => {
    store = makeStore(makeCatalogState([5]));
    const fetchSpy = stubFetch(() => jsonResponse(makeProduct(5)));

    renderScreen(5);

    expect(screen.getByText('Product 5')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByText('A product')).toBeOnTheScreen();
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it('falls back to the thumbnail when a product has no images', () => {
    store = makeStore({
      ...makeCatalogState([4]),
      entities: { 4: { ...makeProduct(4), images: [] } },
    });

    renderScreen(4);

    expect(screen.UNSAFE_getByType(TurboImage).props.source).toEqual({
      uri: 'https://example.test/4.webp',
    });
  });
});

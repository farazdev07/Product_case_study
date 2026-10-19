import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FavoritesScreen } from '@app/screens/FavoritesScreen';
import { catalogReducer } from '@features/catalog';
import { favoritesReducer } from '@features/favorites';

type CatalogState = ReturnType<typeof catalogReducer>;

const product = (id: number) => ({
  id,
  title: `Product ${id}`,
  description: 'A product',
  category: 'beauty',
  price: 10,
  discountPercentage: 0,
  rating: 4,
  stock: 1,
  thumbnail: `https://example.test/${id}.webp`,
  images: [`https://example.test/${id}-1.webp`],
});

// Products 1 to 3 are cached; any other favourited id has no cached product.
const catalog: CatalogState = {
  ...catalogReducer(undefined, { type: 'init' }),
  ids: [1, 2, 3],
  entities: { 1: product(1), 2: product(2), 3: product(3) },
};

const makeStore = (ids: number[]) =>
  configureStore({
    reducer: { catalog: catalogReducer, favorites: favoritesReducer },
    preloadedState: {
      catalog,
      favorites: { ids, queue: [], status: 'idle' as const },
    },
  });

// The list library schedules frames; fake timers discard whatever is pending
// when a test ends instead of letting it fire after teardown.
jest.useFakeTimers();

describe('FavoritesScreen', () => {
  const renderScreen = (ids: number[], onProductPress = jest.fn()) =>
    render(
      <Provider store={makeStore(ids)}>
        <SafeAreaProvider>
          <FavoritesScreen onProductPress={onProductPress} />
        </SafeAreaProvider>
      </Provider>,
    );

  it('renders saved products, most recently saved first', () => {
    renderScreen([1, 3, 2]);

    const titles = screen
      .getAllByRole('button')
      .map(button => button.props.accessibilityLabel)
      .filter((label: string) => label.startsWith('Product'));

    expect(titles).toEqual(['Product 2', 'Product 3', 'Product 1']);
  });

  it('shows an empty state when nothing is saved', () => {
    renderScreen([]);

    expect(screen.getByText('No saved products yet.')).toBeOnTheScreen();
    expect(screen.getByText(/Tap Save on a product/)).toBeOnTheScreen();
  });

  it('reports the pressed product', () => {
    const onProductPress = jest.fn();
    renderScreen([1, 2], onProductPress);

    fireEvent.press(screen.getByRole('button', { name: 'Product 2' }));

    expect(onProductPress).toHaveBeenCalledWith(2);
  });

  it('removes a row as soon as its favourite is removed', () => {
    renderScreen([1, 2]);

    // Product 2 was saved last, so its toggle is the first one on screen.
    const toggles = screen.getAllByRole('button', {
      name: 'Remove from favorites',
    });
    fireEvent.press(toggles[0]!);

    expect(screen.queryByText('Product 2')).not.toBeOnTheScreen();
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
  });

  it('skips a favourite whose product is not cached', () => {
    renderScreen([99, 1]);

    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Product 99')).not.toBeOnTheScreen();
  });
});

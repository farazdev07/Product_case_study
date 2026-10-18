import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import * as format from '@features/catalog/lib/format';
import { toggleFavorite } from '@features/favorites';
import { makeProduct, makeStore } from '@features/catalog/testing/testStore';
import { ProductCard } from '@features/catalog/ui/ProductCard';

describe('ProductCard', () => {
  const product = { ...makeProduct(3), price: 9.5, rating: 4.26 };
  let store = makeStore();

  beforeEach(() => {
    store = makeStore();
  });

  const renderCard = (card: ReactElement) => (
    <Provider store={store}>{card}</Provider>
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the title, category, price and rating', () => {
    render(renderCard(<ProductCard product={product} onPress={jest.fn()} />));

    expect(screen.getByText('Product 3')).toBeOnTheScreen();
    expect(screen.getByText('Mens shirts')).toBeOnTheScreen();
    expect(screen.getByText('$9.50')).toBeOnTheScreen();
    expect(screen.getByText('4.3 / 5')).toBeOnTheScreen();
  });

  it('reports the product id when pressed', () => {
    const onPress = jest.fn();
    render(renderCard(<ProductCard product={product} onPress={onPress} />));
    fireEvent.press(screen.getByRole('button', { name: 'Product 3' }));

    expect(onPress).toHaveBeenCalledWith(3);
  });

  it('does not re-render when given the same props again', () => {
    const formatPrice = jest.spyOn(format, 'formatPrice');
    const onPress = jest.fn();
    const { rerender } = render(
      renderCard(<ProductCard product={product} onPress={onPress} />),
    );

    rerender(renderCard(<ProductCard product={product} onPress={onPress} />));

    expect(formatPrice).toHaveBeenCalledTimes(1);
  });

  it('re-renders when the product changes', () => {
    const formatPrice = jest.spyOn(format, 'formatPrice');
    const onPress = jest.fn();
    const { rerender } = render(
      renderCard(<ProductCard product={product} onPress={onPress} />),
    );

    rerender(
      renderCard(
        <ProductCard product={{ ...product, price: 12 }} onPress={onPress} />,
      ),
    );

    expect(formatPrice).toHaveBeenCalledTimes(2);
  });

  it('shows the favourite state without re-rendering the card around it', () => {
    const formatPrice = jest.spyOn(format, 'formatPrice');
    render(renderCard(<ProductCard product={product} onPress={jest.fn()} />));

    fireEvent.press(screen.getByRole('button', { name: 'Add to favorites' }));

    expect(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    ).toBeOnTheScreen();
    expect(formatPrice).toHaveBeenCalledTimes(1);
  });

  it('does not open the product when the favourite button is pressed', () => {
    const onPress = jest.fn();
    render(renderCard(<ProductCard product={product} onPress={onPress} />));

    fireEvent.press(screen.getByRole('button', { name: 'Add to favorites' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('reflects a favourite set elsewhere', () => {
    render(renderCard(<ProductCard product={product} onPress={jest.fn()} />));

    act(() => {
      store.dispatch(toggleFavorite(3));
    });

    expect(screen.getByText('Saved')).toBeOnTheScreen();
  });
});

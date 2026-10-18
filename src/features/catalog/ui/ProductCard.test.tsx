import { fireEvent, render, screen } from '@testing-library/react-native';
import * as format from '@features/catalog/lib/format';
import { makeProduct } from '@features/catalog/testing/testStore';
import { ProductCard } from '@features/catalog/ui/ProductCard';

describe('ProductCard', () => {
  const product = { ...makeProduct(3), price: 9.5, rating: 4.26 };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the title, category, price and rating', () => {
    render(<ProductCard product={product} onPress={jest.fn()} />);

    expect(screen.getByText('Product 3')).toBeOnTheScreen();
    expect(screen.getByText('Mens shirts')).toBeOnTheScreen();
    expect(screen.getByText('$9.50')).toBeOnTheScreen();
    expect(screen.getByText('4.3 / 5')).toBeOnTheScreen();
  });

  it('reports the product id when pressed', () => {
    const onPress = jest.fn();
    render(<ProductCard product={product} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Product 3' }));

    expect(onPress).toHaveBeenCalledWith(3);
  });

  it('does not re-render when given the same props again', () => {
    const formatPrice = jest.spyOn(format, 'formatPrice');
    const onPress = jest.fn();
    const { rerender } = render(
      <ProductCard product={product} onPress={onPress} />,
    );

    rerender(<ProductCard product={product} onPress={onPress} />);

    expect(formatPrice).toHaveBeenCalledTimes(1);
  });

  it('re-renders when the product changes', () => {
    const formatPrice = jest.spyOn(format, 'formatPrice');
    const onPress = jest.fn();
    const { rerender } = render(
      <ProductCard product={product} onPress={onPress} />,
    );

    rerender(
      <ProductCard product={{ ...product, price: 12 }} onPress={onPress} />,
    );

    expect(formatPrice).toHaveBeenCalledTimes(2);
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '@app/App';

describe('App', () => {
  it('opens on the catalog screen', () => {
    render(<App />);

    expect(screen.getByText('Product Catalog')).toBeOnTheScreen();
  });

  it('navigates to the product detail with the route param', () => {
    render(<App />);

    fireEvent.press(screen.getByRole('button', { name: 'Open product 1' }));

    expect(screen.getByText('Product 1')).toBeOnTheScreen();
  });
});

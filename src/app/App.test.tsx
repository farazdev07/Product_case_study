import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '@app/App';

describe('App', () => {
  it('renders the placeholder screen inside the providers', () => {
    render(<App />);

    expect(screen.getByText('Product Catalog')).toBeOnTheScreen();
    expect(screen.getByText('Taps: 0')).toBeOnTheScreen();
  });

  it('responds to presses', () => {
    render(<App />);

    fireEvent.press(screen.getByRole('button', { name: 'Tap me' }));

    expect(screen.getByText('Taps: 1')).toBeOnTheScreen();
  });
});

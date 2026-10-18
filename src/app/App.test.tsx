import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import App from '@app/App';
import { store } from '@app/store';
import { baseApi } from '@shared/api/baseApi';

const page = {
  products: [
    {
      id: 1,
      title: 'Product 1',
      category: 'beauty',
      price: 9.99,
      rating: 4,
      thumbnail: 'https://example.test/1.webp',
    },
  ],
  total: 1,
  skip: 0,
  limit: 20,
};

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify(page), {
          headers: { 'content-type': 'application/json' },
        }),
    );
  });

  afterEach(() => {
    // Unmount first: it arms RTK Query's expiry timers, which the reset cancels.
    cleanup();
    store.dispatch(baseApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  it('opens on the product feed', async () => {
    render(<App />);

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
  });

  it('navigates to the product detail with the route param', async () => {
    render(<App />);

    fireEvent.press(await screen.findByRole('button', { name: 'Product 1' }));

    expect(screen.getByText('Detail for product 1')).toBeOnTheScreen();
  });
});

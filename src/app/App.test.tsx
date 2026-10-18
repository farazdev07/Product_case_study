import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import App from '@app/App';
import { store } from '@app/store';
import { baseApi } from '@shared/api/baseApi';

const product = {
  id: 1,
  title: 'Product 1',
  description: 'Only the detail screen shows this',
  category: 'beauty',
  price: 9.99,
  discountPercentage: 0,
  rating: 4,
  stock: 3,
  thumbnail: 'https://example.test/1.webp',
  images: ['https://example.test/1-1.webp'],
};

const page = { products: [product], total: 1, skip: 0, limit: 20 };

// RTK Query batches subscription updates on a timer, and the navigation and list
// libraries schedule frames. Fake timers discard whatever is still pending when
// a test ends; real ones would fire after Jest has closed the environment.
jest.useFakeTimers();

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const { pathname } = new URL((input as Request).url);
      const body =
        pathname === '/products/categories'
          ? []
          : pathname === '/products/1'
          ? product
          : page;
      return new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    // Unmount first: it arms RTK Query's expiry timers, which the reset cancels.
    cleanup();
    store.dispatch(baseApi.util.resetApiState());
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('opens on the product feed', async () => {
    render(<App />);

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
  });

  it('navigates to the product detail with the route param', async () => {
    render(<App />);

    fireEvent.press(await screen.findByRole('button', { name: 'Product 1' }));

    expect(
      screen.getByText('Only the detail screen shows this'),
    ).toBeOnTheScreen();
  });
});

import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import * as logger from '@shared/lib/logger';
import { networkStatusChanged } from '@features/connectivity';
import {
  MAX_ATTEMPTS,
  favoritesReducer,
  toggleFavorite,
  type FavoritesState,
} from '@features/favorites/model/favoritesSlice';
import {
  backoffDelay,
  useQueueSync,
} from '@features/favorites/lib/useQueueSync';
import {
  jsonResponse,
  makeStore,
  stubFetch,
  teardownStore,
  type TestStore,
} from '@features/favorites/testing/testStore';

jest.useFakeTimers();

const queued = (...productIds: number[]): FavoritesState =>
  productIds.reduce(
    (state, id) => favoritesReducer(state, toggleFavorite(id)),
    favoritesReducer(undefined, { type: 'init' }),
  );

const productIdOf = (request: Request) =>
  Number(new URL(request.url).pathname.split('/').pop());

const render = (store: TestStore) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useQueueSync(), { wrapper });
};

const queueOf = (store: TestStore) =>
  store.getState().favorites.queue.map(({ productId }) => productId);

describe('useQueueSync', () => {
  let store: TestStore;

  afterEach(() => {
    teardownStore(store);
    jest.restoreAllMocks();
  });

  it('drains a queue it finds on mount while online', async () => {
    store = makeStore(queued(1, 2));
    stubFetch(() => jsonResponse({ id: 1 }));

    render(store);

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    await waitFor(() => expect(store.getState().favorites.status).toBe('idle'));
  });

  it('sends the actions one at a time in the order they were queued', async () => {
    store = makeStore(queued(3, 1, 2));
    const sent: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    stubFetch(async request => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      sent.push(productIdOf(request));
      await Promise.resolve();
      inFlight -= 1;
      return jsonResponse({ id: 1 });
    });

    render(store);

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(sent).toEqual([3, 1, 2]);
    expect(maxInFlight).toBe(1);
  });

  it('is syncing while a request is in flight', async () => {
    store = makeStore(queued(1));
    let release = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    stubFetch(async () => {
      await gate;
      return jsonResponse({ id: 1 });
    });

    render(store);

    await waitFor(() =>
      expect(store.getState().favorites.status).toBe('syncing'),
    );
    release();
    await waitFor(() => expect(store.getState().favorites.status).toBe('idle'));
  });

  it('does nothing for an empty queue', () => {
    store = makeStore();
    const fetch = stubFetch(() => jsonResponse({ id: 1 }));

    render(store);

    expect(fetch).not.toHaveBeenCalled();
    expect(store.getState().favorites.status).toBe('idle');
  });

  it('holds the queue while offline and drains when the connection returns', async () => {
    store = makeStore(queued(1, 2), false);
    const fetch = stubFetch(() => jsonResponse({ id: 1 }));
    render(store);
    expect(fetch).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(
        networkStatusChanged({ isOnline: true, isInternetReachable: true }),
      );
    });

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('sends an action queued while already online', async () => {
    store = makeStore();
    const fetch = stubFetch(() => jsonResponse({ id: 1 }));
    render(store);

    act(() => {
      store.dispatch(toggleFavorite(9));
    });

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not start a second drain while one is in flight', async () => {
    store = makeStore(queued(1));
    let inFlight = 0;
    let maxInFlight = 0;
    let release = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const fetch = stubFetch(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gate;
      inFlight -= 1;
      return jsonResponse({ id: 1 });
    });
    render(store);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    act(() => {
      store.dispatch(toggleFavorite(2));
    });
    release();

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(maxInFlight).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries a failed action after a backoff, ahead of the ones behind it', async () => {
    store = makeStore(queued(1, 2));
    const sent: number[] = [];
    let failures = 1;
    stubFetch(request => {
      sent.push(productIdOf(request));
      if (failures > 0) {
        failures -= 1;
        return jsonResponse({}, 500);
      }
      return jsonResponse({ id: 1 });
    });

    render(store);

    await waitFor(() => expect(sent).toEqual([1]));
    await waitFor(() =>
      expect(store.getState().favorites.queue[0]?.attempts).toBe(1),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(backoffDelay(1) - 1);
    });
    expect(sent).toEqual([1]);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(sent).toEqual([1, 1, 2]);
  });

  it('doubles the wait after each failure of the same action', async () => {
    store = makeStore(queued(1));
    const fetch = stubFetch(() => jsonResponse({}, 500));
    render(store);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(backoffDelay(1));
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(backoffDelay(2) - 1);
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });

  it('drops an action at the attempt cap and carries on with the rest', async () => {
    store = makeStore(queued(1, 2));
    const warn = jest.spyOn(logger, 'devWarn').mockImplementation(() => {});
    const sent: number[] = [];
    stubFetch(request => {
      sent.push(productIdOf(request));
      return productIdOf(request) === 1
        ? jsonResponse({}, 500)
        : jsonResponse({ id: 2 });
    });

    render(store);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(backoffDelay(attempt + 1));
      });
    }

    await waitFor(() => expect(queueOf(store)).toEqual([]));
    expect(sent).toEqual([1, 1, 1, 1, 1, 2]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('product 1'));
    expect(store.getState().favorites.ids).toEqual([1, 2]);
  });

  it('stops draining when the connection drops mid-drain', async () => {
    store = makeStore(queued(1, 2));
    let release = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const fetch = stubFetch(async () => {
      await gate;
      return jsonResponse({ id: 1 });
    });
    render(store);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    act(() => {
      store.dispatch(
        networkStatusChanged({ isOnline: false, isInternetReachable: false }),
      );
    });
    release();

    await waitFor(() => expect(store.getState().favorites.status).toBe('idle'));
    expect(queueOf(store)).toEqual([2]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops retrying once unmounted', async () => {
    store = makeStore(queued(1));
    const fetch = stubFetch(() => jsonResponse({}, 500));
    const view = render(store);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(store.getState().favorites.queue[0]?.attempts).toBe(1),
    );

    view.unmount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(backoffDelay(1) * 4);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('backoffDelay', () => {
  it('doubles from one second and is capped', () => {
    expect([1, 2, 3, 4].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000]);
    expect(backoffDelay(20)).toBe(30_000);
  });
});

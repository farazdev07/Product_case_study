import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Provider } from 'react-redux';
import { AppServices } from '@app/AppServices';
import { store } from '@app/store';
import { baseApi } from '@shared/api/baseApi';
import { toggleFavorite } from '@features/favorites';

jest.useFakeTimers();

describe('AppServices', () => {
  afterEach(() => {
    cleanup();
    store.dispatch(baseApi.util.resetApiState());
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('feeds network changes into the store and drains when back online', async () => {
    let report: (state: NetInfoState) => void = () => undefined;
    jest.mocked(NetInfo.addEventListener).mockImplementation(listener => {
      report = listener;
      return jest.fn();
    });
    const fetch = jest.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response('{"id":1}', {
          headers: { 'content-type': 'application/json' },
        }),
    );
    render(
      <Provider store={store}>
        <AppServices />
      </Provider>,
    );

    act(() => {
      report({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);
    });
    expect(store.getState().network.isOnline).toBe(false);

    act(() => {
      store.dispatch(toggleFavorite(1));
    });
    expect(fetch).not.toHaveBeenCalled();

    act(() => {
      report({ isConnected: true, isInternetReachable: true } as NetInfoState);
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(store.getState().favorites.queue).toEqual([]));
  });
});

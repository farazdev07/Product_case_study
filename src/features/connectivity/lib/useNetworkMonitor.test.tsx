import { renderHook } from '@testing-library/react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { PropsWithChildren } from 'react';
import { useNetworkMonitor } from '@features/connectivity/lib/useNetworkMonitor';
import { networkReducer } from '@features/connectivity/model/networkSlice';

type Listener = (state: NetInfoState) => void;

const report = (
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
) => ({ isConnected, isInternetReachable } as NetInfoState);

const setup = () => {
  const unsubscribe = jest.fn();
  let listener: Listener = () => undefined;
  jest.mocked(NetInfo.addEventListener).mockImplementation(callback => {
    listener = callback;
    return unsubscribe;
  });

  const store = configureStore({ reducer: { network: networkReducer } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  const view = renderHook(() => useNetworkMonitor(), { wrapper });

  return {
    store,
    view,
    unsubscribe,
    emit: (state: NetInfoState) => listener(state),
  };
};

describe('useNetworkMonitor', () => {
  it('subscribes once on mount', () => {
    jest.mocked(NetInfo.addEventListener).mockClear();
    setup();

    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('dispatches each reported change', () => {
    const { store, emit } = setup();

    emit(report(false, false));
    expect(store.getState().network.isOnline).toBe(false);

    emit(report(true, true));
    expect(store.getState().network.isOnline).toBe(true);
  });

  it('treats a connected network without internet as offline', () => {
    const { store, emit } = setup();

    emit(report(true, false));

    expect(store.getState().network).toEqual({
      isOnline: false,
      isInternetReachable: false,
    });
  });

  it('does not call an unprobed network offline', () => {
    const { store, emit } = setup();

    emit(report(true, null));

    expect(store.getState().network.isOnline).toBe(true);
  });

  it('treats an unknown connection as offline', () => {
    const { store, emit } = setup();

    emit(report(null, null));

    expect(store.getState().network.isOnline).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { view, unsubscribe } = setup();
    expect(unsubscribe).not.toHaveBeenCalled();

    view.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

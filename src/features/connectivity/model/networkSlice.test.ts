import {
  networkReducer,
  networkStatusChanged,
  selectIsOnline,
} from '@features/connectivity/model/networkSlice';

describe('networkSlice', () => {
  it('starts online with reachability unknown', () => {
    expect(networkReducer(undefined, { type: 'init' })).toEqual({
      isOnline: true,
      isInternetReachable: null,
    });
  });

  it('replaces the state with the reported status', () => {
    const state = networkReducer(
      undefined,
      networkStatusChanged({ isOnline: false, isInternetReachable: false }),
    );

    expect(state).toEqual({ isOnline: false, isInternetReachable: false });
  });

  it('selects online from the network slice', () => {
    expect(
      selectIsOnline({
        network: { isOnline: false, isInternetReachable: null },
      }),
    ).toBe(false);
  });
});

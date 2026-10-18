import { useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';
import {
  networkStatusChanged,
  type NetworkState,
} from '@features/connectivity/model/networkSlice';

// A captive portal or a router with no uplink reports isConnected true while
// no request can succeed. isInternetReachable === false is therefore offline
// for our purposes; null (not yet probed) is not evidence of an outage.
const toNetworkState = ({
  isConnected,
  isInternetReachable,
}: NetInfoState): NetworkState => ({
  isOnline: isConnected === true && isInternetReachable !== false,
  isInternetReachable,
});

export function useNetworkMonitor(): void {
  const dispatch = useDispatch();

  useEffect(
    () =>
      NetInfo.addEventListener(state => {
        dispatch(networkStatusChanged(toNetworkState(state)));
      }),
    [dispatch],
  );
}

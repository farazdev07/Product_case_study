import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NetworkState = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
};

export type NetworkRootState = { network: NetworkState };

// Optimistic until NetInfo reports: its listener fires immediately on
// subscribe, and starting offline would flash the banner on every launch.
const initialState: NetworkState = {
  isOnline: true,
  isInternetReachable: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    networkStatusChanged: (_state, action: PayloadAction<NetworkState>) =>
      action.payload,
  },
});

export const { networkStatusChanged } = networkSlice.actions;
export const networkReducer = networkSlice.reducer;

export const selectIsOnline = (state: NetworkRootState) =>
  state.network.isOnline;

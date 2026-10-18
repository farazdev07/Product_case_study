import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

// Interpretation of an underspecified brief. The requirement asks for a
// "Syncing Queued Actions" banner and offline queue persistence, but the
// dummyjson API is read-only, so the product catalog has no mutation to queue.
// Favourites are a local preference that can be recorded offline and delivered
// to a server later, which gives the queue, the banner state and the
// reconnection handling something real to do. It is a deliberate reading of
// the requirement, not a feature the brief names.
export type QueuedAction = {
  id: string;
  productId: number;
  type: 'add' | 'remove';
  createdAt: number;
  attempts: number;
};

export type FavoritesState = {
  ids: number[];
  queue: QueuedAction[];
  status: 'idle' | 'syncing';
};

export type FavoritesRootState = { favorites: FavoritesState };

// An action the server keeps rejecting must not sit at the head of a FIFO
// queue forever and starve everything behind it, so it is dropped here.
export const MAX_ATTEMPTS = 5;

const initialState: FavoritesState = {
  ids: [],
  queue: [],
  status: 'idle',
};

type Toggle = { productId: number; actionId: string; createdAt: number };

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite: {
      // Id and timestamp are generated here so the reducer stays pure.
      prepare: (productId: number) => ({
        payload: {
          productId,
          actionId: nanoid(),
          createdAt: Date.now(),
        } satisfies Toggle,
      }),
      reducer: (state, { payload }: PayloadAction<Toggle>) => {
        const { productId, actionId, createdAt } = payload;
        const wasFavorite = state.ids.includes(productId);

        // Optimistic: the preference changes before any network round trip.
        state.ids = wasFavorite
          ? state.ids.filter(id => id !== productId)
          : [...state.ids, productId];

        // Favouriting then unfavouriting a product while offline leaves the
        // server exactly where it started, so the pending opposite action and
        // this toggle cancel out instead of sending two requests. The head of
        // a syncing queue is the exception: it may already be on the wire, and
        // cancelling it locally would leave the server with a favourite the
        // user has since removed.
        const pendingIndex = state.queue.findIndex(
          (action, index) =>
            action.productId === productId &&
            action.type === (wasFavorite ? 'add' : 'remove') &&
            !(index === 0 && state.status === 'syncing'),
        );
        if (pendingIndex !== -1) {
          state.queue.splice(pendingIndex, 1);
          return;
        }

        state.queue.push({
          id: actionId,
          productId,
          type: wasFavorite ? 'remove' : 'add',
          createdAt,
          attempts: 0,
        });
      },
    },
    syncStarted: state => {
      state.status = 'syncing';
    },
    actionSucceeded: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(({ id }) => id !== action.payload);
    },
    // The failed action keeps its place at the front: add/remove pairs for one
    // product are only correct if delivered in order, so it is retried before
    // anything behind it.
    actionFailed: (state, action: PayloadAction<string>) => {
      const failed = state.queue.find(({ id }) => id === action.payload);
      if (!failed) {
        return;
      }
      failed.attempts += 1;
      if (failed.attempts >= MAX_ATTEMPTS) {
        state.queue = state.queue.filter(({ id }) => id !== failed.id);
      }
    },
    syncFinished: state => {
      state.status = 'idle';
    },
  },
});

export const {
  toggleFavorite,
  syncStarted,
  actionSucceeded,
  actionFailed,
  syncFinished,
} = favoritesSlice.actions;
export const favoritesReducer = favoritesSlice.reducer;

export const selectIsFavorite = (
  state: FavoritesRootState,
  productId: number,
) => state.favorites.ids.includes(productId);
export const selectQueue = (state: FavoritesRootState) => state.favorites.queue;
export const selectQueueLength = (state: FavoritesRootState) =>
  state.favorites.queue.length;

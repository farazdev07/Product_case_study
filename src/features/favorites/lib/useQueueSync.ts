import { useEffect, useRef } from 'react';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { devWarn } from '@shared/lib/logger';
import { selectIsOnline, type NetworkRootState } from '@features/connectivity';
import { favoritesApi } from '@features/favorites/api/favoritesApi';
import {
  actionFailed,
  actionSucceeded,
  selectQueue,
  selectQueueLength,
  syncFinished,
  syncStarted,
  type FavoritesRootState,
} from '@features/favorites/model/favoritesSlice';

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

type SyncState = FavoritesRootState & NetworkRootState;
type SyncDispatch = ThunkDispatch<SyncState, undefined, UnknownAction>;

// Doubles with every failed attempt of the same action: a server that is down
// is not helped by a client retrying at full speed.
export const backoffDelay = (attempts: number) =>
  Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// Sequential on purpose: an add followed by a remove for one product is only
// correct if the server sees them in that order. State is read from the store
// on every step instead of from a snapshot, so actions queued mid-drain are
// picked up and a connection lost mid-drain stops it.
const drain = async (
  dispatch: SyncDispatch,
  getState: () => SyncState,
  isCancelled: () => boolean,
) => {
  dispatch(syncStarted());
  try {
    while (!isCancelled()) {
      const state = getState();
      const next = selectQueue(state)[0];
      if (!next || !selectIsOnline(state)) {
        break;
      }

      try {
        await dispatch(
          favoritesApi.endpoints.syncFavorite.initiate(next, { track: false }),
        ).unwrap();
        dispatch(actionSucceeded(next.id));
      } catch {
        dispatch(actionFailed(next.id));
        const remaining = selectQueue(getState()).find(
          ({ id }) => id === next.id,
        );
        if (remaining) {
          await sleep(backoffDelay(remaining.attempts));
        } else {
          devWarn(
            `favorites: dropped ${next.type} for product ${next.productId} after repeated failures`,
          );
        }
      }
    }
  } finally {
    dispatch(syncFinished());
  }
};

export function useQueueSync(): void {
  const dispatch = useDispatch<SyncDispatch>();
  const store = useStore<SyncState>();
  const isOnline = useSelector(selectIsOnline);
  const queueLength = useSelector(selectQueueLength);
  const isDraining = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // One condition covers every trigger: mount, reconnect, and an action queued
  // while already online. The guard turns the re-runs caused by the drain's own
  // queue changes into no-ops, so two drains can never overlap.
  useEffect(() => {
    if (!isOnline || queueLength === 0 || isDraining.current) {
      return;
    }

    isDraining.current = true;
    drain(dispatch, store.getState, () => !isMounted.current).finally(() => {
      isDraining.current = false;
    });
  }, [dispatch, store, isOnline, queueLength]);
}

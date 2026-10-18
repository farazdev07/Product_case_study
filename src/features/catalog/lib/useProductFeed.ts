import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { CACHE_TTL_MS, PAGE_SIZE } from '@shared/config/constants';
import { isStale } from '@shared/storage/cache';
import { useGetProductsQuery } from '@features/catalog/api/catalogApi';
import {
  selectFeedProducts,
  selectFeedTotal,
  selectLastFetchedAt,
} from '@features/catalog/model/catalogSlice';

type LoadMoreGuard = {
  isFetching: boolean;
  isError: boolean;
  loaded: number;
  total: number;
};

// FlashList can call onEndReached repeatedly while a page is still loading, and
// again once everything has been loaded; both must be no-ops. After a failure
// the next page is not requested until the user retries.
export const canLoadMore = ({
  isFetching,
  isError,
  loaded,
  total,
}: LoadMoreGuard): boolean => !isFetching && !isError && loaded < total;

export function useProductFeed() {
  const products = useSelector(selectFeedProducts);
  const total = useSelector(selectFeedTotal);
  const lastFetchedAt = useSelector(selectLastFetchedAt);

  // The TTL governs revalidation, not retention: a hydrated feed is always
  // shown, and only a missing or older-than-TTL one is refetched on mount. A
  // fresh feed makes no request until the user scrolls past it. The age is
  // read once, on the first render, so it cannot flip while the screen is open.
  const [enabled, setEnabled] = useState(
    () =>
      products.length === 0 ||
      lastFetchedAt === null ||
      isStale({ data: null, cachedAt: lastFetchedAt }, CACHE_TTL_MS),
  );
  const [skip, setSkip] = useState(0);

  // The query only drives fetching and status. The list reads the slice, which
  // is what lets cached products show before any request completes. Always
  // refetching on an argument change makes pull-to-refresh from skip > 0 hit
  // the network instead of RTK Query's cached first page.
  const { isFetching, isError, refetch } = useGetProductsQuery(
    { limit: PAGE_SIZE, skip },
    { skip: !enabled, refetchOnMountOrArgChange: true },
  );

  // The next page starts after what is already loaded, which after hydration is
  // more than one page. Two end-reached events before a re-render compute the
  // same skip, so the state update is idempotent without an in-flight ref.
  const loadMore = useCallback(() => {
    if (canLoadMore({ isFetching, isError, loaded: products.length, total })) {
      setEnabled(true);
      setSkip(products.length);
    }
  }, [isFetching, isError, products.length, total]);

  const refresh = useCallback(() => {
    if (enabled && skip === 0) {
      refetch();
    } else {
      setEnabled(true);
      setSkip(0);
    }
  }, [enabled, skip, refetch]);

  return {
    products,
    isFetching,
    isError,
    isLoadingMore: isFetching && skip > 0,
    isRefreshing: isFetching && skip === 0 && products.length > 0,
    loadMore,
    refresh,
    retry: refetch,
  };
}

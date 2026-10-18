import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { PAGE_SIZE } from '@shared/config/constants';
import { useGetProductsQuery } from '@features/catalog/api/catalogApi';
import {
  selectFeedProducts,
  selectFeedTotal,
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
  const [skip, setSkip] = useState(0);
  const products = useSelector(selectFeedProducts);
  const total = useSelector(selectFeedTotal);

  // The query only drives fetching and status. The list reads the slice, which
  // is what lets cached products show before any request completes. Always
  // refetching on an argument change makes pull-to-refresh from skip > 0 hit
  // the network instead of RTK Query's cached first page.
  const { isFetching, isError, refetch } = useGetProductsQuery(
    { limit: PAGE_SIZE, skip },
    { refetchOnMountOrArgChange: true },
  );

  // Two end-reached events before a re-render both compute the same next skip,
  // so the state update is idempotent without a separate in-flight ref.
  const loadMore = useCallback(() => {
    if (canLoadMore({ isFetching, isError, loaded: products.length, total })) {
      setSkip(skip + PAGE_SIZE);
    }
  }, [isFetching, isError, products.length, total, skip]);

  const refresh = useCallback(() => {
    if (skip === 0) {
      refetch();
    } else {
      setSkip(0);
    }
  }, [skip, refetch]);

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

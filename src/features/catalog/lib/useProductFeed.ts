import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { CACHE_TTL_MS, PAGE_SIZE } from '@shared/config/constants';
import { isStale } from '@shared/storage/cache';
import {
  useGetProductsByCategoryQuery,
  useGetProductsQuery,
  useSearchProductsQuery,
} from '@features/catalog/api/catalogApi';
import {
  selectFeedIds,
  selectFeedKey,
  selectFeedTotal,
  selectLastFetchedAt,
} from '@features/catalog/model/catalogSlice';
import {
  feedKeyOf,
  resolveFeedSource,
} from '@features/catalog/model/feedSource';
import { selectFilters } from '@features/catalog/model/filtersSlice';
import { selectVisibleProducts } from '@features/catalog/model/selectors';
import type { Product } from '@features/catalog/model/types';

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

type Pagination = { key: string; skip: number; enabled: boolean };

const NO_PRODUCTS: Product[] = [];

export function useProductFeed() {
  const source = resolveFeedSource(useSelector(selectFilters));
  const sourceKey = feedKeyOf(source);

  const feedIds = useSelector(selectFeedIds);
  const feedKey = useSelector(selectFeedKey);
  const feedTotal = useSelector(selectFeedTotal);
  const lastFetchedAt = useSelector(selectLastFetchedAt);
  const visibleProducts = useSelector(selectVisibleProducts);

  // The stored feed belongs to whichever source produced it, which after a
  // restart may not be the one now selected. It is shown, and paged, only when
  // the two agree.
  const feedMatches = feedKey === sourceKey;
  const loaded = feedMatches ? feedIds.length : 0;
  const products = feedMatches ? visibleProducts : NO_PRODUCTS;

  // The TTL governs revalidation, not retention: a hydrated feed is always
  // shown, and only a missing, mismatched or older-than-TTL one is refetched on
  // mount. A fresh feed makes no request until the user scrolls past it. The
  // age is read once, on the first render, so it cannot flip while open.
  const [stored, setStored] = useState<Pagination>(() => ({
    key: sourceKey,
    skip: 0,
    enabled:
      !feedMatches ||
      loaded === 0 ||
      lastFetchedAt === null ||
      isStale({ data: null, cachedAt: lastFetchedAt }, CACHE_TTL_MS),
  }));
  // A different source restarts at the first page. Deriving this from the key,
  // rather than resetting in an effect, means the stale offset is never used.
  const current: Pagination =
    stored.key === sourceKey
      ? stored
      : { key: sourceKey, skip: 0, enabled: true };
  const { skip, enabled } = current;

  // Only the active source's query runs; the others are skipped. The list reads
  // the slice, which is what lets cached products show before any request
  // completes. Always refetching on an argument change makes pull-to-refresh
  // from skip > 0 hit the network instead of RTK Query's cached first page.
  const all = useGetProductsQuery(
    { limit: PAGE_SIZE, skip },
    {
      skip: !enabled || source.kind !== 'all',
      refetchOnMountOrArgChange: true,
    },
  );
  const search = useSearchProductsQuery(
    { q: source.kind === 'search' ? source.term : '', limit: PAGE_SIZE, skip },
    {
      skip: !enabled || source.kind !== 'search',
      refetchOnMountOrArgChange: true,
    },
  );
  const category = useGetProductsByCategoryQuery(
    {
      slug: source.kind === 'category' ? source.slug : '',
      limit: PAGE_SIZE,
      skip,
    },
    {
      skip: !enabled || source.kind !== 'category',
      refetchOnMountOrArgChange: true,
    },
  );
  const active =
    source.kind === 'search'
      ? search
      : source.kind === 'category'
      ? category
      : all;
  const { isFetching, isError, refetch } = active;
  const total = feedMatches ? feedTotal : 0;

  // The next page starts after what is already loaded, which after hydration is
  // more than one page. Two end-reached events before a re-render compute the
  // same skip, so the state update is idempotent without an in-flight ref.
  const loadMore = useCallback(() => {
    if (canLoadMore({ isFetching, isError, loaded, total })) {
      setStored({ key: sourceKey, skip: loaded, enabled: true });
    }
  }, [isFetching, isError, loaded, total, sourceKey]);

  const refresh = useCallback(() => {
    if (enabled && skip === 0) {
      refetch();
    } else {
      setStored({ key: sourceKey, skip: 0, enabled: true });
    }
  }, [enabled, skip, refetch, sourceKey]);

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

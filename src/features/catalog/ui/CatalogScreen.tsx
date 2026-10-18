import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useDispatch, useSelector } from 'react-redux';
import { spacing } from '@shared/config/theme';
import { Button, Screen, Spinner, Text } from '@shared/ui';
import { getEmptyState } from '@features/catalog/lib/emptyState';
import { useProductFeed } from '@features/catalog/lib/useProductFeed';
import {
  clearFilters,
  selectActiveFilterCount,
  selectSearchTerm,
} from '@features/catalog/model/filtersSlice';
import type { Product } from '@features/catalog/model/types';
import { EmptyFeed } from '@features/catalog/ui/EmptyFeed';
import { FilterBar } from '@features/catalog/ui/FilterBar';
import { ProductCard } from '@features/catalog/ui/ProductCard';

type Props = {
  onProductPress: (id: number) => void;
};

// A stable key function; an inline one would be a new reference every render.
const keyExtractor = (product: Product) => String(product.id);

// Module-level so the list never sees a new separator component.
const Separator = () => <View style={styles.separator} />;

function RetryMessage({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.message}>
      <Text color="textSecondary">Could not load products.</Text>
      <Button title="Retry" onPress={onRetry} />
    </View>
  );
}

export function CatalogScreen({ onProductPress }: Props) {
  const {
    products,
    isFetching,
    isError,
    isNetworkError,
    isLoadingMore,
    isRefreshing,
    hasMore,
    isOffline,
    hasCache,
    loadMore,
    refresh,
    retry,
  } = useProductFeed();
  const dispatch = useDispatch();
  const searchTerm = useSelector(selectSearchTerm);
  const hasActiveFilters = useSelector(selectActiveFilterCount) > 0;

  // A stable renderItem keeps FlashList from re-rendering every visible row
  // when only the footer or refresh state changes.
  const renderItem = useCallback<ListRenderItem<Product>>(
    ({ item }) => <ProductCard product={item} onPress={onProductPress} />,
    [onProductPress],
  );

  const clearAll = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const emptyState = (
    <EmptyFeed
      state={getEmptyState({
        isFetching,
        isError,
        isNetworkError,
        hasMore,
        isOffline,
        hasCache,
        searchTerm,
        hasActiveFilters,
      })}
      onRetry={retry}
      onLoadMore={loadMore}
      onClearFilters={clearAll}
    />
  );

  const footer = isLoadingMore ? (
    <View style={styles.footer}>
      <Spinner />
    </View>
  ) : isError && products.length > 0 ? (
    <RetryMessage onRetry={retry} />
  ) : null;

  return (
    <Screen belowHeader>
      <FilterBar />
      <FlashList
        testID="product-feed"
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        // FlashList v2 keeps the first visible row in place when data changes.
        // A new sort order or filter replaces the rows, so that anchoring left
        // the list scrolled past the new first results; start from the top.
        maintainVisibleContentPosition={{ disabled: true }}
        onEndReached={loadMore}
        refreshing={isRefreshing}
        onRefresh={refresh}
        ListEmptyComponent={emptyState}
        ListFooterComponent={footer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.md,
  },
  message: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});

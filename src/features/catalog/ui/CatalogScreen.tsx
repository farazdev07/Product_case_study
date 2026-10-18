import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { spacing } from '@shared/config/theme';
import { Button, Screen, Spinner, Text } from '@shared/ui';
import { useProductFeed } from '@features/catalog/lib/useProductFeed';
import type { Product } from '@features/catalog/model/types';
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
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    retry,
  } = useProductFeed();

  // A stable renderItem keeps FlashList from re-rendering every visible row
  // when only the footer or refresh state changes.
  const renderItem = useCallback<ListRenderItem<Product>>(
    ({ item }) => <ProductCard product={item} onPress={onProductPress} />,
    [onProductPress],
  );

  const emptyState = isFetching ? (
    <View style={styles.message}>
      <Spinner />
    </View>
  ) : isError ? (
    <RetryMessage onRetry={retry} />
  ) : (
    <View style={styles.message}>
      <Text color="textSecondary">No products found.</Text>
    </View>
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

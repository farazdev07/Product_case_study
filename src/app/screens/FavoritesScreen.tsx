import { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useAppSelector } from '@app/store/hooks';
import { spacing } from '@shared/config/theme';
import { Screen, Text } from '@shared/ui';
import {
  ProductCard,
  columnsForWidth,
  selectProductEntities,
} from '@features/catalog';
import { selectFavoriteIds } from '@features/favorites';

// This lives in the app layer, not in the favorites feature: catalog already
// imports favorites (ProductCard renders FavoriteButton), so a favorites screen
// importing ProductCard would be a cycle. The app layer may see both features,
// which is the layering doing its job.
type Product = NonNullable<ReturnType<typeof selectProductEntities>[number]>;

type Props = {
  onProductPress: (id: number) => void;
};

const keyExtractor = (product: Product) => String(product.id);

function EmptyFavorites() {
  return (
    <View style={styles.empty}>
      <Text variant="subtitle">No saved products yet.</Text>
      <Text color="textSecondary" centered>
        Tap Save on a product to keep it here.
      </Text>
    </View>
  );
}

export function FavoritesScreen({ onProductPress }: Props) {
  const ids = useAppSelector(selectFavoriteIds);
  const entities = useAppSelector(selectProductEntities);
  const numColumns = columnsForWidth(useWindowDimensions().width);

  // Everything shown comes from the persisted entity store, so the screen needs
  // no request and works offline. `ids` is in the order products were saved
  // (toggling appends), so reversing it puts the latest first without storing a
  // timestamp. An id with no cached product (cache cleared, or hydrated from an
  // older cache) is skipped: there is nothing to render, and the id stays in
  // the slice so the product reappears once the cache holds it again.
  const products = useMemo(
    () =>
      [...ids].reverse().flatMap(id => {
        const product = entities[id];
        return product ? [product] : [];
      }),
    [ids, entities],
  );

  const renderItem = useCallback<ListRenderItem<Product>>(
    ({ item }) => (
      <View style={styles.cell}>
        <ProductCard product={item} onPress={onProductPress} />
      </View>
    ),
    [onProductPress],
  );

  return (
    <Screen belowHeader>
      <FlashList
        testID="favorites-list"
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.list}
        maintainVisibleContentPosition={{ disabled: true }}
        ListEmptyComponent={EmptyFavorites}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md - spacing.xs,
  },
  cell: {
    padding: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});

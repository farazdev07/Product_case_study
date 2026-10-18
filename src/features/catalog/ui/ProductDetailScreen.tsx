import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { colors, radii, spacing } from '@shared/config/theme';
import { Button, Screen, Spinner, Text } from '@shared/ui';
import { useGetProductByIdQuery } from '@features/catalog/api/catalogApi';
import { formatCategory, formatPrice } from '@features/catalog/lib/format';
import {
  selectProductById,
  type CatalogRootState,
} from '@features/catalog/model/catalogSlice';
import { FavoriteButton } from '@features/favorites';

type Props = {
  productId: number;
};

export function ProductDetailScreen({ productId }: Props) {
  // dummyjson's list and detail endpoints return identical objects (checked
  // field by field), so a product opened from the feed is already complete and
  // needs no request. The detail query exists only for a cache miss, such as
  // an id that was never listed. Its result reaches the screen through the
  // slice, not through `data`.
  const product = useSelector((state: CatalogRootState) =>
    selectProductById(state, productId),
  );
  const { isError, refetch } = useGetProductByIdQuery(productId, {
    skip: product !== undefined,
  });

  if (!product) {
    return (
      <Screen belowHeader>
        <View style={styles.centered}>
          {isError ? (
            <>
              <Text color="textSecondary">Could not load this product.</Text>
              <Button title="Retry" onPress={refetch} />
            </>
          ) : (
            <Spinner />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen belowHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: product.images[0] ?? product.thumbnail }}
          style={styles.image}
          resizeMode="contain"
        />
        <Text variant="title">{product.title}</Text>
        <Text color="textSecondary">
          {product.brand
            ? `${product.brand} - ${formatCategory(product.category)}`
            : formatCategory(product.category)}
        </Text>
        <View style={styles.priceRow}>
          <Text variant="title">{formatPrice(product.price)}</Text>
          <Text color="textSecondary">{`${product.rating.toFixed(
            1,
          )} / 5`}</Text>
        </View>
        <View style={styles.favorite}>
          <FavoriteButton productId={product.id} />
        </View>
        <Text color="textSecondary">
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </Text>
        <Text>{product.description}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favorite: {
    alignItems: 'flex-start',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});

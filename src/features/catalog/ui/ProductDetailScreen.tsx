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

type Props = {
  productId: number;
};

export function ProductDetailScreen({ productId }: Props) {
  // The product is read from the slice first: anything opened from the feed is
  // already cached, so the screen renders at once, and also works offline. The
  // query is only a refresh and the fallback for a product that is not cached.
  // Its result reaches the screen through the slice, not through `data`.
  const product = useSelector((state: CatalogRootState) =>
    selectProductById(state, productId),
  );
  const { isError, refetch } = useGetProductByIdQuery(productId);

  if (!product) {
    return (
      <Screen>
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
    <Screen>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});

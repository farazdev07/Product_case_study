import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import TurboImage from 'react-native-turbo-image';
import { colors, radii, spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';
import { FavoriteButton } from '@features/favorites';
import { formatCategory, formatPrice } from '@features/catalog/lib/format';
import type { Product } from '@features/catalog/model/types';

type Props = {
  product: Product;
  onPress: (id: number) => void;
};

// Memoised because the list re-renders on every page load; with a stable
// `product` reference and a stable `onPress`, only new rows render.
export const ProductCard = memo(function ProductCard({
  product,
  onPress,
}: Props) {
  const handlePress = useCallback(
    () => onPress(product.id),
    [onPress, product.id],
  );

  // The favourite button is a sibling of the pressable area, not a child: a
  // pressable is a single accessibility element, so a button nested inside it
  // could not be reached by a screen reader.
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={product.title}
        onPress={handlePress}
        style={styles.main}
      >
        <TurboImage
          source={{ uri: product.thumbnail }}
          style={styles.image}
          cachePolicy="dataCache"
        />
        <View style={styles.details}>
          <Text variant="subtitle" numberOfLines={2}>
            {product.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatCategory(product.category)}
          </Text>
          <View style={styles.meta}>
            <Text variant="subtitle">{formatPrice(product.price)}</Text>
            <Text variant="caption" color="textSecondary">
              {`${product.rating.toFixed(1)} / 5`}
            </Text>
          </View>
        </View>
      </Pressable>
      {/* Id only: the button owns its state so this memo stays valid. */}
      <FavoriteButton productId={product.id} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

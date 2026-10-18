import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.title}
      onPress={handlePress}
      style={styles.card}
    >
      <Image source={{ uri: product.thumbnail }} style={styles.image} />
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
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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

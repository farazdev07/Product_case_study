import { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';
import {
  selectIsFavorite,
  toggleFavorite,
  type FavoritesRootState,
} from '@features/favorites/model/favoritesSlice';

type Props = {
  productId: number;
  // The roomy variant for a screen where it is the main action, not a row item.
  large?: boolean;
};

// Takes only an id and reads its own state so the memoised ProductCard never
// re-renders on a toggle: a passed-down callback or favourite set would
// re-render every card when any one changed.
export const FavoriteButton = memo(function FavoriteButton({
  productId,
  large = false,
}: Props) {
  const dispatch = useDispatch();
  const isFavorite = useSelector((state: FavoritesRootState) =>
    selectIsFavorite(state, productId),
  );

  const toggle = useCallback(
    () => dispatch(toggleFavorite(productId)),
    [dispatch, productId],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite ? 'Remove from favorites' : 'Add to favorites'
      }
      accessibilityState={{ selected: isFavorite }}
      hitSlop={spacing.sm}
      onPress={toggle}
      style={[
        styles.button,
        large && styles.large,
        isFavorite && styles.selected,
      ]}
    >
      <Text
        variant="caption"
        color={isFavorite ? 'onPrimary' : 'textSecondary'}
      >
        {isFavorite ? 'Saved' : 'Save'}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // 44 points is the platform minimum for a comfortable touch target.
  large: {
    minWidth: 96,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});

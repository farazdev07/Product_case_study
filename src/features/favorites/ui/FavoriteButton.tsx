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

// The button takes only a primitive id and reads its own state, instead of the
// card passing `isFavorite` and an `onToggle` down. ProductCard is memoised
// and rendered by the hundred in a list; a new callback or a changed prop on
// every toggle would re-render the card, and passing the favourite set would
// re-render every card whenever any one changed. Selecting a boolean here
// re-renders only the button that was tapped.
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

import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@shared/config/theme';
import { Spinner } from '@shared/ui/Spinner';
import { Text } from '@shared/ui/Text';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
}: Props) {
  // A loading button ignores presses so a slow request cannot be fired twice.
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <Spinner color="onPrimary" />
      ) : (
        <Text variant="subtitle" color="onPrimary">
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors.disabled,
  },
  pressed: {
    opacity: 0.85,
  },
});

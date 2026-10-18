import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@shared/config/theme';
import { Text } from '@shared/ui';
import type { FilterOption } from '@features/catalog/model/filterOptions';
import { FilterChip } from '@features/catalog/ui/FilterChip';

type Props<T> = {
  label: string;
  options: readonly FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

export function ChipRow<T extends string | number | null>({
  label,
  options,
  selected,
  onSelect,
}: Props<T>) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {options.map(option => (
          <FilterChip
            key={String(option.value)}
            label={option.label}
            selected={option.value === selected}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  chips: {
    gap: spacing.sm,
  },
});

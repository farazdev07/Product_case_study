import { StyleSheet, View } from 'react-native';
import { spacing } from '@shared/config/theme';
import { Button, Spinner, Text } from '@shared/ui';
import type { EmptyState } from '@features/catalog/lib/emptyState';

type Props = {
  state: EmptyState;
  onRetry: () => void;
  onLoadMore: () => void;
  onClearFilters: () => void;
};

export function EmptyFeed({
  state,
  onRetry,
  onLoadMore,
  onClearFilters,
}: Props) {
  switch (state.kind) {
    case 'loading':
      return (
        <View style={styles.container}>
          <Spinner />
        </View>
      );
    case 'offline':
      return (
        <View style={styles.container}>
          <Text variant="subtitle">You are offline</Text>
          <Text color="textSecondary" centered>
            {state.filtered
              ? 'Searching and filtering need a connection.'
              : 'No products are saved on this device yet. Connect to the internet to load them.'}
          </Text>
          <Button title="Retry" onPress={onRetry} />
        </View>
      );
    case 'error':
      return (
        <View style={styles.container}>
          <Text color="textSecondary">Could not load products.</Text>
          <Button title="Retry" onPress={onRetry} />
        </View>
      );
    case 'unloaded-matches':
      return (
        <View style={styles.container}>
          <Text color="textSecondary" centered>
            None of the products loaded so far match. More are available.
          </Text>
          <Button title="Load more" onPress={onLoadMore} />
          <Button title="Clear all filters" onPress={onClearFilters} />
        </View>
      );
    case 'no-results':
      return (
        <View style={styles.container}>
          <Text color="textSecondary" centered>
            {state.searchTerm
              ? `No results for "${state.searchTerm}".`
              : 'No products match these filters.'}
          </Text>
          <Button title="Clear all filters" onPress={onClearFilters} />
        </View>
      );
    case 'empty':
      return (
        <View style={styles.container}>
          <Text color="textSecondary">No products found.</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});

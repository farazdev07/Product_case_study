import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { AppProviders } from '@app/providers/AppProviders';
import { spacing } from '@shared/config/theme';
import { Button, Screen, Spinner, Text } from '@shared/ui';

function PlaceholderScreen() {
  const [taps, setTaps] = useState(0);

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">Product Catalog</Text>
        <Text color="textSecondary">Shared primitives are wired up.</Text>
        <Spinner />
        <Button title="Tap me" onPress={() => setTaps(count => count + 1)} />
        <Text variant="caption" color="textSecondary">
          {`Taps: ${taps}`}
        </Text>
      </View>
    </Screen>
  );
}

function App() {
  return (
    <AppProviders>
      <StatusBar barStyle="dark-content" />
      <PlaceholderScreen />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});

export default App;

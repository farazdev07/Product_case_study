import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { devError } from '@shared/lib/logger';
import { spacing } from '@shared/config/theme';
import { Button, Screen, Text } from '@shared/ui';

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    devError('ErrorBoundary caught an error', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Screen>
        <View style={styles.fallback}>
          <Text variant="title">Something went wrong</Text>
          <Button title="Try again" onPress={this.reset} />
        </View>
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});

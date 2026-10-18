import type { PropsWithChildren } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '@app/store';
import { ErrorBoundary } from '@app/providers/ErrorBoundary';

// The boundary sits inside SafeAreaProvider so its fallback can render a Screen,
// and outside NavigationContainer so retrying remounts navigation from scratch.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <NavigationContainer>{children}</NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </Provider>
  );
}

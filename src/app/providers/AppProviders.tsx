import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '@app/store';
import { ErrorBoundary } from '@app/providers/ErrorBoundary';

// The boundary sits inside SafeAreaProvider so its fallback can render a Screen.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </SafeAreaProvider>
    </Provider>
  );
}

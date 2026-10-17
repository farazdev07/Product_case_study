import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '@app/providers/ErrorBoundary';
import * as logger from '@shared/lib/logger';
import { Text } from '@shared/ui';

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <Text>Recovered</Text>;
}

const renderBoundary = () =>
  render(
    <SafeAreaProvider>
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    </SafeAreaProvider>,
  );

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs every caught render error; keep the test output readable.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    shouldThrow = false;

    renderBoundary();

    expect(screen.getByText('Recovered')).toBeOnTheScreen();
  });

  it('shows the fallback and logs the error when a child throws', () => {
    const devError = jest
      .spyOn(logger, 'devError')
      .mockImplementation(() => {});

    renderBoundary();

    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(devError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.objectContaining({ message: 'boom' }),
      expect.any(String),
    );
  });

  it('re-renders the children when retry is pressed', () => {
    renderBoundary();
    shouldThrow = false;

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered')).toBeOnTheScreen();
  });
});

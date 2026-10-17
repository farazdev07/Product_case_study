import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { Screen } from '@shared/ui/Screen';
import { Text } from '@shared/ui/Text';

it('renders its children inside the safe area', () => {
  render(
    <SafeAreaProvider>
      <Screen>
        <Text>Inside</Text>
      </Screen>
    </SafeAreaProvider>,
  );

  expect(screen.getByText('Inside')).toBeOnTheScreen();
});

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { Screen } from '@shared/ui/Screen';
import { Text } from '@shared/ui/Text';

const renderScreen = (belowHeader?: boolean) =>
  render(
    <SafeAreaProvider>
      {belowHeader === undefined ? (
        <Screen>
          <Text>Inside</Text>
        </Screen>
      ) : (
        <Screen belowHeader={belowHeader}>
          <Text>Inside</Text>
        </Screen>
      )}
    </SafeAreaProvider>,
  );

describe('Screen', () => {
  it('renders its children inside the safe area', () => {
    renderScreen();

    expect(screen.getByText('Inside')).toBeOnTheScreen();
  });

  it('applies every inset by default', () => {
    renderScreen();

    expect(screen.UNSAFE_getByType(SafeAreaView).props.edges).toEqual([
      'top',
      'right',
      'bottom',
      'left',
    ]);
  });

  it('leaves the top inset to the header when below one', () => {
    renderScreen(true);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.edges).toEqual([
      'right',
      'bottom',
      'left',
    ]);
  });
});

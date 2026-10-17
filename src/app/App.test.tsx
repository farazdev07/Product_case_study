import { StatusBar, useColorScheme } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import App from '@app/App';

// react-native/jest/setup replaces useColorScheme with a jest.fn.
const mockedUseColorScheme = jest.mocked(useColorScheme);

describe('App', () => {
  it('renders the root screen', () => {
    render(<App />);

    expect(screen.getByText('Welcome to React Native')).toBeOnTheScreen();
  });

  it.each([
    ['light', 'dark-content'],
    ['dark', 'light-content'],
  ] as const)(
    'uses a contrasting status bar for the %s scheme (%s)',
    (scheme, barStyle) => {
      mockedUseColorScheme.mockReturnValue(scheme);

      render(<App />);

      expect(screen.UNSAFE_getByType(StatusBar).props.barStyle).toBe(barStyle);
    },
  );
});

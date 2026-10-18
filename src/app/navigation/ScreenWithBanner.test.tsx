import { act, cleanup, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '@app/store';
import { ScreenWithBanner } from '@app/navigation/ScreenWithBanner';
import { networkStatusChanged } from '@features/connectivity';
import { toggleFavorite } from '@features/favorites';

jest.useFakeTimers();

const setOnline = (isOnline: boolean) =>
  act(() => {
    store.dispatch(
      networkStatusChanged({ isOnline, isInternetReachable: isOnline }),
    );
  });

const renderScreen = () =>
  render(
    <Provider store={store}>
      <ScreenWithBanner>
        <Text>content</Text>
      </ScreenWithBanner>
    </Provider>,
  );

describe('ScreenWithBanner', () => {
  afterEach(() => {
    cleanup();
    setOnline(true);
    jest.clearAllTimers();
  });

  it('renders its content and no banner when online with nothing queued', () => {
    renderScreen();

    expect(screen.getByText('content')).toBeOnTheScreen();
    expect(screen.queryByText(/Offline/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Syncing/)).not.toBeOnTheScreen();
  });

  it('shows the offline banner when the network slice goes offline', () => {
    renderScreen();

    setOnline(false);

    expect(screen.getByText(/Offline/)).toBeOnTheScreen();
    expect(screen.getByText('content')).toBeOnTheScreen();
  });

  it('shows the syncing banner when online with a queued action', () => {
    // Offline first, so nothing drains the action while the test looks.
    setOnline(false);
    act(() => {
      store.dispatch(toggleFavorite(1));
    });
    renderScreen();

    setOnline(true);

    expect(screen.getByText('Syncing Queued Actions')).toBeOnTheScreen();
  });
});

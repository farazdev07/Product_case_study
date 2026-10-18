import { act, render, screen } from '@testing-library/react-native';
import { NetworkBanner } from '@features/connectivity/ui/NetworkBanner';

jest.useFakeTimers();

const OFFLINE = 'Offline — Serving Cached Data';
const SYNCING = 'Syncing Queued Actions';

describe('NetworkBanner', () => {
  it('says it is serving cached data while offline', () => {
    render(<NetworkBanner isOnline={false} queuedCount={0} />);

    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });

  it('stays offline even with actions queued', () => {
    render(<NetworkBanner isOnline={false} queuedCount={3} />);

    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
    expect(screen.queryByText(SYNCING)).not.toBeOnTheScreen();
  });

  it('says it is syncing when online with queued actions', () => {
    render(<NetworkBanner isOnline queuedCount={2} />);

    expect(screen.getByText(SYNCING)).toBeOnTheScreen();
  });

  it('is hidden when online with an empty queue', () => {
    render(<NetworkBanner isOnline queuedCount={0} />);

    expect(screen.queryByText(OFFLINE)).not.toBeOnTheScreen();
    expect(screen.queryByText(SYNCING)).not.toBeOnTheScreen();
  });

  it('switches from offline to syncing on reconnect', () => {
    const view = render(<NetworkBanner isOnline={false} queuedCount={1} />);

    view.rerender(<NetworkBanner isOnline queuedCount={1} />);

    expect(screen.getByText(SYNCING)).toBeOnTheScreen();
    expect(screen.queryByText(OFFLINE)).not.toBeOnTheScreen();
  });

  it('keeps its text through the fade-out, then removes the bar', () => {
    const view = render(<NetworkBanner isOnline queuedCount={1} />);

    view.rerender(<NetworkBanner isOnline queuedCount={0} />);
    expect(screen.getByText(SYNCING)).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByText(SYNCING)).not.toBeOnTheScreen();
  });

  it('appears when going offline from hidden', () => {
    const view = render(<NetworkBanner isOnline queuedCount={0} />);

    view.rerender(<NetworkBanner isOnline={false} queuedCount={0} />);

    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });

  it('stays if the fade-out is interrupted by a new message', () => {
    const view = render(<NetworkBanner isOnline queuedCount={1} />);
    view.rerender(<NetworkBanner isOnline queuedCount={0} />);

    view.rerender(<NetworkBanner isOnline={false} queuedCount={0} />);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });
});

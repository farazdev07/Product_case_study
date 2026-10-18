import { fireEvent, render, screen } from '@testing-library/react-native';
import type { EmptyState } from '@features/catalog/lib/emptyState';
import { EmptyFeed } from '@features/catalog/ui/EmptyFeed';

const renderState = (state: EmptyState) => {
  const handlers = {
    onRetry: jest.fn(),
    onLoadMore: jest.fn(),
    onClearFilters: jest.fn(),
  };
  render(<EmptyFeed state={state} {...handlers} />);
  return handlers;
};

describe('EmptyFeed', () => {
  it('shows nothing but a spinner while loading', () => {
    renderState({ kind: 'loading' });

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    expect(screen.queryByText(/products/i)).not.toBeOnTheScreen();
  });

  it('explains that no products are saved when offline, and retries', () => {
    const { onRetry } = renderState({ kind: 'offline', filtered: false });

    expect(screen.getByText('You are offline')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'No products are saved on this device yet. Connect to the internet to load them.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('explains that searching needs a connection when offline with filters', () => {
    renderState({ kind: 'offline', filtered: true });

    expect(
      screen.getByText('Searching and filtering need a connection.'),
    ).toBeOnTheScreen();
  });

  it('reports a server error and retries', () => {
    const { onRetry } = renderState({ kind: 'error' });

    expect(screen.getByText('Could not load products.')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers to load more or clear when more pages may still match', () => {
    const { onLoadMore, onClearFilters } = renderState({
      kind: 'unloaded-matches',
    });

    expect(
      screen.getByText(
        'None of the products loaded so far match. More are available.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    fireEvent.press(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('names the search term when a search has no results', () => {
    const { onClearFilters } = renderState({
      kind: 'no-results',
      searchTerm: 'zzz',
    });

    expect(screen.getByText('No results for "zzz".')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('describes filters that match nothing when there is no search term', () => {
    renderState({ kind: 'no-results', searchTerm: '' });

    expect(
      screen.getByText('No products match these filters.'),
    ).toBeOnTheScreen();
  });

  it('says plainly when there are no products and no filters', () => {
    renderState({ kind: 'empty' });

    expect(screen.getByText('No products found.')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

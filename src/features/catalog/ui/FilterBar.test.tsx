import { Provider } from 'react-redux';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import {
  setCategory,
  setMaxPrice,
  setSortBy,
  type FiltersState,
} from '@features/catalog/model/filtersSlice';
import {
  jsonResponse,
  makeCatalogState,
  makeStore,
  stubFetch,
  teardownStore,
  testCategories,
  type TestStore,
} from '@features/catalog/testing/testStore';
import { FilterBar } from '@features/catalog/ui/FilterBar';

jest.useFakeTimers();

const defaults: FiltersState = {
  searchTerm: '',
  categorySlug: null,
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

describe('FilterBar', () => {
  let store: TestStore;

  const renderBar = () =>
    render(
      <Provider store={store}>
        <FilterBar />
      </Provider>,
    );
  const press = (name: string) =>
    fireEvent.press(screen.getByRole('button', { name }));
  const filters = () => store.getState().filters;

  beforeEach(() => {
    store = makeStore(undefined, { feedReset: true });
    stubFetch(() => jsonResponse(testCategories));
  });

  afterEach(() => {
    cleanup();
    teardownStore(store);
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('lists the categories once they have loaded', async () => {
    renderBar();
    expect(
      screen.queryByRole('button', { name: 'Beauty' }),
    ).not.toBeOnTheScreen();

    expect(
      await screen.findByRole('button', { name: 'Beauty' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Laptops' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'All' })).toBeOnTheScreen();
  });

  it('lists persisted categories without waiting for the network', () => {
    store = makeStore(makeCatalogState([], 0, null, testCategories));
    stubFetch(() => jsonResponse({}, 500));

    renderBar();

    expect(screen.getByRole('button', { name: 'Beauty' })).toBeOnTheScreen();
  });

  it('keeps persisted categories when the refresh fails', async () => {
    store = makeStore(makeCatalogState([], 0, null, testCategories));
    stubFetch(() => jsonResponse({}, 500));

    renderBar();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole('button', { name: 'Laptops' })).toBeOnTheScreen();
  });

  it('marks All as selected until a category is chosen', async () => {
    renderBar();

    const all = await screen.findByRole('button', { name: 'All' });

    expect(all).toBeSelected();
  });

  it('selects a category and marks it', async () => {
    renderBar();

    fireEvent.press(await screen.findByRole('button', { name: 'Beauty' }));

    expect(filters().categorySlug).toBe('beauty');
    expect(screen.getByRole('button', { name: 'Beauty' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'All' })).not.toBeSelected();
  });

  it('goes back to every category with All', async () => {
    renderBar();
    fireEvent.press(await screen.findByRole('button', { name: 'Beauty' }));

    press('All');

    expect(filters().categorySlug).toBeNull();
  });

  it('keeps sort, price and rating out of the way until asked', () => {
    renderBar();

    expect(
      screen.queryByRole('button', { name: 'Top rated' }),
    ).not.toBeOnTheScreen();

    press('More filters');

    expect(screen.getByRole('button', { name: 'Top rated' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Under $50' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '4 and up' })).toBeOnTheScreen();

    press('Hide filters');

    expect(
      screen.queryByRole('button', { name: 'Top rated' }),
    ).not.toBeOnTheScreen();
  });

  it('sets the sort order, maximum price and minimum rating', () => {
    renderBar();
    press('More filters');

    press('Price: low to high');
    press('Under $50');
    press('4 and up');

    expect(filters()).toMatchObject({
      sortBy: 'price-asc',
      maxPrice: 50,
      minRating: 4,
    });
  });

  it('removes a price or rating limit with its "any" option', () => {
    renderBar();
    press('More filters');
    press('Under $25');
    press('3 and up');

    press('Any price');
    press('Any rating');

    expect(filters().maxPrice).toBeNull();
    expect(filters().minRating).toBeNull();
  });

  it('shows no summary while nothing is filtered', () => {
    renderBar();

    expect(screen.queryByText(/active/)).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Clear all filters' }),
    ).not.toBeOnTheScreen();
  });

  it('counts the active filters', () => {
    renderBar();

    act(() => {
      store.dispatch(setMaxPrice(25));
    });
    expect(screen.getByText('1 filter active')).toBeOnTheScreen();

    act(() => {
      store.dispatch(setCategory('beauty'));
      store.dispatch(setSortBy('rating-desc'));
    });
    expect(screen.getByText('3 filters active')).toBeOnTheScreen();
  });

  it('counts a search term as a filter once it has been debounced', () => {
    renderBar();

    fireEvent.changeText(screen.getByLabelText('Search products'), 'phone');
    expect(screen.queryByText(/active/)).not.toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(400));

    expect(screen.getByText('1 filter active')).toBeOnTheScreen();
  });

  it('restores every default with clear all', async () => {
    renderBar();
    fireEvent.press(await screen.findByRole('button', { name: 'Laptops' }));
    press('More filters');
    press('Under $25');
    press('4.5 and up');
    press('Top rated');

    press('Clear all filters');

    expect(filters()).toEqual(defaults);
    expect(screen.queryByText(/active/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'All' })).toBeSelected();
  });

  it('empties the typed search with clear all', () => {
    renderBar();
    fireEvent.changeText(screen.getByLabelText('Search products'), 'phone');
    act(() => jest.advanceTimersByTime(400));

    press('Clear all filters');

    expect(screen.getByLabelText('Search products').props.value).toBe('');
    expect(filters().searchTerm).toBe('');
  });
});

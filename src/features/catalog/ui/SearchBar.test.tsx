import { Provider } from 'react-redux';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { SEARCH_DEBOUNCE_MS } from '@shared/config/constants';
import {
  clearFilters,
  setSearchTerm,
} from '@features/catalog/model/filtersSlice';
import {
  makeStore,
  teardownStore,
  type TestStore,
} from '@features/catalog/testing/testStore';
import { SearchBar } from '@features/catalog/ui/SearchBar';

jest.useFakeTimers();

describe('SearchBar', () => {
  let store: TestStore;

  const renderBar = () =>
    render(
      <Provider store={store}>
        <SearchBar />
      </Provider>,
    );
  const input = () => screen.getByLabelText('Search products');
  const type = (text: string) => fireEvent.changeText(input(), text);
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
  const storedTerm = () => store.getState().filters.searchTerm;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    cleanup();
    teardownStore(store);
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('shows what is typed immediately but updates the store only after the debounce', () => {
    renderBar();

    type('phone');

    expect(input().props.value).toBe('phone');
    wait(SEARCH_DEBOUNCE_MS - 1);
    expect(storedTerm()).toBe('');

    wait(1);
    expect(storedTerm()).toBe('phone');
  });

  it('dispatches once for a burst of keystrokes', () => {
    const dispatch = jest.spyOn(store, 'dispatch');
    renderBar();

    for (const text of ['p', 'ph', 'pho', 'phon', 'phone']) {
      type(text);
      wait(100);
    }
    wait(SEARCH_DEBOUNCE_MS);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(storedTerm()).toBe('phone');
  });

  it('does not dispatch on mount or when the term already matches', () => {
    const dispatch = jest.spyOn(store, 'dispatch');

    renderBar();
    wait(SEARCH_DEBOUNCE_MS * 2);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('starts with the term already in the store', () => {
    store.dispatch(setSearchTerm('lamp'));

    renderBar();

    expect(input().props.value).toBe('lamp');
  });

  it('keeps what the user typed when the earlier term reaches the store', () => {
    renderBar();
    type('ab');
    wait(SEARCH_DEBOUNCE_MS);

    type('abc');

    expect(input().props.value).toBe('abc');
    expect(storedTerm()).toBe('ab');

    wait(SEARCH_DEBOUNCE_MS);
    expect(storedTerm()).toBe('abc');
  });

  it('offers a clear button only when there is text', () => {
    renderBar();
    expect(screen.queryByLabelText('Clear search')).not.toBeOnTheScreen();

    type('x');

    expect(screen.getByLabelText('Clear search')).toBeOnTheScreen();
  });

  it('clears the input and the store at once with the clear button', () => {
    renderBar();
    type('phone');
    wait(SEARCH_DEBOUNCE_MS);

    fireEvent.press(screen.getByLabelText('Clear search'));

    expect(input().props.value).toBe('');
    expect(storedTerm()).toBe('');
    wait(SEARCH_DEBOUNCE_MS * 2);
    expect(storedTerm()).toBe('');
  });

  it('follows the store when the term is cleared elsewhere, without pushing it back', () => {
    renderBar();
    type('phone');
    wait(SEARCH_DEBOUNCE_MS);

    act(() => {
      store.dispatch(clearFilters());
    });

    expect(input().props.value).toBe('');
    wait(SEARCH_DEBOUNCE_MS * 2);
    expect(storedTerm()).toBe('');
  });
});

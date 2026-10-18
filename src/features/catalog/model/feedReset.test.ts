import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { networkReducer } from '@features/connectivity';
import { catalogReducer } from '@features/catalog/model/catalogSlice';
import { registerFeedReset } from '@features/catalog/model/feedReset';
import {
  clearFilters,
  filtersReducer,
  setCategory,
  setMaxPrice,
  setMinRating,
  setSearchTerm,
  setSortBy,
  type FiltersState,
} from '@features/catalog/model/filtersSlice';
import { makeCatalogState } from '@features/catalog/testing/testStore';

const defaults: FiltersState = {
  searchTerm: '',
  categorySlug: null,
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

const makeStore = (searchTerm = '', isOnline = true) => {
  const listener = createListenerMiddleware();
  registerFeedReset(listener);

  return configureStore({
    reducer: {
      catalog: catalogReducer,
      filters: filtersReducer,
      network: networkReducer,
    },
    preloadedState: {
      catalog: makeCatalogState([1, 2, 3], 50),
      filters: { ...defaults, searchTerm },
      network: { isOnline, isInternetReachable: isOnline },
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().prepend(listener.middleware),
  });
};

describe('registerFeedReset', () => {
  it('keeps the feed when the category changes while offline', () => {
    const store = makeStore('', false);

    store.dispatch(setCategory('beauty'));

    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);
    expect(store.getState().catalog.total).toBe(50);
  });

  it('keeps the feed when the search term changes while offline', () => {
    const store = makeStore('', false);

    store.dispatch(setSearchTerm('phone'));

    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);
  });

  it('empties the feed when the search term changes', () => {
    const store = makeStore();

    store.dispatch(setSearchTerm('phone'));

    expect(store.getState().catalog.feedIds).toEqual([]);
    expect(store.getState().catalog.total).toBe(0);
  });

  it('empties the feed when the category changes', () => {
    const store = makeStore();

    store.dispatch(setCategory('beauty'));

    expect(store.getState().catalog.feedIds).toEqual([]);
  });

  it('keeps the loaded products cached while the feed is replaced', () => {
    const store = makeStore();

    store.dispatch(setSearchTerm('phone'));

    expect(store.getState().catalog.ids).toEqual([1, 2, 3]);
  });

  it.each([
    ['maximum price', setMaxPrice(10)],
    ['minimum rating', setMinRating(4)],
    ['sort order', setSortBy('price-asc')],
  ])('keeps the feed when only the %s changes', (_, action) => {
    const store = makeStore();

    store.dispatch(action);

    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);
  });

  it('keeps the feed when the search term is set to the value it already has', () => {
    const store = makeStore();
    store.dispatch(setSearchTerm(''));

    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);
  });

  it('keeps the feed when clearing filters that never affected the query', () => {
    const store = makeStore();
    store.dispatch(setMaxPrice(10));

    store.dispatch(clearFilters());

    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);
  });

  it('empties the feed when clearing a search term', () => {
    const store = makeStore('phone');
    expect(store.getState().catalog.feedIds).toEqual([1, 2, 3]);

    store.dispatch(clearFilters());

    expect(store.getState().filters.searchTerm).toBe('');
    expect(store.getState().catalog.feedIds).toEqual([]);
  });
});

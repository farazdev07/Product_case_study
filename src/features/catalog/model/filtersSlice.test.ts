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

const defaults: FiltersState = {
  searchTerm: '',
  categorySlug: null,
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

const reduce = (...actions: Parameters<typeof filtersReducer>[1][]) =>
  actions.reduce(filtersReducer, defaults);

describe('filtersSlice', () => {
  it('starts with no filters applied', () => {
    expect(filtersReducer(undefined, { type: 'init' })).toEqual(defaults);
  });

  it('sets the search term', () => {
    expect(reduce(setSearchTerm('phone')).searchTerm).toBe('phone');
  });

  it('sets and clears the category', () => {
    const selected = reduce(setCategory('beauty'));
    expect(selected.categorySlug).toBe('beauty');
    expect(filtersReducer(selected, setCategory(null)).categorySlug).toBeNull();
  });

  it('sets and clears the maximum price', () => {
    const limited = reduce(setMaxPrice(50));
    expect(limited.maxPrice).toBe(50);
    expect(filtersReducer(limited, setMaxPrice(null)).maxPrice).toBeNull();
  });

  it('sets and clears the minimum rating', () => {
    const limited = reduce(setMinRating(4));
    expect(limited.minRating).toBe(4);
    expect(filtersReducer(limited, setMinRating(null)).minRating).toBeNull();
  });

  it.each(['price-asc', 'price-desc', 'rating-desc', 'default'] as const)(
    'sets the sort order to %s',
    sortBy => {
      expect(reduce(setSortBy(sortBy)).sortBy).toBe(sortBy);
    },
  );

  it('changes one filter without touching the others', () => {
    const state = reduce(
      setSearchTerm('a'),
      setMaxPrice(10),
      setSortBy('price-asc'),
    );

    expect(state).toEqual({
      ...defaults,
      searchTerm: 'a',
      maxPrice: 10,
      sortBy: 'price-asc',
    });
  });

  it('clears every filter at once', () => {
    const state = reduce(
      setSearchTerm('a'),
      setCategory('beauty'),
      setMaxPrice(10),
      setMinRating(3),
      setSortBy('rating-desc'),
      clearFilters(),
    );

    expect(state).toEqual(defaults);
  });
});

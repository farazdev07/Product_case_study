import type { CatalogRootState } from '@features/catalog/model/catalogSlice';
import type {
  FiltersRootState,
  FiltersState,
} from '@features/catalog/model/filtersSlice';
import { selectVisibleProducts } from '@features/catalog/model/selectors';
import type { Product } from '@features/catalog/model/types';
import {
  makeCatalogState,
  makeProduct,
} from '@features/catalog/testing/testStore';

const defaults: FiltersState = {
  searchTerm: '',
  categorySlug: null,
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

const product = (id: number, overrides: Partial<Product>): Product => ({
  ...makeProduct(id),
  ...overrides,
});

const stateOf = (
  products: Product[],
  filters: Partial<FiltersState> = {},
): CatalogRootState & FiltersRootState => ({
  catalog: {
    ...makeCatalogState(products.map(item => item.id)),
    entities: Object.fromEntries(products.map(item => [item.id, item])),
  },
  filters: { ...defaults, ...filters },
});

const idsOf = (state: CatalogRootState & FiltersRootState) =>
  selectVisibleProducts(state).map(item => item.id);

const catalogue = [
  product(1, { price: 50, rating: 4.5, category: 'beauty' }),
  product(2, { price: 10, rating: 3.0, category: 'beauty' }),
  product(3, { price: 30, rating: 4.9, category: 'laptops' }),
  product(4, { price: 20, rating: 2.0, category: 'laptops' }),
];

describe('selectVisibleProducts', () => {
  it('returns the feed in order when no filter is set', () => {
    expect(idsOf(stateOf(catalogue))).toEqual([1, 2, 3, 4]);
  });

  describe('max price', () => {
    it('drops products above the limit', () => {
      expect(idsOf(stateOf(catalogue, { maxPrice: 30 }))).toEqual([2, 3, 4]);
    });

    it('keeps a product priced exactly at the limit', () => {
      expect(idsOf(stateOf(catalogue, { maxPrice: 10 }))).toEqual([2]);
    });

    it('can leave nothing', () => {
      expect(idsOf(stateOf(catalogue, { maxPrice: 5 }))).toEqual([]);
    });
  });

  describe('min rating', () => {
    it('drops products below the threshold', () => {
      expect(idsOf(stateOf(catalogue, { minRating: 4 }))).toEqual([1, 3]);
    });

    it('keeps a product rated exactly at the threshold', () => {
      expect(idsOf(stateOf(catalogue, { minRating: 3 }))).toEqual([1, 2, 3]);
    });
  });

  describe('category', () => {
    it('is left to the server when there is no search', () => {
      expect(idsOf(stateOf(catalogue, { categorySlug: 'beauty' }))).toEqual([
        1, 2, 3, 4,
      ]);
    });

    it('is applied to the loaded results when combined with a search', () => {
      const state = stateOf(catalogue, {
        searchTerm: 'a',
        categorySlug: 'laptops',
      });

      expect(idsOf(state)).toEqual([3, 4]);
    });

    it('is ignored for a search when no category is chosen', () => {
      expect(idsOf(stateOf(catalogue, { searchTerm: 'a' }))).toEqual([
        1, 2, 3, 4,
      ]);
    });
  });

  describe('sorting', () => {
    it('sorts by price, lowest first', () => {
      expect(idsOf(stateOf(catalogue, { sortBy: 'price-asc' }))).toEqual([
        2, 4, 3, 1,
      ]);
    });

    it('sorts by price, highest first', () => {
      expect(idsOf(stateOf(catalogue, { sortBy: 'price-desc' }))).toEqual([
        1, 3, 4, 2,
      ]);
    });

    it('sorts by rating, best first', () => {
      expect(idsOf(stateOf(catalogue, { sortBy: 'rating-desc' }))).toEqual([
        3, 1, 2, 4,
      ]);
    });

    it.each([
      ['price-asc', { price: 10 }],
      ['price-desc', { price: 10 }],
      ['rating-desc', { rating: 4 }],
    ] as const)(
      'keeps feed order for ties when sorting by %s',
      (sortBy, tie) => {
        const tied = [
          product(7, tie),
          product(3, tie),
          product(9, tie),
          product(5, tie),
        ];

        expect(idsOf(stateOf(tied, { sortBy }))).toEqual([7, 3, 9, 5]);
      },
    );

    it('breaks ties by feed order while still ordering the rest', () => {
      const mixed = [
        product(1, { price: 20 }),
        product(2, { price: 10 }),
        product(3, { price: 20 }),
        product(4, { price: 10 }),
      ];

      expect(idsOf(stateOf(mixed, { sortBy: 'price-asc' }))).toEqual([
        2, 4, 1, 3,
      ]);
    });
  });

  describe('combined', () => {
    it('applies price, rating and sort together', () => {
      const state = stateOf(catalogue, {
        maxPrice: 40,
        minRating: 2.5,
        sortBy: 'price-desc',
      });

      expect(idsOf(state)).toEqual([3, 2]);
    });

    it('applies a client-side category with the other filters', () => {
      const state = stateOf(catalogue, {
        searchTerm: 'a',
        categorySlug: 'laptops',
        maxPrice: 25,
      });

      expect(idsOf(state)).toEqual([4]);
    });
  });

  describe('memoisation', () => {
    it('returns the same array for an unchanged state', () => {
      const state = stateOf(catalogue, { sortBy: 'price-asc' });

      expect(selectVisibleProducts(state)).toBe(selectVisibleProducts(state));
    });

    it('does not recompute when unrelated state changes', () => {
      const state = stateOf(catalogue, { maxPrice: 40 });
      const first = selectVisibleProducts(state);

      expect(selectVisibleProducts({ ...state })).toBe(first);
    });

    it('recomputes when a filter changes', () => {
      const state = stateOf(catalogue);
      const first = selectVisibleProducts(state);

      const next = selectVisibleProducts({
        ...state,
        filters: { ...state.filters, maxPrice: 20 },
      });

      expect(next).not.toBe(first);
    });

    it('does not reorder the feed it was given', () => {
      const state = stateOf(catalogue, { sortBy: 'price-asc' });

      selectVisibleProducts(state);

      expect(state.catalog.feedIds).toEqual([1, 2, 3, 4]);
    });
  });
});

import type { SortBy } from '@features/catalog/model/filtersSlice';

export type FilterOption<T> = { value: T; label: string };

export const SORT_OPTIONS: readonly FilterOption<SortBy>[] = [
  { value: 'default', label: 'Default' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating-desc', label: 'Top rated' },
];

// Fixed steps rather than a slider: no extra dependency, and the catalogue is
// small enough that a handful of price points covers it.
export const PRICE_OPTIONS: readonly FilterOption<number | null>[] = [
  { value: null, label: 'Any price' },
  { value: 25, label: 'Under $25' },
  { value: 50, label: 'Under $50' },
  { value: 100, label: 'Under $100' },
  { value: 500, label: 'Under $500' },
];

export const RATING_OPTIONS: readonly FilterOption<number | null>[] = [
  { value: null, label: 'Any rating' },
  { value: 3, label: '3 and up' },
  { value: 4, label: '4 and up' },
  { value: 4.5, label: '4.5 and up' },
];

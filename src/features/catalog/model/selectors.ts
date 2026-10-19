import { createSelector } from '@reduxjs/toolkit';
import {
  selectAllProducts,
  selectFeedProducts,
} from '@features/catalog/model/catalogSlice';
import { resolveFeedSource } from '@features/catalog/model/feedSource';
import {
  selectFilters,
  type SortBy,
} from '@features/catalog/model/filtersSlice';
import type { Product } from '@features/catalog/model/types';

const sortKeys: Record<
  Exclude<SortBy, 'default'>,
  (product: Product) => number
> = {
  'price-asc': product => product.price,
  'price-desc': product => -product.price,
  'rating-desc': product => -product.rating,
};

// Ties keep their feed order. The tie-break is explicit because Hermes does not
// promise a stable Array.prototype.sort, and a list that reshuffles equal items
// between renders looks like a bug.
const sortProducts = (products: Product[], sortBy: SortBy): Product[] => {
  if (sortBy === 'default') {
    return products;
  }
  const keyOf = sortKeys[sortBy];

  return products
    .map((product, index) => ({ product, index, key: keyOf(product) }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map(({ product }) => product);
};

type Criteria = {
  category: string | null;
  term: string;
  maxPrice: number | null;
  minRating: number | null;
  sortBy: SortBy;
};

const narrow = (
  products: Product[],
  { category, term, maxPrice, minRating, sortBy }: Criteria,
): Product[] =>
  sortProducts(
    products.filter(
      product =>
        (category === null || product.category === category) &&
        (term === '' || product.title.toLowerCase().includes(term)) &&
        (maxPrice === null || product.price <= maxPrice) &&
        (minRating === null || product.rating >= minRating),
    ),
    sortBy,
  );

// Price and rating filter only the pages loaded so far: the API has no such
// parameters, so unfetched pages are not considered until the user scrolls to
// them. The same holds for a category chosen during a search.
export const selectVisibleProducts = createSelector(
  [selectFeedProducts, selectFilters],
  (products, filters) =>
    narrow(products, {
      // With no search the category endpoint has already narrowed the feed on
      // the server; only a category combined with a search is left to the client.
      category:
        resolveFeedSource(filters).kind === 'search'
          ? filters.categorySlug
          : null,
      term: '',
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      sortBy: filters.sortBy,
    }),
);

// Offline there is no server to narrow anything, so every filter is applied to
// the whole cache instead of to the feed that happened to be loaded for the
// previous filter. The search term is matched against titles only, which only
// approximates the server's search; it exists so a typed term never shows
// products that do not match it.
export const selectCachedProducts = createSelector(
  [selectAllProducts, selectFilters],
  (products, filters) =>
    narrow(products, {
      category: filters.categorySlug,
      term: filters.searchTerm.trim().toLowerCase(),
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      sortBy: filters.sortBy,
    }),
);

import { createSelector } from '@reduxjs/toolkit';
import { selectFeedProducts } from '@features/catalog/model/catalogSlice';
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

// Price and rating filter only the pages loaded so far. The API has no price or
// rating parameters, so narrowing to "under $20" cannot ask the server for more
// matches: products on pages that were never fetched are not considered, and
// scrolling to load further pages can add more. The same holds for a category
// chosen during a search, which dummyjson cannot combine with the search.
export const selectVisibleProducts = createSelector(
  [selectFeedProducts, selectFilters],
  (products, filters) => {
    const { maxPrice, minRating, sortBy } = filters;
    // With no search the category endpoint has already narrowed the feed on the
    // server; only a category combined with a search is left to the client.
    const category =
      resolveFeedSource(filters).kind === 'search'
        ? filters.categorySlug
        : null;

    const matching = products.filter(
      product =>
        (category === null || product.category === category) &&
        (maxPrice === null || product.price <= maxPrice) &&
        (minRating === null || product.rating >= minRating),
    );

    return sortProducts(matching, sortBy);
  },
);

import type { FiltersState } from '@features/catalog/model/filtersSlice';

export type FeedSource =
  | { kind: 'all' }
  | { kind: 'search'; term: string }
  | { kind: 'category'; slug: string };

// A feed is identified by the query that produced it. The slice stores this key
// beside the feed so a feed is only shown for the source it belongs to, and so a
// late page from a superseded query cannot be appended to the current feed.
export const feedKeys = {
  all: 'all',
  search: (term: string) => `search:${term}`,
  category: (slug: string) => `category:${slug}`,
} as const;

export const feedKeyOf = (source: FeedSource): string => {
  switch (source.kind) {
    case 'search':
      return feedKeys.search(source.term);
    case 'category':
      return feedKeys.category(source.slug);
    case 'all':
      return feedKeys.all;
  }
};

// dummyjson cannot combine a text search with a category in one request: the
// search endpoint ignores categories and the category endpoint ignores text.
// When both are set, the search runs on the server and the category is applied
// afterwards to the loaded results (see selectors.ts), so a category chosen
// during a search narrows only what the search has already returned.
export const resolveFeedSource = ({
  searchTerm,
  categorySlug,
}: Pick<FiltersState, 'searchTerm' | 'categorySlug'>): FeedSource => {
  const term = searchTerm.trim();

  if (term !== '') {
    return { kind: 'search', term };
  }
  if (categorySlug !== null) {
    return { kind: 'category', slug: categorySlug };
  }
  return { kind: 'all' };
};

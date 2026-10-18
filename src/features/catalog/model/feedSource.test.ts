import {
  feedKeyOf,
  feedKeys,
  resolveFeedSource,
} from '@features/catalog/model/feedSource';

describe('resolveFeedSource', () => {
  it('lists everything when no search or category is set', () => {
    expect(resolveFeedSource({ searchTerm: '', categorySlug: null })).toEqual({
      kind: 'all',
    });
  });

  it('searches when a term is set', () => {
    expect(
      resolveFeedSource({ searchTerm: 'phone', categorySlug: null }),
    ).toEqual({ kind: 'search', term: 'phone' });
  });

  it('uses the category endpoint when only a category is set', () => {
    expect(
      resolveFeedSource({ searchTerm: '', categorySlug: 'beauty' }),
    ).toEqual({ kind: 'category', slug: 'beauty' });
  });

  it('searches on the server when both are set, leaving the category to the client', () => {
    expect(
      resolveFeedSource({ searchTerm: 'phone', categorySlug: 'beauty' }),
    ).toEqual({ kind: 'search', term: 'phone' });
  });

  it('ignores a term that is only whitespace', () => {
    expect(
      resolveFeedSource({ searchTerm: '   ', categorySlug: 'beauty' }),
    ).toEqual({ kind: 'category', slug: 'beauty' });
  });

  it('trims the term it searches for', () => {
    expect(
      resolveFeedSource({ searchTerm: '  phone ', categorySlug: null }),
    ).toEqual({ kind: 'search', term: 'phone' });
  });
});

describe('feedKeyOf', () => {
  it.each([
    [{ kind: 'all' }, 'all'],
    [{ kind: 'search', term: 'phone' }, 'search:phone'],
    [{ kind: 'category', slug: 'beauty' }, 'category:beauty'],
  ] as const)('keys %j as %s', (source, key) => {
    expect(feedKeyOf(source)).toBe(key);
  });

  it('agrees with the keys the slice builds from a response', () => {
    expect(feedKeyOf({ kind: 'search', term: 'x' })).toBe(feedKeys.search('x'));
    expect(feedKeyOf({ kind: 'category', slug: 'y' })).toBe(
      feedKeys.category('y'),
    );
  });
});

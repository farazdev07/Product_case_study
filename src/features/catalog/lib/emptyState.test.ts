import {
  getEmptyState,
  isNetworkError,
} from '@features/catalog/lib/emptyState';

const idle = {
  isFetching: false,
  isError: false,
  isNetworkError: false,
  hasMore: false,
  isOffline: false,
  hasCache: false,
  searchTerm: '',
  hasActiveFilters: false,
};

describe('getEmptyState', () => {
  it('is loading while a request is in flight', () => {
    expect(getEmptyState({ ...idle, isFetching: true })).toEqual({
      kind: 'loading',
    });
  });

  it('prefers loading over a previous error', () => {
    expect(getEmptyState({ ...idle, isFetching: true, isError: true })).toEqual(
      { kind: 'loading' },
    );
  });

  it('says the device is offline when the request never reached the server', () => {
    expect(
      getEmptyState({ ...idle, isError: true, isNetworkError: true }),
    ).toEqual({ kind: 'offline', filtered: false });
  });

  it('notes when the offline request was a search or filter', () => {
    expect(
      getEmptyState({
        ...idle,
        isError: true,
        isNetworkError: true,
        hasActiveFilters: true,
      }),
    ).toEqual({ kind: 'offline', filtered: true });
  });

  it('says offline when there is nothing cached to show', () => {
    expect(getEmptyState({ ...idle, isOffline: true })).toEqual({
      kind: 'offline',
      filtered: false,
    });
  });

  it('reports no matches, not a lost connection, when the cache has none', () => {
    expect(
      getEmptyState({
        ...idle,
        isOffline: true,
        hasCache: true,
        hasActiveFilters: true,
        searchTerm: 'zzz',
      }),
    ).toEqual({ kind: 'no-results', searchTerm: 'zzz' });
  });

  it('reports a server failure as a plain error', () => {
    expect(getEmptyState({ ...idle, isError: true })).toEqual({
      kind: 'error',
    });
  });

  it('does not claim there are no results while unloaded pages remain', () => {
    expect(
      getEmptyState({ ...idle, hasMore: true, hasActiveFilters: true }),
    ).toEqual({ kind: 'unloaded-matches' });
  });

  it('reports no results for a search, with the trimmed term', () => {
    expect(
      getEmptyState({ ...idle, searchTerm: ' zzz ', hasActiveFilters: true }),
    ).toEqual({ kind: 'no-results', searchTerm: 'zzz' });
  });

  it('reports no results for filters without a search', () => {
    expect(getEmptyState({ ...idle, hasActiveFilters: true })).toEqual({
      kind: 'no-results',
      searchTerm: '',
    });
  });

  it('is plainly empty with no filters', () => {
    expect(getEmptyState(idle)).toEqual({ kind: 'empty' });
  });
});

describe('isNetworkError', () => {
  it.each([
    [{ status: 'FETCH_ERROR', error: 'TypeError' }, true],
    [{ status: 500, data: {} }, false],
    [{ status: 'PARSING_ERROR' }, false],
    [{ message: 'serialised' }, false],
    [undefined, false],
    [null, false],
    ['FETCH_ERROR', false],
  ])('classifies %j as %s', (error, expected) => {
    expect(isNetworkError(error)).toBe(expected);
  });
});

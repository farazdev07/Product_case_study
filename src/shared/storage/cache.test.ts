import { createCacheEntry, isStale } from '@shared/storage/cache';

const NOW = 1_700_000_000_000;
const TTL_MS = 60_000;

describe('cache', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCacheEntry', () => {
    it('wraps the data with the current time', () => {
      expect(createCacheEntry({ id: 1 })).toEqual({
        data: { id: 1 },
        cachedAt: NOW,
      });
    });
  });

  describe('isStale', () => {
    const entryAged = (ageMs: number) => ({
      data: null,
      cachedAt: NOW - ageMs,
    });

    it('is fresh when younger than the ttl', () => {
      expect(isStale(entryAged(TTL_MS - 1), TTL_MS)).toBe(false);
    });

    it('is stale when age equals the ttl', () => {
      expect(isStale(entryAged(TTL_MS), TTL_MS)).toBe(true);
    });

    it('is stale when older than the ttl', () => {
      expect(isStale(entryAged(TTL_MS + 1), TTL_MS)).toBe(true);
    });

    it('is fresh when just created', () => {
      expect(isStale(createCacheEntry('x'), TTL_MS)).toBe(false);
    });
  });
});

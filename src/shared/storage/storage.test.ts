import { MMKV } from 'react-native-mmkv';
import * as logger from '@shared/lib/logger';
import { storage } from '@shared/storage/storage';

describe('storage', () => {
  beforeEach(() => {
    storage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('round-trips an object', () => {
    const value = { id: 1, title: 'Phone', tags: ['a', 'b'] };

    storage.set('product', value);

    expect(storage.get('product')).toEqual(value);
  });

  it('round-trips an array', () => {
    storage.set('ids', [3, 1, 2]);

    expect(storage.get<number[]>('ids')).toEqual([3, 1, 2]);
  });

  it('returns null for a missing key', () => {
    expect(storage.get('missing')).toBeNull();
  });

  it('returns null and warns instead of throwing on corrupt JSON', () => {
    jest.spyOn(MMKV.prototype, 'getString').mockReturnValue('{not json');
    const warn = jest.spyOn(logger, 'devWarn').mockImplementation(() => {});

    expect(storage.get('corrupt')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('removes a single key and leaves the others', () => {
    storage.set('a', 1);
    storage.set('b', 2);

    storage.remove('a');

    expect(storage.get('a')).toBeNull();
    expect(storage.get('b')).toBe(2);
  });

  it('clears every key', () => {
    storage.set('a', 1);
    storage.set('b', 2);

    storage.clear();

    expect(storage.get('a')).toBeNull();
    expect(storage.get('b')).toBeNull();
  });
});

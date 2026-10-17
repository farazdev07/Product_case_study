import { MMKV } from 'react-native-mmkv';
import { devWarn } from '@shared/lib/logger';

export interface KeyValueStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

const mmkv = new MMKV({ id: 'product-catalog' });

export const storage: KeyValueStorage = {
  get<T>(key: string): T | null {
    const raw = mmkv.getString(key);
    if (raw === undefined) {
      return null;
    }

    // Cached data is disposable. A value that no longer parses (interrupted
    // write, schema change between releases) must degrade to a cache miss
    // instead of crashing the app on launch.
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      devWarn(`storage: discarding unparseable value for "${key}"`, error);
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    mmkv.set(key, JSON.stringify(value));
  },

  remove(key: string): void {
    mmkv.delete(key);
  },

  clear(): void {
    mmkv.clearAll();
  },
};

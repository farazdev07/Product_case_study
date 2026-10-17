// Virtual until the packages are installed; the factories replace the native
// modules, which cannot load under Node.
type StoredValue = string | number | boolean;

jest.mock(
  'react-native-mmkv',
  () => {
    class MMKV {
      private readonly store = new Map<string, StoredValue>();

      set(key: string, value: StoredValue): void {
        this.store.set(key, value);
      }

      getString(key: string): string | undefined {
        const value = this.store.get(key);
        return typeof value === 'string' ? value : undefined;
      }

      getNumber(key: string): number | undefined {
        const value = this.store.get(key);
        return typeof value === 'number' ? value : undefined;
      }

      getBoolean(key: string): boolean | undefined {
        const value = this.store.get(key);
        return typeof value === 'boolean' ? value : undefined;
      }

      contains(key: string): boolean {
        return this.store.has(key);
      }

      delete(key: string): void {
        this.store.delete(key);
      }

      getAllKeys(): string[] {
        return [...this.store.keys()];
      }

      clearAll(): void {
        this.store.clear();
      }
    }

    return { MMKV };
  },
  { virtual: true },
);

jest.mock(
  '@react-native-community/netinfo',
  () => {
    const online = { isConnected: true, isInternetReachable: true };
    const netInfo = {
      addEventListener: jest.fn(() => jest.fn()),
      fetch: jest.fn(() => Promise.resolve(online)),
      useNetInfo: jest.fn(() => online),
    };

    return { __esModule: true, default: netInfo, ...netInfo };
  },
  { virtual: true },
);

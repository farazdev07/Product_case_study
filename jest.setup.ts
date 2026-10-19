import TurboImage from 'react-native-turbo-image';

type StoredValue = string | number | boolean;

// The factories replace native modules, which cannot load under Node.
jest.mock('react-native-mmkv', () => {
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
});

jest.mock('@react-native-community/netinfo', () => {
  const online = { isConnected: true, isInternetReachable: true };
  const netInfo = {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve(online)),
    useNetInfo: jest.fn(() => online),
  };

  return { __esModule: true, default: netInfo, ...netInfo };
});

// SafeAreaProvider renders nothing until the native side reports insets.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// The native image view cannot load under Node. The stand-in renders a plain
// View, so props such as `source` and `style` stay inspectable, and its
// prefetch resolves like the real one.
jest.mock('react-native-turbo-image', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockTurboImage = (props: object) => createElement(View, props);
  MockTurboImage.prefetch = jest.fn();
  return { __esModule: true, default: MockTurboImage };
});

beforeEach(() => {
  jest.mocked(TurboImage.prefetch).mockResolvedValue(true);
});

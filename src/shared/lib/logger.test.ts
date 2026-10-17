import { devError, devLog, devWarn } from '@shared/lib/logger';

const cases = [
  ['devLog', devLog, 'log'],
  ['devWarn', devWarn, 'warn'],
  ['devError', devError, 'error'],
] as const;

// React Native declares __DEV__ as a const; the runtime global is writable.
const setDev = (value: boolean): void => {
  Object.assign(globalThis, { __DEV__: value });
};

describe('logger', () => {
  const originalDev = __DEV__;

  afterEach(() => {
    setDev(originalDev);
    jest.restoreAllMocks();
  });

  it.each(cases)('%s writes to the console in development', (_, fn, method) => {
    setDev(true);
    const spy = jest.spyOn(console, method).mockImplementation(() => {});

    fn('message', 42);

    expect(spy).toHaveBeenCalledWith('message', 42);
  });

  it.each(cases)('%s is silent in production', (_, fn, method) => {
    setDev(false);
    const spy = jest.spyOn(console, method).mockImplementation(() => {});

    fn('message', 42);

    expect(spy).not.toHaveBeenCalled();
  });
});

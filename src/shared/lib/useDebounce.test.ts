import { act, renderHook } from '@testing-library/react-native';
import { useDebounce } from '@shared/lib/useDebounce';

jest.useFakeTimers();

const setup = <T>(initial: T, delayMs = 300) =>
  renderHook(({ value }: { value: T }) => useDebounce(value, delayMs), {
    initialProps: { value: initial },
  });

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = setup('a');

    expect(result.current).toBe('a');
  });

  it('holds the old value until the delay has passed', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(299));

    expect(result.current).toBe('a');

    act(() => jest.advanceTimersByTime(1));

    expect(result.current).toBe('b');
  });

  it('collapses rapid changes into the last value', () => {
    const { result, rerender } = setup('');

    for (const value of ['h', 'he', 'hel', 'hell', 'hello']) {
      rerender({ value });
      act(() => jest.advanceTimersByTime(100));
    }
    expect(result.current).toBe('');

    act(() => jest.advanceTimersByTime(300));

    expect(result.current).toBe('hello');
  });

  it('restarts the delay on every change', () => {
    const { result, rerender } = setup('a');

    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(250));
    rerender({ value: 'c' });
    act(() => jest.advanceTimersByTime(250));

    expect(result.current).toBe('a');

    act(() => jest.advanceTimersByTime(50));

    expect(result.current).toBe('c');
  });

  it('cancels the pending update when unmounted', () => {
    const baseline = jest.getTimerCount();
    const { rerender, unmount } = setup('a');
    rerender({ value: 'b' });
    expect(jest.getTimerCount()).toBeGreaterThan(baseline);

    unmount();

    expect(jest.getTimerCount()).toBe(baseline);
  });

  it('works with non-string values', () => {
    const { result, rerender } = setup(1, 100);

    rerender({ value: 2 });
    act(() => jest.advanceTimersByTime(100));

    expect(result.current).toBe(2);
  });
});

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Each change cancels the pending update, so a burst of changes yields one.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

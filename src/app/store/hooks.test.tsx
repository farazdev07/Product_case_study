import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import { store } from '@app/store';
import { useAppDispatch, useAppSelector } from '@app/store/hooks';

const wrapper = ({ children }: PropsWithChildren) => (
  <Provider store={store}>{children}</Provider>
);

describe('store hooks', () => {
  it('useAppSelector reads from the store', () => {
    const { result } = renderHook(() => useAppSelector(state => state.api), {
      wrapper,
    });

    expect(result.current).toBe(store.getState().api);
  });

  it('useAppDispatch returns the store dispatch', () => {
    const { result } = renderHook(() => useAppDispatch(), { wrapper });

    expect(result.current).toBe(store.dispatch);
  });
});

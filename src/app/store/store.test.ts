import { listenerMiddleware, store } from '@app/store';

describe('store', () => {
  it('mounts the api reducer', () => {
    expect(store.getState()).toHaveProperty('api');
  });

  it('runs dispatched actions through the listener middleware', () => {
    const effect = jest.fn();
    const unsubscribe = listenerMiddleware.startListening({
      type: 'test/ping',
      effect,
    });

    store.dispatch({ type: 'test/ping' });
    unsubscribe();

    expect(effect).toHaveBeenCalledTimes(1);
  });
});

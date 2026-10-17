import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api/baseApi';

// Features register persistence listeners against this instance, so it is
// created here and shared rather than owned by any one feature.
export const listenerMiddleware = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

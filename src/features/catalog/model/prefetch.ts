import { isAnyOf, type ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { Image } from 'react-native';
import { catalogApi } from '@features/catalog/api/catalogApi';

const isPageFulfilled = isAnyOf(
  catalogApi.endpoints.getProducts.matchFulfilled,
  catalogApi.endpoints.searchProducts.matchFulfilled,
  catalogApi.endpoints.getProductsByCategory.matchFulfilled,
);

// Warms the platform's own HTTP image cache; it does not implement one. Each
// page's thumbnails are requested as soon as the page arrives, so they are
// already on disk (where the platform keeps them) when a row is first rendered,
// including rows the user never scrolls to before going offline.
export const registerThumbnailPrefetch = (
  listener: ListenerMiddlewareInstance,
): void => {
  listener.startListening({
    matcher: isPageFulfilled,
    effect: action => {
      for (const { thumbnail } of action.payload.products) {
        // Fire and forget: a failed warm-up costs nothing, because the image
        // is requested normally when the row renders.
        Image.prefetch(thumbnail).catch(() => undefined);
      }
    },
  });
};

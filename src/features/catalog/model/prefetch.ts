import { isAnyOf, type ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import TurboImage from 'react-native-turbo-image';
import { catalogApi } from '@features/catalog/api/catalogApi';

const isPageFulfilled = isAnyOf(
  catalogApi.endpoints.getProducts.matchFulfilled,
  catalogApi.endpoints.searchProducts.matchFulfilled,
  catalogApi.endpoints.getProductsByCategory.matchFulfilled,
);

// Warms the platform's own HTTP image cache; it does not implement one. Each
// page's images are requested as soon as the page arrives, so they are
// already on disk (where the platform keeps them) when a row is first rendered,
// including rows the user never scrolls to before going offline.
export const registerThumbnailPrefetch = (
  listener: ListenerMiddlewareInstance,
): void => {
  listener.startListening({
    matcher: isPageFulfilled,
    effect: action => {
      for (const { thumbnail, images } of action.payload.products) {
        // The list shows `thumbnail` and the detail screen shows `images[0]`,
        // which are different files, so both are warmed. A product whose first
        // image is its thumbnail is requested once.
        const urls = new Set([thumbnail, ...images.slice(0, 1)]);
        for (const url of urls) {
          // Fire and forget: a failed warm-up costs nothing, because the image
          // is requested normally when it is shown.
          TurboImage.prefetch([{ uri: url }], 'dataCache').catch(
            () => undefined,
          );
        }
      }
    },
  });
};

import * as catalog from '@features/catalog';

// Anything exported here becomes something the rest of the app can depend on.
it('exposes only the reducers, the screens, the shared row and the listener registrations', () => {
  expect(Object.keys(catalog).sort()).toEqual([
    'CatalogScreen',
    'ProductCard',
    'ProductDetailScreen',
    'catalogReducer',
    'columnsForWidth',
    'filtersReducer',
    'loadPersistedCatalog',
    'registerCatalogPersistence',
    'registerFeedReset',
    'registerThumbnailPrefetch',
    'selectProductEntities',
  ]);
});

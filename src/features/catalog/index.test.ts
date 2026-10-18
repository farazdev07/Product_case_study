import * as catalog from '@features/catalog';

// Anything exported here becomes something the rest of the app can depend on.
it('exposes only the reducers, the screens and the listener registrations', () => {
  expect(Object.keys(catalog).sort()).toEqual([
    'CatalogScreen',
    'ProductDetailScreen',
    'catalogReducer',
    'filtersReducer',
    'loadPersistedCatalog',
    'registerCatalogPersistence',
    'registerFeedReset',
  ]);
});

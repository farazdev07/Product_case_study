import * as catalog from '@features/catalog';

// Anything exported here becomes something the rest of the app can depend on.
it('exposes only the reducer, the screens and the persistence entry points', () => {
  expect(Object.keys(catalog).sort()).toEqual([
    'CatalogScreen',
    'ProductDetailScreen',
    'catalogReducer',
    'loadPersistedCatalog',
    'registerCatalogPersistence',
  ]);
});

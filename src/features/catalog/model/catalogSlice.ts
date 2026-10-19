// A hand-written normalised slice rather than a persisted RTK Query cache: RTKQ's
// cache shape is internal and its entries are evicted when subscriptions change,
// so it is not stable to rehydrate. RTKQ stays the transport; the UI reads here.
import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
import {
  catalogApi,
  type ProductsResponse,
} from '@features/catalog/api/catalogApi';
import { feedKeys } from '@features/catalog/model/feedSource';
import type { Category, Product } from '@features/catalog/model/types';

const productsAdapter = createEntityAdapter<Product>();

const initialState = productsAdapter.getInitialState({
  feedIds: [] as number[],
  feedKey: null as string | null,
  total: 0,
  lastFetchedAt: null as number | null,
  // Persisted with the products so the category chips exist on an offline
  // launch; the query only refreshes them.
  categories: [] as Category[],
});

export type CatalogState = typeof initialState;
export type CatalogRootState = { catalog: CatalogState };

type PageAction = {
  payload: ProductsResponse;
  meta: { arg: { originalArgs: { skip: number } }; fulfilledTimeStamp: number };
};

const applyPage = (
  state: CatalogState,
  { payload, meta }: PageAction,
  feedKey: string,
) => {
  productsAdapter.upsertMany(state, payload.products);
  const pageIds = payload.products.map(product => product.id);

  if (meta.arg.originalArgs.skip === 0) {
    state.feedIds = pageIds;
    state.feedKey = feedKey;
  } else if (state.feedKey === feedKey) {
    // A refetched or overlapping page must not duplicate rows in the list.
    const known = new Set(state.feedIds);
    state.feedIds.push(...pageIds.filter(id => !known.has(id)));
  } else {
    // A later page of a query that has since been replaced. Its products are
    // worth caching, but they do not belong in the current feed.
    return;
  }

  state.total = payload.total;
  state.lastFetchedAt = meta.fulfilledTimeStamp;
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    feedCleared(state) {
      state.feedIds = [];
      state.feedKey = null;
      state.total = 0;
    },
  },
  extraReducers: builder => {
    builder
      .addMatcher(
        catalogApi.endpoints.getProducts.matchFulfilled,
        (state, action) => applyPage(state, action, feedKeys.all),
      )
      .addMatcher(
        catalogApi.endpoints.searchProducts.matchFulfilled,
        (state, action) =>
          applyPage(
            state,
            action,
            feedKeys.search(action.meta.arg.originalArgs.q),
          ),
      )
      .addMatcher(
        catalogApi.endpoints.getProductsByCategory.matchFulfilled,
        (state, action) =>
          applyPage(
            state,
            action,
            feedKeys.category(action.meta.arg.originalArgs.slug),
          ),
      )
      .addMatcher(
        catalogApi.endpoints.getCategories.matchFulfilled,
        (state, { payload }) => {
          state.categories = payload;
        },
      )
      .addMatcher(
        catalogApi.endpoints.getProductById.matchFulfilled,
        (state, { payload }) => {
          productsAdapter.upsertOne(state, payload);
        },
      );
  },
});

export const { feedCleared } = catalogSlice.actions;
export const catalogReducer = catalogSlice.reducer;

const entitySelectors = productsAdapter.getSelectors<CatalogRootState>(
  state => state.catalog,
);

export const selectProductById = entitySelectors.selectById;
export const selectAllProducts = entitySelectors.selectAll;
export const selectProductEntities = entitySelectors.selectEntities;

export const selectFeedIds = (state: CatalogRootState) => state.catalog.feedIds;
export const selectFeedKey = (state: CatalogRootState) => state.catalog.feedKey;
export const selectCategories = (state: CatalogRootState) =>
  state.catalog.categories;
export const selectFeedTotal = (state: CatalogRootState) => state.catalog.total;
export const selectLastFetchedAt = (state: CatalogRootState) =>
  state.catalog.lastFetchedAt;

export const selectFeedProducts = createSelector(
  [entitySelectors.selectEntities, selectFeedIds],
  (entities, feedIds) =>
    feedIds.flatMap(id => {
      const product = entities[id];
      return product ? [product] : [];
    }),
);

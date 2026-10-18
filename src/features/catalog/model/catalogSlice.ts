// Why a hand-written normalised slice instead of persisting the RTK Query cache:
// RTKQ's internal cache shape is an implementation detail and its entries are
// evicted when subscriptions change, so it is not a stable thing to rehydrate.
// This slice is ours: products are stored once by id, the feed is an ordered
// list of ids, and its shape only changes when we change it. RTKQ remains the
// transport; the UI reads from here.
import {
  createEntityAdapter,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';
import {
  catalogApi,
  type ProductsResponse,
} from '@features/catalog/api/catalogApi';
import type { Product } from '@features/catalog/model/types';

const productsAdapter = createEntityAdapter<Product>();

const initialState = productsAdapter.getInitialState({
  feedIds: [] as number[],
  total: 0,
  lastFetchedAt: null as number | null,
});

export type CatalogState = typeof initialState;
export type CatalogRootState = { catalog: CatalogState };

type PageAction = {
  payload: ProductsResponse;
  meta: { arg: { originalArgs: { skip: number } }; fulfilledTimeStamp: number };
};

const applyPage = (state: CatalogState, { payload, meta }: PageAction) => {
  productsAdapter.upsertMany(state, payload.products);
  const pageIds = payload.products.map(product => product.id);

  if (meta.arg.originalArgs.skip === 0) {
    state.feedIds = pageIds;
  } else {
    // A refetched or overlapping page must not duplicate rows in the list.
    const known = new Set(state.feedIds);
    state.feedIds.push(...pageIds.filter(id => !known.has(id)));
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
      state.total = 0;
    },
  },
  extraReducers: builder => {
    builder
      .addMatcher(catalogApi.endpoints.getProducts.matchFulfilled, applyPage)
      .addMatcher(catalogApi.endpoints.searchProducts.matchFulfilled, applyPage)
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

export const selectFeedIds = (state: CatalogRootState) => state.catalog.feedIds;
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

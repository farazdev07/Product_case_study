import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SortBy = 'default' | 'price-asc' | 'price-desc' | 'rating-desc';

// searchTerm and categorySlug choose which endpoint feeds the list, so changing
// them replaces the feed. maxPrice, minRating and sortBy are applied to the
// products already loaded and never touch the network.
export type FiltersState = {
  searchTerm: string;
  categorySlug: string | null;
  maxPrice: number | null;
  minRating: number | null;
  sortBy: SortBy;
};

export type FiltersRootState = { filters: FiltersState };

const initialState: FiltersState = {
  searchTerm: '',
  categorySlug: null,
  maxPrice: null,
  minRating: null,
  sortBy: 'default',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    setCategory(state, action: PayloadAction<string | null>) {
      state.categorySlug = action.payload;
    },
    setMaxPrice(state, action: PayloadAction<number | null>) {
      state.maxPrice = action.payload;
    },
    setMinRating(state, action: PayloadAction<number | null>) {
      state.minRating = action.payload;
    },
    setSortBy(state, action: PayloadAction<SortBy>) {
      state.sortBy = action.payload;
    },
    clearFilters: () => initialState,
  },
});

export const {
  setSearchTerm,
  setCategory,
  setMaxPrice,
  setMinRating,
  setSortBy,
  clearFilters,
} = filtersSlice.actions;
export const filtersReducer = filtersSlice.reducer;

export const selectFilters = (state: FiltersRootState) => state.filters;

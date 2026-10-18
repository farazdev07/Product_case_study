import { baseApi } from '@shared/api/baseApi';
import type { Pagination } from '@shared/api/types';
import type { Category, Product } from '@features/catalog/model/types';

export type ProductsResponse = Pagination & { products: Product[] };

type PageArgs = { limit: number; skip: number };
type SearchArgs = PageArgs & { q: string };
type CategoryArgs = PageArgs & { slug: string };

const LIST_TAG = { type: 'Product', id: 'LIST' } as const;

// A product list invalidates per product (a detail refetch refreshes the row)
// and as a whole (a new product would change the list).
const providesProducts = (result: ProductsResponse | undefined) => [
  ...(result?.products ?? []).map(({ id }) => ({
    type: 'Product' as const,
    id,
  })),
  LIST_TAG,
];

// Endpoints are injected here, not declared in shared, so the catalog's types
// stay inside the catalog feature while the store still mounts one api slice.
export const catalogApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProducts: build.query<ProductsResponse, PageArgs>({
      query: ({ limit, skip }) => ({
        url: '/products',
        params: { limit, skip },
      }),
      providesTags: providesProducts,
    }),
    searchProducts: build.query<ProductsResponse, SearchArgs>({
      query: ({ q, limit, skip }) => ({
        url: '/products/search',
        params: { q, limit, skip },
      }),
      providesTags: providesProducts,
    }),
    getProductsByCategory: build.query<ProductsResponse, CategoryArgs>({
      query: ({ slug, limit, skip }) => ({
        url: `/products/category/${slug}`,
        params: { limit, skip },
      }),
      providesTags: providesProducts,
    }),
    getCategories: build.query<Category[], void>({
      query: () => '/products/categories',
    }),
    getProductById: build.query<Product, number>({
      query: id => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useSearchProductsQuery,
  useGetProductsByCategoryQuery,
  useGetCategoriesQuery,
  useGetProductByIdQuery,
} = catalogApi;

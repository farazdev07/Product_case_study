import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@shared/config/constants';

// Features attach their own endpoints with baseApi.injectEndpoints. The api
// instance lives here, in shared, so the store can mount one reducer and
// middleware; the endpoints do not, because they would make shared depend on
// feature types.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Product'],
  endpoints: () => ({}),
});

import { baseApi } from '@shared/api/baseApi';

describe('baseApi', () => {
  it('mounts under the api reducer path', () => {
    expect(baseApi.reducerPath).toBe('api');
  });

  it('lets features inject their own endpoints', () => {
    const extended = baseApi.injectEndpoints({
      endpoints: build => ({
        ping: build.query<string, void>({ query: () => 'ping' }),
      }),
    });

    expect(extended.endpoints.ping).toBeDefined();
  });
});

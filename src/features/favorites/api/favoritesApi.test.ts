import {
  jsonResponse,
  makeStore,
  stubFetch,
  teardownStore,
  type TestStore,
} from '@features/favorites/testing/testStore';
import { favoritesApi } from '@features/favorites/api/favoritesApi';

describe('favoritesApi', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    teardownStore(store);
    jest.restoreAllMocks();
  });

  const send = (type: 'add' | 'remove') =>
    store.dispatch(
      favoritesApi.endpoints.syncFavorite.initiate(
        { productId: 12, type },
        { track: false },
      ),
    );

  it.each([
    ['add', true],
    ['remove', false],
  ] as const)('sends a %s as PUT /products/{id}', async (type, favorite) => {
    const handler = jest.fn((_request: Request) => jsonResponse({ id: 12 }));
    stubFetch(handler);

    await send(type);

    const request = handler.mock.calls[0]![0];
    expect(request.method).toBe('PUT');
    expect(new URL(request.url).pathname).toBe('/products/12');
    expect(await request.json()).toEqual({ favorite });
  });

  it('rejects when the server answers with an error', async () => {
    stubFetch(() => jsonResponse({ message: 'nope' }, 500));

    const result = await send('add').then(
      response => response,
      () => undefined,
    );

    expect(result).toMatchObject({ error: { status: 500 } });
  });
});

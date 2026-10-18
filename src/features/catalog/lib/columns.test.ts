import { columnsForWidth } from '@features/catalog/lib/columns';

describe('columnsForWidth', () => {
  it.each([
    [320, 1],
    [430, 1],
    [767, 1],
    [768, 2],
    [834, 2],
    [1032, 2],
    [1099, 2],
    [1100, 3],
    [1376, 3],
  ])('uses the right column count for a %i point window', (width, columns) => {
    expect(columnsForWidth(width)).toBe(columns);
  });
});

import { formatCategory, formatPrice } from '@features/catalog/lib/format';

describe('format', () => {
  it.each([
    [9.99, '$9.99'],
    [10, '$10.00'],
    [0.5, '$0.50'],
  ])('formats %s as a price', (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });

  it.each([
    ['beauty', 'Beauty'],
    ['mens-shirts', 'Mens shirts'],
    ['mobile-accessories', 'Mobile accessories'],
  ])('humanises the category slug %s', (slug, expected) => {
    expect(formatCategory(slug)).toBe(expected);
  });
});

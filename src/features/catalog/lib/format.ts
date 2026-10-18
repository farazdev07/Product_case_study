export const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

// The API uses slugs such as "mens-shirts"; the category names endpoint is only
// needed once filtering exists.
export const formatCategory = (slug: string): string => {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

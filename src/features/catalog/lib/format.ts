export const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

export const formatCategory = (slug: string): string => {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

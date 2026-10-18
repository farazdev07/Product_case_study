// Modelled from the live responses of /products and /products/categories. Only
// the fields the app reads are typed; the API returns many more (reviews, meta,
// dimensions, ...) and typing them would imply the app depends on them.
export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  // Absent on roughly half of the catalogue.
  brand?: string;
  thumbnail: string;
  images: string[];
};

export type Category = {
  slug: string;
  name: string;
};

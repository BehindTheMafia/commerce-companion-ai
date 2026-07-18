export type Business = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  whatsapp_phone: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  category: { name: string; slug: string } | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  whatsapp_phone: string | null;
  settings?: StoreSettings | null;
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
  pricing_modes?: PricingMode[] | null;
  variants?: ProductVariant[] | null;
};

export type PricingMode = {
  id: string;
  name: string;
  price: number;
  minimumQuantity: number;
  badge: string | null;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  name: string;
  type: string;
  values: ProductVariantValue[];
};

export type ProductVariantValue = {
  id: string;
  label: string;
  value: string;
  image_url: string | null;
  available: boolean;
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

export type ProductBenefit = {
  icon: string;
  label: string;
  enabled: boolean;
};

export type StoreSettings = {
  announcement: { enabled: boolean; text: string | null };
  shipping: { enabled: boolean; banner_text: string | null; free_threshold: number | null };
  reviews: { enabled: boolean };
  wishlist: { enabled: boolean };
  recommendations: { enabled: boolean; title: string | null };
  benefits: ProductBenefit[];
  social_links: { instagram: string | null; facebook: string | null; twitter: string | null };
  pricing: { enabled: boolean };
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  announcement: { enabled: false, text: null },
  shipping: { enabled: false, banner_text: null, free_threshold: null },
  reviews: { enabled: false },
  wishlist: { enabled: false },
  recommendations: { enabled: true, title: "Completa tu Pedido" },
  benefits: [],
  social_links: { instagram: null, facebook: null, twitter: null },
  pricing: { enabled: false },
};

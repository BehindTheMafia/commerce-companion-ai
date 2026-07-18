export function isNewProduct(createdAt: string): boolean {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > weekAgo;
}

export function hasSalePrice(price: number, salePrice: number | null): boolean {
  return salePrice != null && salePrice < price;
}

export function getDisplayPrice(price: number, salePrice: number | null): number {
  return hasSalePrice(price, salePrice) ? salePrice! : price;
}

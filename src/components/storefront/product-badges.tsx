import { isNewProduct, hasSalePrice } from "@/lib/product";

type ProductBadgesProps = {
  createdAt: string;
  price: number;
  salePrice: number | null;
};

export function ProductBadges({ createdAt, price, salePrice }: ProductBadgesProps) {
  const showNew = isNewProduct(createdAt);
  const onSale = hasSalePrice(price, salePrice);

  if (!showNew && !onSale) return null;

  return (
    <>
      {showNew && (
        <span className="rounded-lg bg-background/90 backdrop-blur-md text-foreground border border-border/40 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold shadow-sm">
          Nuevo
        </span>
      )}
      {onSale && (
        <span className="rounded-lg bg-destructive/90 backdrop-blur-md text-white px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold shadow-sm">
          Oferta
        </span>
      )}
    </>
  );
}

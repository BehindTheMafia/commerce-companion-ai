import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNewProduct, hasSalePrice, getDisplayPrice } from "@/lib/product";
import type { Product } from "@/types/storefront";

type ProductCardProps = {
  product: Product;
  currencySymbol: string;
  storeSlug: string;
};

export function ProductCard({ product, currencySymbol: $, storeSlug }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const onSale = hasSalePrice(product.price, product.sale_price);
  const displayPrice = getDisplayPrice(product.price, product.sale_price);
  const showNewBadge = isNewProduct(product.created_at);

  return (
    <Link
      to="/go/$slug/product/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className="group flex flex-col text-left cursor-pointer focus:outline-none rounded-2xl outline-none"
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted/50 mb-4 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-black/5 group-hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
        {product.image_url && !imgError ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 bg-muted/60 animate-pulse" />}
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "size-full object-cover transition-all duration-700 ease-out",
                imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                "group-hover:scale-105",
              )}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/20" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {showNewBadge && (
            <span className="rounded-md bg-background/90 backdrop-blur-md text-foreground border border-border/50 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold shadow-sm">
              Nuevo
            </span>
          )}
          {onSale && (
            <span className="rounded-md bg-destructive/90 backdrop-blur-md text-destructive-foreground px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold shadow-sm">
              Oferta
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-4">
          <div className="w-full rounded-xl bg-background/95 backdrop-blur-md py-2.5 text-center text-sm font-semibold text-foreground shadow-lg translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
            Ver detalles
          </div>
        </div>
      </div>

      <div className="px-1 flex flex-col flex-1">
        {product.category?.name && (
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            {product.category.name}
          </span>
        )}
        <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-2">
          {product.name}
        </h3>

        <div className="mt-auto flex items-center gap-2">
          <span
            className={cn("text-base font-bold", onSale ? "text-destructive" : "text-foreground")}
          >
            {$}
            {displayPrice.toFixed(2)}
          </span>
          {onSale && (
            <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
              {$}
              {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

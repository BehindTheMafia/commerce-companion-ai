import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNewProduct, hasSalePrice, getDisplayPrice } from "@/lib/product";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/types/storefront";

type ProductCardProps = {
  product: Product;
  currencySymbol: string;
  storeSlug: string;
  onQuickAdd?: () => void;
};

export function ProductCard({
  product,
  currencySymbol: $,
  storeSlug,
  onQuickAdd,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { addItem } = useCart();

  const onSale = hasSalePrice(product.price, product.sale_price);
  const displayPrice = getDisplayPrice(product.price, product.sale_price);
  const showNewBadge = isNewProduct(product.created_at);
  const discountPct =
    onSale && product.price > 0
      ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
      : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price,
        image_url: product.image_url,
        slug: product.slug,
      },
      1,
    );
    onQuickAdd?.();
  };

  return (
    <Link
      to="/go/$slug/product/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className="group flex flex-col text-left outline-none focus:outline-none"
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      <div className="relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted/50 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/5 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
        {product.image_url && !imgError ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted/60" />}
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "size-full object-cover transition-all duration-700 ease-out",
                imgLoaded ? "scale-100 opacity-100" : "scale-95 opacity-0",
                "group-hover:scale-105",
              )}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/20" strokeWidth={1} />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {showNewBadge && (
            <span className="rounded-md bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md">
              Nuevo
            </span>
          )}
          {onSale && (
            <span className="rounded-md bg-destructive/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground shadow-sm backdrop-blur-md">
              Oferta{discountPct > 0 ? ` −${discountPct}%` : ""}
            </span>
          )}
        </div>

        {onQuickAdd ? (
          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={handleQuickAdd}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground/95 py-2.5 text-sm font-semibold text-background shadow-lg backdrop-blur-sm transition-colors hover:bg-foreground active:scale-[0.98]"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Agregar
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="w-full translate-y-4 rounded-xl bg-background/95 py-2.5 text-center text-sm font-semibold text-foreground shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">
              Ver detalles
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5">
        {product.category?.name && (
          <span className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {product.category.name}
          </span>
        )}
        <h3 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {product.name}
        </h3>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "text-[15px] font-bold tabular-nums",
              onSale ? "text-destructive" : "text-foreground",
            )}
          >
            {$}
            {displayPrice.toFixed(2)}
          </span>
          {onSale && (
            <span className="text-[13px] font-normal text-muted-foreground line-through tabular-nums decoration-muted-foreground/50">
              {$}
              {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

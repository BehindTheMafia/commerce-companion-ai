import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, Plus, Check, Eye } from "lucide-react";
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
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const onSale = hasSalePrice(product.price, product.sale_price);
  const displayPrice = getDisplayPrice(product.price, product.sale_price);
  const showNewBadge = isNewProduct(product.created_at);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const discountPct =
    onSale && product.price > 0
      ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
      : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
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
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
    onQuickAdd?.();
  };

  return (
    <Link
      to="/go/$slug/product/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-white text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]",
        outOfStock && "opacity-75",
      )}
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.image_url && !imgError ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted/60" />}
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "size-full object-cover transition-all duration-500 ease-out",
                imgLoaded ? "scale-100 opacity-100" : "scale-95 opacity-0",
                "group-hover:scale-105",
                outOfStock && "grayscale",
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

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {onSale && (
            <span className="rounded-xl bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm sm:text-xs">
              {discountPct > 0 ? `−${discountPct}% OFF` : "OFERTA"}
            </span>
          )}
          {showNewBadge && (
            <span className="rounded-xl bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background shadow-sm sm:text-xs">
              Nuevo
            </span>
          )}
          {outOfStock && (
            <span className="rounded-xl bg-foreground/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background shadow-sm sm:text-xs">
              Agotado
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex translate-y-3 items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">
            <Eye className="size-4" strokeWidth={2} />
            Vista rápida
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.category?.name && (
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {product.category.name}
          </span>
        )}
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-foreground sm:text-base">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <span
              className={cn(
                "block text-lg font-bold tabular-nums sm:text-xl",
                onSale ? "text-red-500" : "text-foreground",
              )}
            >
              {$}
              {displayPrice.toFixed(2)}
            </span>
            {onSale && (
              <span className="block text-xs text-muted-foreground line-through tabular-nums decoration-muted-foreground/50">
                {$}
                {product.price.toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={handleQuickAdd}
            disabled={outOfStock}
            aria-label={outOfStock ? `${product.name} agotado` : `Agregar ${product.name}`}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl transition-all duration-200 active:scale-90",
              outOfStock
                ? "cursor-not-allowed bg-muted text-muted-foreground/60"
                : added
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted text-foreground shadow-sm hover:bg-foreground hover:text-background",
            )}
          >
            {added ? (
              <Check className="size-5" strokeWidth={2.5} />
            ) : (
              <Plus className="size-5" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}

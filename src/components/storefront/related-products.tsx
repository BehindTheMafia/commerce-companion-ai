import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { hasSalePrice, getDisplayPrice } from "@/lib/product";
import type { Product } from "@/types/storefront";

type RelatedProductsProps = {
  products: Product[];
  currencySymbol: string;
  storeSlug: string;
  title?: string;
};

export function RelatedProducts({
  products,
  currencySymbol: $,
  storeSlug,
  title = "Completa tu Pedido",
}: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-20 lg:mt-28 border-t border-border/40 pt-16">
      <div className="mb-10 flex items-end justify-between">
        <h2 className="text-xl lg:text-2xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        <Link
          to="/go/$slug"
          params={{ slug: storeSlug }}
          className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          Ver Todos
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
        {products.map((p) => {
          const onSale = hasSalePrice(p.price, p.sale_price);
          const displayPrice = getDisplayPrice(p.price, p.sale_price);

          return (
            <Link
              key={p.id}
              to="/go/$slug/product/$productSlug"
              params={{ slug: storeSlug, productSlug: p.slug }}
              className="group block"
            >
              <div className="aspect-[3/4] bg-muted/30 rounded-2xl overflow-hidden mb-3 relative">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Package className="size-8 text-muted-foreground/20" strokeWidth={1} />
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {p.name}
              </h3>
              <p className="mt-1 text-sm font-semibold">
                {onSale ? (
                  <>
                    <span className="text-destructive">
                      {$}
                      {displayPrice.toFixed(2)}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground line-through font-normal">
                      {$}
                      {p.price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-foreground">
                    {$}
                    {displayPrice.toFixed(2)}
                  </span>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

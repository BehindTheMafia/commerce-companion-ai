import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";
import { useCart, type CartProduct } from "@/lib/cart-context";
import { useBusinessQuery } from "@/hooks/use-business-query";
import { useCheckout } from "@/hooks/use-checkout";
import { useCurrency } from "@/hooks/use-currency";
import { useProductImages } from "@/hooks/use-product-images";
import { hasSalePrice, getDisplayPrice } from "@/lib/product";
import { StoreHeader } from "@/components/storefront/store-header";
import { StoreFooter } from "@/components/storefront/store-footer";
import { ProductBreadcrumbs } from "@/components/storefront/product-breadcrumbs";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductBadges } from "@/components/storefront/product-badges";
import { ProductQuantity } from "@/components/storefront/product-quantity";
import { ProductCTA } from "@/components/storefront/product-cta";
import { ProductAccordion } from "@/components/storefront/product-accordion";
import { RelatedProducts } from "@/components/storefront/related-products";
import { SkeletonProductPage } from "@/components/storefront/skeleton-product-page";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/types/storefront";

export const Route = createFileRoute("/go/$slug/product/$productSlug")({
  component: ProductDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.productSlug} | ${params.slug} — Commerce AI` },
      {
        name: "description",
        content: `Detalles del producto ${params.productSlug} en la tienda ${params.slug}.`,
      },
    ],
    links: [],
  }),
});

function ProductDetailPage() {
  const { slug, productSlug } = useParams({
    from: "/go/$slug/product/$productSlug",
  });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const { addItem, itemCount } = useCart();

  const { data: business, isLoading: bizLoading } = useBusinessQuery(slug);
  const { symbol: $ } = useCurrency(business?.currency ?? "USD");
  const { handleCheckout, busy: checkoutBusy, error: checkoutError } = useCheckout(business);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["sf-product", slug, productSlug],
    enabled: !!business,
    queryFn: async (): Promise<Product | null> => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)",
        )
        .eq("business_id", business!.id)
        .eq("slug", productSlug)
        .eq("status", "active")
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: images = [] } = useProductImages(product?.id);

  const { data: related = [] } = useQuery({
    queryKey: ["sf-related", business?.id, product?.id],
    enabled: !!business && !!product,
    queryFn: async (): Promise<Product[]> => {
      if (product?.category?.slug) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", product.category.slug)
          .eq("business_id", business!.id)
          .maybeSingle();
        if (cats?.id) {
          const { data } = await supabase
            .from("products")
            .select(
              "id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)",
            )
            .eq("business_id", business!.id)
            .eq("status", "active")
            .eq("category_id", cats.id)
            .neq("id", product!.id)
            .limit(5);
          if (data && data.length > 0) return data;
        }
      }
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)",
        )
        .eq("business_id", business!.id)
        .eq("status", "active")
        .neq("id", product!.id)
        .limit(5);
      return data ?? [];
    },
  });

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      sale_price: product.sale_price,
      image_url: product.image_url,
      slug: product.slug,
    };
    addItem(cartProduct, quantity, notes || undefined);
    toast.custom(
      (id) => (
        <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl min-w-[280px]">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{product.name}</p>
            <p className="text-[11px] opacity-60">Agregado al pedido</p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(id);
              setCartOpen(true);
            }}
            className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Ver pedido ({itemCount + quantity})
          </button>
        </div>
      ),
      { duration: 3000, position: "bottom-center" },
    );
  }, [product, quantity, notes, addItem, itemCount]);

  if (bizLoading || productLoading) {
    return <SkeletonProductPage />;
  }

  if (!business || !product) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground/50">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-foreground">Producto no encontrado</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Este producto no existe o ya no esta disponible.
          </p>
          <Link
            to="/go/$slug"
            params={{ slug }}
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver a la tienda <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const onSale = hasSalePrice(product.price, product.sale_price);
  const displayPrice = getDisplayPrice(product.price, product.sale_price);

  const descriptionSections: { title: string; content: string }[] = [];
  if (product.description) {
    descriptionSections.push({ title: "Descripcion", content: product.description });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground antialiased font-sans">
      <StoreHeader business={business} slug={slug} />

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12 py-8 lg:py-12">
          <ProductBreadcrumbs
            items={[
              { label: "Inicio", to: "/go/$slug", params: { slug } },
              ...(product.category ? [{ label: product.category.name }] : []),
              { label: product.name },
            ]}
          />

          <div className="grid gap-12 lg:gap-16 grid-cols-1 lg:grid-cols-[55fr_45fr]">
            <ProductGallery
              images={images}
              mainImageUrl={product.image_url}
              productName={product.name}
              badges={
                <ProductBadges
                  createdAt={product.created_at}
                  price={product.price}
                  salePrice={product.sale_price}
                />
              }
            />

            <div className="flex flex-col max-w-[520px]">
              <h1 className="text-[32px] md:text-[40px] lg:text-[48px] font-semibold text-foreground leading-[1.1] tracking-tight line-clamp-2">
                {product.name}
              </h1>

              <div className="mt-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className={
                      "text-[36px] md:text-[40px] lg:text-[42px] font-semibold tracking-[-0.02em] " +
                      (onSale ? "text-destructive" : "text-foreground")
                    }
                  >
                    {$}
                    {displayPrice.toFixed(2)}
                  </span>
                  {onSale && (
                    <span className="text-lg text-muted-foreground line-through">
                      {$}
                      {product.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {product.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="mt-6">
                <label
                  htmlFor="pd-notes"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Notas (opcional)
                </label>
                <input
                  id="pd-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales para tu pedido..."
                  className="w-full rounded-2xl border border-border/50 bg-muted/30 px-[18px] h-14 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30"
                />
              </div>

              <div className="mt-6 flex items-center gap-4">
                <ProductQuantity quantity={quantity} onChange={setQuantity} />
                <ProductCTA
                  label="Agregar al pedido"
                  totalPrice={`${$}${(displayPrice * quantity).toFixed(2)}`}
                  onClick={handleAddToCart}
                />
                <button
                  aria-label="Agregar a favoritos"
                  className="size-[56px] flex items-center justify-center border border-border/50 rounded-full hover:border-foreground/30 transition-colors bg-transparent text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Heart className="size-5" strokeWidth={1.25} />
                </button>
              </div>

              <ProductAccordion sections={descriptionSections} />
            </div>
          </div>

          <RelatedProducts products={related} currencySymbol={$} storeSlug={slug} />
        </div>
      </main>

      <StoreFooter business={business} slug={slug} />

      <CartDrawerV2
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        currencySymbol={$}
        busy={checkoutBusy}
        error={checkoutError}
      />
    </div>
  );
}

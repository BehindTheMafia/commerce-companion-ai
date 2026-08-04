import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ShoppingBag,
  AlertCircle,
  Package,
  ArrowRight,
  Search,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useBusinessQuery } from "@/hooks/use-business-query";
import { useCheckout } from "@/hooks/use-checkout";
import { useCurrency } from "@/hooks/use-currency";
import { hasSalePrice, getDisplayPrice, isNewProduct } from "@/lib/product";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { StoreHeader } from "@/components/storefront/store-header";
import { StoreFooter } from "@/components/storefront/store-footer";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { TrustStrip } from "@/components/storefront/trust-strip";
import { StickyCartBar } from "@/components/storefront/sticky-cart-bar";
import { ProductCard } from "@/components/storefront/product-card";
import type { Business, Product, Category } from "@/types/storefront";

export const Route = createFileRoute("/go/$slug/")({
  component: StorefrontPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Commerce AI` },
      {
        name: "description",
        content: `Compra en ${params.slug} — productos con envío rápido y pago seguro.`,
      },
    ],
    links: [],
  }),
});

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-muted/60" />
      <div className="space-y-2 px-1">
        <div className="h-3 w-2/3 rounded-md bg-muted/60" />
        <div className="h-4 w-1/3 rounded-md bg-muted/60" />
      </div>
    </div>
  );
}

function StorefrontPage() {
  const { slug } = useParams({ from: "/go/$slug" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { itemCount, subtotal } = useCart();

  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessQuery(slug);

  const { handleCheckout, busy: checkoutBusy, error: checkoutError } = useCheckout(business);
  const { symbol: $ } = useCurrency(business?.currency ?? "USD");

  const { data: categories = [] } = useQuery({
    queryKey: ["sf-categories", business?.id],
    enabled: !!business,
    queryFn: async (): Promise<Category[]> => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .eq("business_id", business!.id)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["sf-products", business?.id],
    enabled: !!business,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, sku, stock, created_at, category:categories(name, slug), brand:brands(name)",
        )
        .eq("business_id", business!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const scrollToProducts = () => {
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (bizLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <div className="absolute inset-0 animate-ping rounded-2xl border border-primary/20 opacity-20" />
            <ShoppingBag className="size-6 animate-pulse" strokeWidth={1.5} />
          </div>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tienda no encontrada
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              La tienda que buscas no existe o ha sido removida temporalmente.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link to="/">
              Volver al inicio <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = products[0];
  const featuredOnSale = featured ? hasSalePrice(featured.price, featured.sale_price) : false;
  const featuredPrice = featured ? getDisplayPrice(featured.price, featured.sale_price) : 0;
  const featuredNew = featured ? isNewProduct(featured.created_at) : false;
  const waPhone = business.whatsapp_phone;
  const waBrowseLink = waPhone
    ? getWhatsAppLink(waPhone, `Hola, quiero ver el catálogo de ${business.name}.`)
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[76px] text-foreground antialiased selection:bg-primary/20 selection:text-primary md:pb-0">
      <AnnouncementBar business={business} />

      <StoreHeader
        business={business}
        slug={slug}
        onCartOpen={() => setCartOpen(true)}
        search={{
          open: searchOpen,
          query: searchQuery,
          onToggle: () => {
            setSearchOpen((v) => !v);
            if (searchOpen) setSearchQuery("");
          },
          onQueryChange: setSearchQuery,
        }}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="flex-1">
        {/* Hero — producto destacado + CTA WhatsApp */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/50 via-background to-background">
          <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent opacity-50"
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
            <div className="flex flex-col items-start gap-7 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-sm">
                <span className="size-1.5 rounded-full bg-primary" />
                Tienda oficial
              </span>

              <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
                Compra directo por WhatsApp en <span className="text-primary">{business.name}</span>
              </h1>

              <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
                Explora el catálogo, elige tus productos y haz tu pedido en segundos. Envío rápido y
                pago seguro.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {waBrowseLink && (
                  <a
                    href={waBrowseLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-lg shadow-black/10 transition-all hover:bg-foreground/90 hover:shadow-xl active:scale-[0.98]"
                  >
                    <MessageCircle className="size-4.5" strokeWidth={2} />
                    Pedir por WhatsApp
                  </a>
                )}
                <button
                  onClick={scrollToProducts}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-6 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                >
                  Ver productos
                  <ArrowRight className="size-4" strokeWidth={2} />
                </button>
              </div>

              {categories.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {products.length} producto{products.length !== 1 ? "s" : ""} en{" "}
                  {categories.length} categoría{categories.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              {featured ? (
                <Link
                  to="/go/$slug/product/$productSlug"
                  params={{ slug, productSlug: featured.slug }}
                  className="group relative block"
                  aria-label={`Ver ${featured.name}`}
                >
                  <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-primary/15 to-transparent blur-2xl" />
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted shadow-2xl shadow-black/10 ring-1 ring-border/40 transition-transform duration-500 group-hover:rotate-[0.5deg]">
                    {featured.image_url ? (
                      <img
                        src={featured.image_url}
                        alt={featured.name}
                        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted/80">
                        <Package className="size-20 text-muted-foreground/20" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                    {featuredNew && (
                      <span className="rounded-lg bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md">
                        Nuevo
                      </span>
                    )}
                    {featuredOnSale && (
                      <span className="rounded-lg bg-destructive/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground shadow-sm backdrop-blur-md">
                        Oferta
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl bg-background/95 p-3.5 shadow-lg backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {featured.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Producto destacado</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-lg font-bold tabular-nums",
                        featuredOnSale ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {$}
                      {featuredPrice.toFixed(2)}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-border/60 bg-muted/20 text-center">
                  <div className="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground/40">
                    <Package className="size-9" strokeWidth={1} />
                  </div>
                  <p className="max-w-[220px] text-sm text-muted-foreground">
                    Este negocio está preparando su catálogo. ¡Vuelve pronto!
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <TrustStrip business={business} currencySymbol={$} />

        {/* Categorías — merchandising */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 lg:px-12 lg:py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Categorías
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explora por lo que más te interesa
                </p>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Ver todo
                </button>
              )}
            </div>

            <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-4">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.name;
                const count = products.filter((p) => p.category?.name === cat.name).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                    className={cn(
                      "group relative w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl text-left transition-all duration-300 md:w-auto",
                      isActive
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:shadow-lg hover:shadow-black/5",
                    )}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
                          <Package className="size-10 text-primary/30" strokeWidth={1.25} />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3.5 pt-10">
                      <p className="text-sm font-semibold text-white">{cat.name}</p>
                      <p className="text-xs text-white/80">
                        {count} producto{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Grid de productos */}
        <section
          id="productos"
          className="mx-auto max-w-[1440px] scroll-mt-16 px-5 pb-24 pt-2 md:px-8 md:pb-16 lg:px-12"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : selectedCategory || "Nuestros Productos"}
              </h2>
              {!productsLoading && (
                <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""} disponible
                  {filtered.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={clearFilters}
                className="h-9 self-start rounded-full px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {productsLoading && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-10">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!productsLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-muted/10 py-24 text-center">
              <div className="mb-5 grid size-20 place-items-center rounded-full bg-muted text-muted-foreground/50">
                <Search className="size-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {searchQuery
                  ? "No encontramos resultados"
                  : selectedCategory
                    ? "Categoría vacía"
                    : "Aún no hay productos"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-balance text-base text-muted-foreground">
                {searchQuery
                  ? `No pudimos encontrar nada para "${searchQuery}". Intenta con otras palabras clave.`
                  : "Vuelve más tarde para ver nuestras novedades."}
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={clearFilters}
                  className="mt-8 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
                >
                  Ver todo el catálogo
                </button>
              )}
            </div>
          )}

          {!productsLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-10">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={$}
                  storeSlug={slug}
                  onQuickAdd={() => setCartOpen(true)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <StoreFooter business={business} slug={slug} />

      <StickyCartBar
        itemCount={itemCount}
        subtotal={subtotal}
        currencySymbol={$}
        onCartOpen={() => setCartOpen(true)}
        onBrowse={scrollToProducts}
      />

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

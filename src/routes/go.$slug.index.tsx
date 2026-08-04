import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ShoppingBag,
  AlertCircle,
  ArrowRight,
  Search,
  MessageCircle,
  Truck,
  Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useBusinessQuery } from "@/hooks/use-business-query";
import { useCheckout } from "@/hooks/use-checkout";
import { useCurrency } from "@/hooks/use-currency";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { hasSalePrice } from "@/lib/product";
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

const PAGE_SIZE = 8;

const testimonials = [
  {
    name: "María F.",
    quote:
      "Excelente servicio. El proceso de compra fue muy rápido y la atención por WhatsApp resolvió todas mis dudas al instante. Totalmente recomendado.",
  },
  {
    name: "Carlos R.",
    quote:
      "La calidad de los productos es premium de verdad. El empaque y la velocidad de entrega superaron mis expectativas.",
  },
  {
    name: "Ana P.",
    quote:
      "Muy buena tienda. Pude hacer mi pedido enviándolo directo a su WhatsApp en segundos. Volveré a comprar.",
  },
];

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full animate-pulse rounded-3xl bg-muted/60" />
      <div className="space-y-2 px-1">
        <div className="h-3 w-2/3 rounded-md bg-muted/60" />
        <div className="h-4 w-1/3 rounded-md bg-muted/60" />
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StorefrontPage() {
  const { slug } = useParams({ from: "/go/$slug" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [saleOnly, setSaleOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { itemCount, subtotal } = useCart();

  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessQuery(slug);
  const settings = useStoreSettings(business);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, saleOnly, searchQuery]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSaleOnly(false);
    setSearchQuery("");
  };

  const scrollToProducts = () => {
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (bizLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative grid size-16 place-items-center rounded-2xl bg-foreground/10 text-foreground">
            <div className="absolute inset-0 animate-ping rounded-2xl border border-foreground/20 opacity-20" />
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
    const matchesSale = !saleOnly || hasSalePrice(p.price, p.sale_price);
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSale && matchesSearch;
  });

  const visible = filtered.slice(0, visibleCount);
  const saleProducts = products.filter((p) => hasSalePrice(p.price, p.sale_price));
  const maxDiscount = saleProducts.reduce((max, p) => {
    const d = p.price > 0 ? Math.round(((p.price - p.sale_price!) / p.price) * 100) : 0;
    return Math.max(max, d);
  }, 0);

  const featured = products[0];
  const heroImage = featured?.image_url ?? null;
  const waPhone = business.whatsapp_phone;
  const waBrowseLink = waPhone
    ? getWhatsAppLink(waPhone, `Hola, quiero ver el catálogo de ${business.name}.`)
    : null;

  const shippingEnabled = settings.shipping.enabled || Boolean(settings.shipping.banner_text);
  const freeThreshold = settings.shipping.free_threshold;

  const gridTitle = searchQuery
    ? `Resultados para "${searchQuery}"`
    : selectedCategory
      ? selectedCategory
      : saleOnly
        ? "Ofertas"
        : "Catálogo Completo";

  const viewOffers = () => {
    setSaleOnly(true);
    setSelectedCategory(null);
    setSearchQuery("");
    scrollToProducts();
  };

  const pillBase =
    "shrink-0 whitespace-nowrap rounded-2xl px-5 py-2.5 text-sm font-medium transition-all active:scale-95";
  const pillActive = "bg-foreground text-background shadow-md";
  const pillInactive =
    "border border-border/70 bg-white text-foreground hover:border-foreground/40 hover:shadow-sm";

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[76px] text-foreground antialiased selection:bg-foreground/10 md:pb-0">
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
      />

      <main className="flex-1">
        {/* Hero — fondo full-bleed + tarjeta de vidrio centrada */}
        <section className="relative">
          <div className="absolute inset-0 overflow-hidden">
            {heroImage ? (
              <img
                src={heroImage}
                alt=""
                className="size-full object-cover object-center brightness-[0.7]"
                loading="lazy"
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-foreground to-foreground/70" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />
          </div>

          <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-16 md:pb-20 md:pt-24 lg:px-12">
            <div className="mx-auto w-full max-w-4xl rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] backdrop-blur-xl md:p-10">
              <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
                <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[28px] bg-foreground text-background shadow-lg md:size-32">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="size-10" strokeWidth={1.5} />
                  )}
                </div>

                <div className="flex-1">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {business.name}
                  </h1>
                  <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground md:mx-0 md:text-lg">
                    Explora el catálogo, elige tus productos y haz tu pedido en segundos. Envío
                    rápido y pago seguro.
                  </p>

                  {(shippingEnabled || waPhone) && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground md:justify-start">
                      {shippingEnabled && (
                        <span className="flex items-center gap-1.5">
                          <Truck className="size-4.5 text-foreground/40" strokeWidth={2} />
                          {freeThreshold
                            ? `Envío gratis desde ${$}${freeThreshold.toFixed(2)}`
                            : "Envío a todo el país"}
                        </span>
                      )}
                      {waPhone && (
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="size-4.5 text-[#25D366]" strokeWidth={2} />
                          Pedidos por WhatsApp
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start">
                    <button
                      onClick={scrollToProducts}
                      className="w-full rounded-2xl bg-foreground px-8 py-3.5 font-medium text-background shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-foreground/90 sm:w-auto"
                    >
                      Explorar catálogo
                    </button>
                    {waBrowseLink && (
                      <a
                        href={waBrowseLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-8 py-3.5 font-medium text-white shadow-lg shadow-[#25D366]/30 transition-all hover:-translate-y-0.5 hover:bg-[#20bd5a] sm:w-auto"
                      >
                        <MessageCircle className="size-5" strokeWidth={2} />
                        Pedir por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categorías — fila de pills */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-[1440px] px-5 py-6 md:px-8 lg:px-12">
            <div className="no-scrollbar -mx-5 flex items-center gap-3 overflow-x-auto px-5 pb-2 [-webkit-overflow-scrolling:touch] md:mx-0 md:px-0">
              <button
                onClick={() => {
                  setSaleOnly(false);
                  setSelectedCategory(null);
                }}
                className={cn(pillBase, !selectedCategory && !saleOnly ? pillActive : pillInactive)}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSaleOnly(false);
                    setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                  }}
                  className={cn(
                    pillBase,
                    selectedCategory === cat.name ? pillActive : pillInactive,
                  )}
                >
                  {cat.name}
                </button>
              ))}
              {saleProducts.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSaleOnly((v) => !v);
                  }}
                  className={cn(
                    pillBase,
                    saleOnly
                      ? "border border-red-600 bg-red-600 text-white shadow-md"
                      : "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
                  )}
                >
                  Ofertas
                </button>
              )}
            </div>
          </section>
        )}

        {/* Banner promocional — data-driven */}
        {saleProducts.length > 0 && !saleOnly && (
          <section className="mx-auto max-w-[1440px] px-5 pb-6 md:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-3xl bg-foreground text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)]">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-black/40 blur-3xl" />
              <div className="relative z-10 flex flex-col items-center justify-between gap-6 px-6 py-8 text-center md:flex-row md:px-12 md:py-10 md:text-left">
                <div>
                  <span className="mb-3 inline-block rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Ofertas
                  </span>
                  <h2 className="text-2xl font-bold md:text-3xl">
                    Hasta {maxDiscount}% de descuento
                  </h2>
                  <p className="mt-2 text-sm text-white/70 md:text-base">
                    {saleProducts.length} producto{saleProducts.length !== 1 ? "s" : ""} en oferta
                    ahora mismo
                  </p>
                </div>
                <button
                  onClick={viewOffers}
                  className="shrink-0 rounded-2xl bg-white px-6 py-3 font-semibold text-foreground shadow-lg transition-transform hover:scale-105"
                >
                  Ver ofertas
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Grid de productos */}
        <section
          id="productos"
          className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-10 pt-4 md:px-8 md:pb-12 lg:px-12"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {gridTitle}
            </h2>
            {!productsLoading && (
              <span className="shrink-0 pb-1 text-sm font-medium text-muted-foreground">
                {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {productsLoading && (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
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
                  : selectedCategory || saleOnly
                    ? "Sin productos aquí"
                    : "Aún no hay productos"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-balance text-base text-muted-foreground">
                {searchQuery
                  ? `No pudimos encontrar nada para "${searchQuery}". Intenta con otras palabras clave.`
                  : "Vuelve más tarde para ver nuestras novedades."}
              </p>
              {(searchQuery || selectedCategory || saleOnly) && (
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
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
              {visible.map((product) => (
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

          {!productsLoading && filtered.length > visibleCount && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-2xl border-2 border-border/80 bg-white px-8 py-3 font-semibold text-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Cargar más productos
              </button>
            </div>
          )}
        </section>

        <TrustStrip business={business} currencySymbol={$} />

        {/* Testimonios */}
        <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 lg:px-12">
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Lo que dicen nuestros clientes
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-1 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
                    {initialsOf(t.name)}
                  </span>
                  <div>
                    <h5 className="text-sm font-semibold text-foreground">{t.name}</h5>
                    <span className="text-xs text-muted-foreground">Comprador verificado</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        {waBrowseLink && (
          <section className="mx-auto max-w-[1440px] px-5 pb-16 md:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-[32px] bg-foreground px-8 py-12 text-center text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] md:px-12 md:py-16">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-black/40 blur-3xl" />
              <div className="relative z-10 mx-auto max-w-2xl">
                <h2 className="text-3xl font-bold md:text-4xl">¿No encontraste lo que buscabas?</h2>
                <p className="mx-auto mt-4 text-lg text-white/70">
                  Escríbenos directamente y un asesor te ayudará a encontrar el producto perfecto
                  para ti.
                </p>
                <a
                  href={waBrowseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-[#20bd5a] hover:shadow-xl"
                >
                  <MessageCircle className="size-6" strokeWidth={2} />
                  Hablar con un asesor
                </a>
              </div>
            </div>
          </section>
        )}
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

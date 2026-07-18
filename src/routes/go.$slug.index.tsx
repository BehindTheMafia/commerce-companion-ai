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
  X,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useBusinessQuery } from "@/hooks/use-business-query";
import { useCheckout } from "@/hooks/use-checkout";
import { useCurrency } from "@/hooks/use-currency";
import { hasSalePrice, getDisplayPrice, isNewProduct } from "@/lib/product";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
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
      <div className="aspect-[3/4] w-full rounded-2xl bg-muted/60 animate-pulse" />
      <div className="space-y-2 px-1">
        <div className="h-4 w-2/3 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-1/3 rounded-md bg-muted/60 animate-pulse" />
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
  const [isScrolled, setIsScrolled] = useState(false);
  const categoryBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { itemCount } = useCart();

  const { data: business, isLoading: bizLoading, error: bizError } = useBusinessQuery(slug);

  const { handleCheckout, busy: checkoutBusy, error: checkoutError } = useCheckout(business);
  const { symbol: $ } = useCurrency(business?.currency ?? "USD");

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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

  if (bizLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-ping opacity-20" />
            <ShoppingBag className="size-6 animate-pulse" />
          </div>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
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

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground antialiased font-sans selection:bg-primary/20 selection:text-primary">
      {/* Sticky header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
          isScrolled ? "shadow-sm border-b border-border/50" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/go/$slug" params={{ slug }} className="flex items-center gap-3 group">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="size-8 rounded-lg object-cover ring-1 ring-border/50 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShoppingBag className="size-4" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-foreground font-display">
              {business.name}
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full p-2 transition-all"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) setSearchQuery("");
              }}
              aria-label="Buscar"
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full p-2 transition-all"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <ShoppingBag className="size-5" strokeWidth={1.75} />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 border-2 border-background">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Input Panel */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            searchOpen ? "max-h-20 opacity-100 border-t border-border/50" : "max-h-0 opacity-0",
          )}
        >
          <div className="bg-background/95 px-6 py-3">
            <div className="mx-auto max-w-2xl flex items-center gap-2 rounded-full bg-muted/50 border border-border/50 px-4 h-11 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <Search className="size-4 text-muted-foreground shrink-0" strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en la tienda..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        {categories.length > 0 && (
          <div className="border-t border-border/40 bg-background/50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div
                ref={categoryBarRef}
                className="flex gap-2 overflow-x-auto py-3 scrollbar-none [-webkit-overflow-scrolling:touch]"
              >
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                    !selectedCategory
                      ? "bg-foreground text-background shadow-md shadow-black/5"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.name ? null : cat.name)
                    }
                    className={cn(
                      "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap",
                      selectedCategory === cat.name
                        ? "bg-foreground text-background shadow-md shadow-black/5"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-16 lg:py-24 items-center">
              <div className="flex flex-col justify-center gap-6 text-center lg:text-left">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] font-display text-balance">
                    Descubre la colección de <span className="text-primary">{business.name}</span>
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 text-balance">
                    Explora nuestros productos de alta calidad. Haz tu pedido directamente por
                    WhatsApp de forma rápida y segura.
                  </p>
                </div>

              </div>

              <div className="hidden lg:flex items-center justify-end">
                <div className="relative w-full max-w-md aspect-[4/5] rotate-2 hover:rotate-0 transition-transform duration-700 ease-out">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[2rem] -m-4 blur-3xl opacity-50" />
                  {products.length > 0 && products[0].image_url ? (
                    <img
                      src={products[0].image_url}
                      alt="Producto destacado"
                      className="relative size-full object-cover rounded-[2rem] shadow-2xl ring-1 ring-border/20"
                    />
                  ) : (
                    <div className="relative flex size-full items-center justify-center rounded-[2rem] bg-muted/80 backdrop-blur-sm border border-border/50">
                      <Package className="size-20 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="border-b border-border/30">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 lg:py-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  Categorías
                </h2>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Ver todo
                  </button>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none [-webkit-overflow-scrolling:touch]">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(isActive ? null : cat.name)
                      }
                      className={cn(
                        "group shrink-0 rounded-2xl border transition-all duration-300 overflow-hidden",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 bg-card hover:border-foreground/20 hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-center gap-3 px-5 py-3">
                        {cat.image_url && (
                          <div className="size-10 rounded-xl overflow-hidden shrink-0 bg-muted">
                            <img
                              src={cat.image_url}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="text-left">
                          <span
                            className={cn(
                              "text-sm font-semibold whitespace-nowrap",
                              isActive ? "text-primary" : "text-foreground",
                            )}
                          >
                            {cat.name}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {products.filter((p) => p.category?.name === cat.name).length} productos
                          </p>
                        </div>
                        {isActive && (
                          <div className="size-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Product Grid Section */}
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : selectedCategory || "Nuestros Productos"}
              </h2>
              {!productsLoading && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {filtered.length} producto{filtered.length !== 1 ? "s" : ""} disponible
                    {filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
            {(selectedCategory || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery("");
                }}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-8 px-4"
              >
                Limpiar filtros
              </Button>
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
            <div className="py-24 text-center flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10">
              <div className="grid size-20 place-items-center rounded-full bg-muted text-muted-foreground/50 mb-5">
                <Search className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {searchQuery
                  ? "No encontramos resultados"
                  : selectedCategory
                    ? `Categoría vacía`
                    : "Aún no hay productos"}
              </h3>
              <p className="mt-2 text-base text-muted-foreground max-w-sm mx-auto text-balance">
                {searchQuery
                  ? `No pudimos encontrar nada para "${searchQuery}". Intenta con otras palabras clave.`
                  : "Vuelve más tarde para ver nuestras novedades."}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  className="mt-8 rounded-full"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery("");
                  }}
                >
                  Ver todo el catálogo
                </Button>
              )}
            </div>
          )}

          {!productsLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-12">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currencySymbol={$}
                  storeSlug={slug}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5 lg:col-span-4">
            <div className="flex items-center gap-3 text-xl font-bold tracking-tight mb-6">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt=""
                  className="size-8 rounded-lg object-cover ring-1 ring-border"
                />
              ) : (
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingBag className="size-4" />
                </div>
              )}
              {business.name}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
              Productos seleccionados de la más alta calidad. Haz tu pedido y coordina directamente
              a través de WhatsApp.
            </p>
            <div className="flex gap-3">
              <SocialLink icon={Instagram} href="#" aria-label="Instagram" />
              <SocialLink icon={Facebook} href="#" aria-label="Facebook" />
              <SocialLink icon={Twitter} href="#" aria-label="Twitter" />
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-5 text-foreground">
                Categorías
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="hover:text-primary transition-colors"
                  >
                    Catálogo completo
                  </button>
                </li>
                {categories.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategory(cat.name)}
                      className="hover:text-primary transition-colors"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-5 text-foreground">
                Asistencia
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Preguntas Frecuentes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Envíos y Entregas
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Devoluciones
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-5 text-foreground">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Términos de Servicio
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Desarrollado por{" "}
            <a
              href="https://commerceai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
            >
              Commerce AI <ExternalLink className="size-3" />
            </a>
          </p>
        </div>
      </footer>

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

function SocialLink({
  icon: Icon,
  href,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
      {...props}
    >
      <Icon className="size-4" />
    </a>
  );
}

function ProductCard({
  product,
  currencySymbol: $,
  storeSlug,
}: {
  product: Product;
  currencySymbol: string;
  storeSlug: string;
}) {
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

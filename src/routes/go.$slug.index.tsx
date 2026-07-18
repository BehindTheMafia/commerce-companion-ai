import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingBag, Sparkles, AlertCircle, Package,
  ArrowRight, ExternalLink, Search, Heart, X,
  Facebook, Twitter, Instagram, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import type { CustomerData } from "@/components/storefront/checkout-form";
import { toast } from "sonner";

export const Route = createFileRoute("/go/$slug/")({
  component: StorefrontPage,
});

type Business = {
  id: string; name: string; slug: string;
  logo_url: string | null; currency: string;
  whatsapp_phone: string | null;
};
type Category = { id: string; name: string; slug: string };
type Product = {
  id: string; name: string; slug: string; price: number;
  sale_price: number | null; image_url: string | null;
  description: string | null; created_at: string;
  category: { name: string } | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$",
};
const sym = (c: string) => CURRENCY_SYMBOL[c] || "$";

function isNewProduct(createdAt: string) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > weekAgo;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-muted/70 mb-3" />
      <div className="h-4 w-3/4 rounded-lg bg-muted/60 mb-2" />
      <div className="h-3 w-1/3 rounded-lg bg-muted/60" />
    </div>
  );
}

function StorefrontPage() {
  const { slug } = useParams({ from: "/go/$slug" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const categoryBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { itemCount, items, clearCart, subtotal } = useCart();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const { data: business, isLoading: bizLoading, error: bizError } = useQuery({
    queryKey: ["sf-business", slug],
    queryFn: async (): Promise<Business> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, logo_url, currency")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Business not found");
      let whatsapp_phone: string | null = null;
      const wa = await supabase
        .from("businesses")
        .select("whatsapp_phone")
        .eq("id", data.id)
        .maybeSingle();
      if (!wa.error && wa.data?.whatsapp_phone) {
        whatsapp_phone = wa.data.whatsapp_phone;
      }
      return { ...data, whatsapp_phone };
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["sf-categories", business?.id],
    enabled: !!business,
    queryFn: async (): Promise<Category[]> => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
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
        .select("id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name)")
        .eq("business_id", business!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (bizLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="size-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Cargando tienda</p>
            <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-foreground">Tienda no encontrada</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            La tienda que buscas no existe o ha sido removida.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver al inicio <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  const $ = sym(business.currency);

  const filtered = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  async function handleCheckout(data: CustomerData) {
    if (!business) return;
    const waPhone = business.whatsapp_phone;
    if (!waPhone) {
      setCheckoutError("El negocio no tiene configurado un numero de WhatsApp.");
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError(null);
    const message = buildWhatsAppMessage(
      business.name,
      items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.sale_price ?? i.product.price,
        notes: i.notes,
      })),
      subtotal,
      {
        name: data.name,
        phone: data.phone,
        deliveryType: data.deliveryType,
        address: data.address || undefined,
        neighborhood: data.neighborhood || undefined,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
        paymentMethod: data.paymentMethod,
        cashAmount: data.cashAmount || undefined,
      },
    );
    location.href = getWhatsAppLink(waPhone, message);
    try {
      await supabase.rpc("create_order", {
        p_business_id: business.id,
        p_customer_name: data.name,
        p_customer_phone: data.phone,
        p_customer_address: data.address || "",
        p_notes: data.notes || null,
        p_items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
        })),
      });
      clearCart();
      setCartOpen(false);
    } catch (err) {
      console.error("Error creating order:", err);
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* Announcement bar */}
      <div className="relative overflow-hidden bg-foreground text-background">
        <div className="relative z-10 text-[11px] py-2 text-center tracking-wide font-light px-4">
          <Sparkles className="mr-1.5 inline size-3 align-text-top opacity-60" />
          ENVIO GRATIS EN PEDIDOS +{$}50
        </div>
      </div>

      {/* Sticky header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-background/90 backdrop-blur-xl transition-all duration-200",
          isScrolled ? "shadow-sm border-b border-border/40" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">

          <Link
            to="/go/$slug"
            params={{ slug }}
            className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none"
          >
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                className="size-7 rounded-xl object-cover ring-1 ring-border/50 shrink-0"
              />
            )}
            <span className="text-base font-bold tracking-tight text-foreground truncate">
              {business.name}
            </span>
          </Link>

          {/* Desktop search */}
          <div className="hidden sm:flex flex-1 items-center gap-2 max-w-md mx-auto rounded-xl bg-muted/60 border border-border/40 px-3.5 h-9 transition-all focus-within:border-primary/50 focus-within:bg-background">
            <Search className="size-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                aria-label="Limpiar busqueda"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) setSearchQuery(""); }}
              aria-label="Buscar"
            >
              {searchOpen ? <X className="size-4.5" strokeWidth={1.5} /> : <Search className="size-4.5" strokeWidth={1.5} />}
            </button>

            <button
              className="hidden sm:grid text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Lista de deseos"
            >
              <Heart className="size-4.5" strokeWidth={1.5} />
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-[16px] h-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background px-1 transition-all duration-200">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="border-t border-border/40 bg-background px-4 py-2.5 sm:hidden animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/40 px-3 h-9 focus-within:border-primary/50">
              <Search className="size-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos"
                aria-label="Buscar productos"
                className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-muted-foreground/50">
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="border-t border-border/40">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div
                ref={categoryBarRef}
                className="flex gap-2 overflow-x-auto py-2 scrollbar-none [-webkit-overflow-scrolling:touch]"
                role="navigation"
                aria-label="Categorias"
              >
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                    !selectedCategory
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
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

        {/* Hero */}
        <section className="border-b border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12 sm:py-16">
              <div className="lg:col-span-7 flex flex-col justify-center gap-4">
                <div className="space-y-3">
                  {business.logo_url && (
                    <img
                      src={business.logo_url}
                      alt={business.name}
                      className="size-12 rounded-2xl object-cover ring-1 ring-border/50 shadow-sm"
                    />
                  )}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                    {business.name}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed max-w-md">
                    Descubre nuestra coleccion. Ordena directo por WhatsApp.
                  </p>
                </div>
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {categories.slice(0, 4).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                          selectedCategory === cat.name
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
                <div className="relative w-full max-w-sm aspect-square">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] to-transparent rounded-3xl" />
                  {products.length > 0 && products[0].image_url ? (
                    <img
                      src={products[0].image_url}
                      alt=""
                      className="relative size-full object-cover rounded-3xl shadow-lg ring-1 ring-border/20"
                    />
                  ) : (
                    <div className="relative flex size-full items-center justify-center rounded-3xl bg-muted/50">
                      <Package className="size-16 text-muted-foreground/15" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product grid */}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">

          {/* Section heading */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : selectedCategory || "Productos"}
              </h2>
              {!productsLoading && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                  {selectedCategory && ` en ${selectedCategory}`}
                </p>
              )}
            </div>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Skeleton */}
          {productsLoading && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!productsLoading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/40 mb-4">
                <Package className="size-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {searchQuery ? "Sin resultados" : selectedCategory ? `No hay productos en "${selectedCategory}"` : "No hay productos"}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
                {searchQuery
                  ? `No encontramos "${searchQuery}". Intenta con otro termino.`
                  : "Esta tienda aun no tiene productos publicados. Vuelve pronto."}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 rounded-xl"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                >
                  Ver todos los productos
                </Button>
              )}
            </div>
          )}

          {/* Products */}
          {!productsLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
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
      <footer className="border-t border-border/40 bg-foreground text-background pt-12 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight mb-4">
                {business.logo_url && (
                  <img src={business.logo_url} alt="" className="size-7 rounded-xl object-cover ring-1 ring-white/10" />
                )}
                {business.name}
              </div>
              <p className="text-xs text-background/50 font-light leading-relaxed mb-5 max-w-xs">
                Productos de calidad. Pedidos directos por WhatsApp. Rapido y sin complicaciones.
              </p>
              <div className="flex gap-2.5">
                <a href="#" aria-label="Instagram" className="grid size-8 place-items-center rounded-xl border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                  <Instagram className="size-3.5" />
                </a>
                <a href="#" aria-label="Facebook" className="grid size-8 place-items-center rounded-xl border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                  <Facebook className="size-3.5" />
                </a>
                <a href="#" aria-label="Twitter" className="grid size-8 place-items-center rounded-xl border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                  <Twitter className="size-3.5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-background/60">
                Categorias
              </h4>
              <ul className="space-y-2.5 text-xs text-background/50">
                <li>
                  <button onClick={() => setSelectedCategory(null)} className="hover:text-background transition-colors">
                    Todos los productos
                  </button>
                </li>
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat.id}>
                    <button onClick={() => setSelectedCategory(cat.name)} className="hover:text-background transition-colors">
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-background/60">Soporte</h4>
              <ul className="space-y-2.5 text-xs text-background/50">
                <li><a href="#" className="hover:text-background transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-background transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Envios</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Devoluciones</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-background/60">Legal</h4>
              <ul className="space-y-2.5 text-xs text-background/50">
                <li><a href="#" className="hover:text-background transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Terminos</a></li>
                <li><a href="#" className="hover:text-background transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[10px] text-background/30">
              &copy; 2024 {business.name}. Todos los derechos reservados.
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-background/30">
              Powered by{" "}
              <a
                href="https://commerceai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-background/50 underline underline-offset-4 hover:text-background transition-colors"
              >
                Commerce AI <ExternalLink className="size-2.5" />
              </a>
            </p>
          </div>
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
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;
  const showNewBadge = isNewProduct(product.created_at);

  return (
    <Link
      to="/go/$slug/product/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className="group block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted mb-3 transition-all duration-500 ease-out group-hover:shadow-lg group-hover:shadow-black/5 group-hover:-translate-y-0.5">
        {product.image_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "size-full object-cover transition-all duration-500 ease-out",
                imgLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-[1.03]"
              )}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/15" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {showNewBadge && (
            <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-semibold shadow-sm">
              Nuevo
            </span>
          )}
          {hasSale && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              Oferta
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-3">
          <span className="rounded-xl bg-white/95 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-foreground shadow-sm translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
            Ver producto
          </span>
        </div>
      </div>

      <div className="px-0.5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {product.name}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-bold", hasSale ? "text-destructive" : "text-foreground")}>
            {$}{displayPrice.toFixed(2)}
          </span>
          {hasSale && (
            <span className="text-xs text-muted-foreground line-through">
              {$}{product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

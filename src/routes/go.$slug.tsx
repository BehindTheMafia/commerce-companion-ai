import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingBag, Sparkles, AlertCircle, Package,
  ArrowRight, ExternalLink, Search, Heart, X,
  Facebook, Twitter, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CartProvider, useCart } from "@/lib/cart-context";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import type { CustomerData } from "@/components/storefront/checkout-form";
import { toast } from "sonner";

export const Route = createFileRoute("/go/$slug")({
  component: () => (
    <CartProvider>
      <StorefrontPage />
    </CartProvider>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Commerce AI` },
      { name: "description", content: `Compra en ${params.slug} — productos con envío rápido y pago seguro.` },
      { property: "og:title", content: `${params.slug} | Commerce AI` },
      { property: "og:description", content: `Descubre los productos de ${params.slug}.` },
    ],
  }),
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
  description: string | null;
  category: { name: string } | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$",
};
const sym = (c: string) => CURRENCY_SYMBOL[c] || "$";

// Deterministic badge per product
const BADGES = [
  { emoji: "🔥", label: "Más vendido", bg: "bg-orange-100 text-orange-700" },
  { emoji: "⭐", label: "Popular", bg: "bg-yellow-100 text-yellow-700" },
  { emoji: "🆕", label: "Nuevo", bg: "bg-blue-100 text-blue-700" },
  { emoji: "❤️", label: "Recomendado", bg: "bg-pink-100 text-pink-700" },
];
function getBadge(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  if (n % 6 === 0) return BADGES[0];
  if (n % 6 === 1) return BADGES[1];
  if (n % 6 === 2) return BADGES[2];
  if (n % 6 === 3) return BADGES[3];
  return null;
}

// ─── Skeleton card ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-muted mb-3" />
      <div className="h-3.5 w-3/4 rounded bg-muted mb-1.5" />
      <div className="h-3 w-1/3 rounded bg-muted" />
    </div>
  );
}

// ─── Toast helper ────────────────────────────────────────────────────
function showAddedToast(productName: string, itemCount: number, onViewCart: () => void) {
  toast.custom(
    (id) => (
      <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl min-w-[260px]">
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{productName}</p>
          <p className="text-[11px] opacity-60">Agregado al pedido</p>
        </div>
        <button
          onClick={() => {
            toast.dismiss(id);
            onViewCart();
          }}
          className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Ver pedido ({itemCount})
        </button>
      </div>
    ),
    { duration: 3000, position: "bottom-center" }
  );
}

// ─── Main page ───────────────────────────────────────────────────────
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

  const { itemCount, items, clearCart, subtotal } = useCart();

  // Scroll detection for header shadow
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        .select("id, name, slug, price, sale_price, image_url, description, category:categories(name)")
        .eq("business_id", business!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Loading ──────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="size-6" />
          </div>
          <p className="text-sm font-medium text-foreground">Cargando tienda...</p>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Tienda no encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La tienda que buscas no existe o ha sido removida.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver al inicio <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  const $ = sym(business.currency);

  // Filtering
  const filtered = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ─── Handlers ────────────────────────────────────────────────────
  async function handleCheckout(data: CustomerData) {
    if (!business) return;
    const waPhone = business.whatsapp_phone;
    if (!waPhone) {
      setCheckoutError("El negocio no tiene configurado un número de WhatsApp.");
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
      const itemsPayload = items.map((i) => ({
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.quantity,
      }));

      await supabase.rpc("create_order", {
        p_business_id: business.id,
        p_customer_name: data.name,
        p_customer_phone: data.phone,
        p_customer_address: data.address || "",
        p_notes: data.notes || null,
        p_items: itemsPayload,
      });

      clearCart();
      setCartOpen(false);
    } catch (err) {
      console.error("Error creating order:", err);
    } finally {
      setCheckoutBusy(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Announcement bar ───────────────────────────────── */}
      <div className="bg-foreground text-background text-[11px] py-1.5 text-center tracking-wide font-light">
        <Sparkles className="mr-1.5 inline size-3 align-text-top opacity-60" />
        ENVÍO GRATIS EN PEDIDOS +{$}50
      </div>

      {/* ── Sticky header ──────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-background/90 backdrop-blur-xl transition-shadow duration-200",
          isScrolled ? "shadow-sm border-b border-border/40" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">

          {/* Logo + Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
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
          </div>

          {/* Desktop search */}
          <div className="hidden sm:flex flex-1 items-center gap-2 mx-4 rounded-xl bg-muted/60 border border-border/40 px-3.5 h-9 transition-all focus-within:border-primary/50 focus-within:bg-background">
            <Search className="size-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile search toggle */}
            <button
              className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Buscar"
            >
              <Search className="size-4.5" strokeWidth={1.5} />
            </button>

            <button
              className="hidden sm:grid text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Lista de deseos"
            >
              <Heart className="size-4.5" strokeWidth={1.5} />
            </button>

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background transition-all duration-200">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {searchOpen && (
          <div className="border-t border-border/40 bg-background px-4 py-2.5 sm:hidden">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/40 px-3 h-9 focus-within:border-primary/50">
              <Search className="size-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
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

        {/* Category pill bar */}
        {categories.length > 0 && (
          <div
            ref={categoryBarRef}
            className="flex gap-2 overflow-x-auto border-t border-border/40 px-4 py-2 scrollbar-none"
            role="navigation"
            aria-label="Categorías"
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                !selectedCategory
                  ? "bg-primary text-primary-foreground shadow-sm"
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
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">

        {/* ── Compact hero ───────────────────────────────────── */}
        <section className="border-b border-border/40 bg-gradient-to-b from-primary/[0.03] to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col items-center text-center gap-3">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="size-14 rounded-2xl object-cover ring-1 ring-border/50 shadow-sm"
                />
              )}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {business.name}
              </h1>
              <p className="text-sm text-muted-foreground font-light max-w-sm">
                Descubre nuestra colección. Ordena directo por WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* ── Product grid ───────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

          {/* Section heading */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : selectedCategory || "Todos los productos"}
              </h2>
              {!productsLoading && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Ver todos
              </button>
            )}
          </div>

          {/* Skeleton loading */}
          {productsLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!productsLoading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/40">
                <Package className="size-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {searchQuery ? "Sin resultados" : "No hay productos"}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {searchQuery
                  ? `No encontramos "${searchQuery}". Intenta con otro término.`
                  : selectedCategory
                  ? `No hay productos en "${selectedCategory}"`
                  : "Esta tienda aún no tiene productos publicados."}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                >
                  Ver todos los productos
                </Button>
              )}
            </div>
          )}

          {/* Product cards */}
          {!productsLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 lg:gap-6">
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

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-foreground text-background pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-10">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight mb-4">
              {business.logo_url && (
                <img src={business.logo_url} alt="" className="size-6 rounded-lg object-cover ring-1 ring-white/10" />
              )}
              {business.name}
            </div>
            <p className="text-xs text-background/50 font-light leading-relaxed mb-5">
              Productos de calidad. Pedidos directos por WhatsApp. Rápido y sin complicaciones.
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram" className="grid size-8 place-items-center rounded-full border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                <Instagram className="size-3.5" />
              </a>
              <a href="#" aria-label="Facebook" className="grid size-8 place-items-center rounded-full border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                <Facebook className="size-3.5" />
              </a>
              <a href="#" aria-label="Twitter/X" className="grid size-8 place-items-center rounded-full border border-background/10 text-background/50 hover:text-background hover:border-background/30 transition-all">
                <Twitter className="size-3.5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">
              Categorías
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
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">
              Soporte
            </h4>
            <ul className="space-y-2.5 text-xs text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-background transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Envíos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Devoluciones</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Términos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[10px] text-background/30">
            © 2024 {business.name}. Todos los derechos reservados.
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
      </footer>

      {/* ── Cart Drawer (multi-step) ───────────────────────── */}
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

// ─── Product Card ─────────────────────────────────────────────────────
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
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;
  const badge = getBadge(product.id);

  return (
    <Link
      to="/go/$slug/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className="group block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted mb-3 transition-shadow duration-300 group-hover:shadow-lg">
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/15" />
          </div>
        )}

        {/* Badge */}
        {badge && (
          <span
            className={cn(
              "absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badge.bg
            )}
          >
            {badge.emoji} {badge.label}
          </span>
        )}

        {/* Sale badge */}
        {hasSale && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white">
            Oferta
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-3">
          <span className="rounded-xl bg-white/95 backdrop-blur px-4 py-2 text-xs font-semibold text-foreground shadow-sm translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
            Ver producto
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-0.5">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {product.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
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

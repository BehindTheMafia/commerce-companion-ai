import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingBag, Sparkles, AlertCircle, Package,
  ArrowRight, Search, Heart, X, ChevronRight,
  Instagram, Facebook, Twitter, ExternalLink, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import type { CustomerData } from "@/components/storefront/checkout-form";

export const Route = createFileRoute("/go/$slug/")({
  component: StorefrontPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Commerce AI` },
      { name: "description", content: `Compra en ${params.slug} — productos con envío rápido y pago seguro.` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@200;300;400;500;600&display=swap",
      },
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

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-xl bg-stone-200 mb-3" />
      <div className="h-4 w-3/4 rounded bg-stone-200 mb-2" />
      <div className="h-3 w-1/3 rounded bg-stone-200" />
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
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#1A1A1A] text-[#C9A96E] shadow-lg animate-pulse">
            <Sparkles className="size-6 animate-spin duration-1000" />
          </div>
          <Loader2 className="size-4 animate-spin text-[#C9A96E]" />
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[#1A1A1A]">Tienda no encontrada</h1>
          <p className="mt-1.5 text-sm text-stone-500 font-light">
            La tienda que buscas no existe o ha sido removida.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#C9A96E] underline underline-offset-4"
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
    <div 
      className="flex min-h-screen flex-col bg-[#FAF8F5] text-[#1A1A1A] antialiased"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Announcement bar */}
      <div className="bg-[#1A1A1A] text-white text-[11px] py-2 text-center tracking-widest uppercase font-light">
        ✨ ENVÍO GRATIS EN PEDIDOS +{$}50 | CÓDIGO: <span className="font-semibold text-[#C9A96E]">COMPRAAI</span>
      </div>

      {/* Sticky header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 border-b",
          isScrolled 
            ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-sm border-stone-200/60" 
            : "bg-[#FAF8F5]/80 backdrop-blur-md border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6 justify-between">
          <Link
            to="/go/$slug"
            params={{ slug }}
            className="text-2xl font-medium tracking-widest text-[#1A1A1A] hover:text-[#C9A96E] transition-colors"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {business.name.toUpperCase()}
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Search toggle (Desktop & Mobile input) */}
            <div className="relative flex items-center">
              <button
                className="text-[#1A1A1A] hover:text-[#C9A96E] transition-colors p-1"
                onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) setSearchQuery(""); }}
                aria-label="Buscar"
              >
                <Search className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <button
              onClick={() => setCartOpen(true)}
              className="relative text-[#1A1A1A] hover:text-[#C9A96E] transition-colors"
              aria-label={`Carrito (${itemCount} productos)`}
            >
              <div className="relative p-1">
                <ShoppingBag className="size-5" strokeWidth={1.5} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-[#1A1A1A] text-[9px] font-semibold text-white ring-2 ring-[#FAF8F5]">
                    {itemCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Search Input Panel */}
        {searchOpen && (
          <div className="border-t border-stone-200/60 bg-[#FAF8F5] px-6 py-3.5 animate-in slide-in-from-top-1 duration-150">
            <div className="mx-auto max-w-2xl flex items-center gap-2 rounded-md bg-white border border-stone-200 px-3.5 h-11 focus-within:border-[#1A1A1A]">
              <Search className="size-4 text-stone-400 shrink-0" strokeWidth={1.5} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                className="flex-1 bg-transparent text-xs text-[#1A1A1A] placeholder-stone-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-black transition-colors">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categories Bar */}
        {categories.length > 0 && (
          <div className="border-t border-stone-200/60">
            <div className="mx-auto max-w-7xl px-6">
              <div
                ref={categoryBarRef}
                className="flex gap-3 overflow-x-auto py-3.5 scrollbar-none [-webkit-overflow-scrolling:touch]"
                role="navigation"
                aria-label="Categorías"
              >
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-xs font-light tracking-wide transition-all duration-200 border",
                    !selectedCategory
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-sm font-normal"
                      : "border-stone-200 text-stone-600 bg-white hover:border-[#1A1A1A]/60"
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
                      "shrink-0 rounded-full px-4 py-1.5 text-xs font-light tracking-wide transition-all duration-200 whitespace-nowrap border",
                      selectedCategory === cat.name
                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white shadow-sm font-normal"
                        : "border-stone-200 text-stone-600 bg-white hover:border-[#1A1A1A]/60"
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
        <section className="border-b border-stone-200/60 bg-gradient-to-b from-[#1A1A1A]/[0.02] to-transparent">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="size-16 rounded-full object-cover ring-2 ring-stone-200 shadow-sm mb-2"
                />
              )}
              <h1 
                className="text-4xl lg:text-5xl font-light text-[#1A1A1A] tracking-tight leading-none"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {business.name}
              </h1>
              <p className="text-sm font-light text-stone-500 max-w-sm leading-relaxed">
                Descubre nuestra cuidada selección de productos. Haz tu pedido y envíalo directo por WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* Product Grid Section */}
        <section className="mx-auto max-w-7xl px-6 py-12">
          {/* Section heading */}
          <div className="mb-8 flex items-end justify-between border-b border-stone-200 pb-4">
            <div>
              <h2 
                className="text-2xl lg:text-3xl font-light text-[#1A1A1A] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {searchQuery
                  ? `Resultados para "${searchQuery}"`
                  : selectedCategory || "Todos los productos"}
              </h2>
              {!productsLoading && (
                <p className="mt-1 text-xs text-stone-500 font-light">
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="text-xs font-medium underline underline-offset-4 decoration-stone-300 hover:decoration-[#1A1A1A] transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Skeleton Loader */}
          {productsLoading && (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!productsLoading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-stone-100 text-stone-400 mb-4 border border-stone-200/50">
                <Package className="size-7" />
              </div>
              <h3 
                className="text-lg font-light text-stone-800"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {searchQuery ? "Sin resultados" : "No hay productos disponibles"}
              </h3>
              <p className="mt-2 text-xs text-stone-500 max-w-xs mx-auto font-light">
                {searchQuery
                  ? `No encontramos productos relacionados con "${searchQuery}". Intenta buscar con otro término.`
                  : "Por el momento esta tienda no tiene productos publicados."}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 rounded-md border-stone-200 hover:border-black text-xs font-light"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                >
                  Ver todos los productos
                </Button>
              )}
            </div>
          )}

          {/* Product Cards Grid */}
          {!productsLoading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
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
      <footer className="bg-[#1A1A1A] text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
          <div className="col-span-1 md:col-span-1">
            <span 
              className="text-2xl tracking-widest block mb-6 font-medium"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {business.name.toUpperCase()}
            </span>
            <p className="text-xs text-white/50 font-light leading-relaxed mb-6">
              Redefiniendo el comercio digital con un proceso limpio, rápido y directo por WhatsApp.
            </p>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram" className="text-white/50 hover:text-white transition-colors">
                <Instagram className="size-4" />
              </a>
              <a href="#" aria-label="Facebook" className="text-white/50 hover:text-white transition-colors">
                <Facebook className="size-4" />
              </a>
              <a href="#" aria-label="Twitter" className="text-white/50 hover:text-white transition-colors">
                <Twitter className="size-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Tienda</h4>
            <ul className="space-y-3 text-xs font-light text-white/50">
              <li>
                <button onClick={() => setSelectedCategory(null)} className="hover:text-white transition-colors">
                  Catálogo Completo
                </button>
              </li>
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <button onClick={() => setSelectedCategory(cat.name)} className="hover:text-white transition-colors">
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Soporte</h4>
            <ul className="space-y-3 text-xs font-light text-white/50">
              <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Envíos</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3 text-xs font-light text-white/50">
              <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Términos</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-white/40 font-light">© 2024 {business.name}. Todos los derechos reservados.</p>
          <div className="flex gap-1.5 items-center text-[10px] text-white/40 font-light">
            Powered by{" "}
            <a
              href="https://commerceai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-white/60 underline underline-offset-4 hover:text-white transition-colors"
            >
              Commerce AI <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
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
  const badge = getBadge(product.id);

  return (
    <Link
      to="/go/$slug/product/$productSlug"
      params={{ slug: storeSlug, productSlug: product.slug }}
      className="group block w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 rounded-md"
      aria-label={`Ver ${product.name}, ${$}${displayPrice.toFixed(2)}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-[#F0EFED] mb-4 transition-all duration-300 group-hover:shadow-sm border border-stone-200/40">
        {product.image_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#F0EFED] animate-pulse" />
            )}
            <img
              src={product.image_url}
              alt={product.name}
              className={cn(
                "size-full object-cover object-center transition-all duration-700",
                imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                "group-hover:scale-105"
              )}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-10 text-stone-300" />
          </div>
        )}

        {/* Flashing badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {badge && (
            <span className={cn("rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wider", badge.bg)}>
              {badge.emoji} {badge.label.toUpperCase()}
            </span>
          )}
          {hasSale && (
            <span className="rounded-full bg-red-900 px-2.5 py-0.5 text-[9px] font-semibold text-white tracking-wider">
              OFERTA
            </span>
          )}
        </div>

        {/* Plus Quick add action button */}
        <span className="absolute bottom-3 right-3 w-8 h-8 bg-[#FAF8F5]/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-sm border border-stone-200">
          <Plus className="size-4 text-[#1A1A1A]" />
        </span>
      </div>

      <div className="px-0.5">
        <h3 
          className="text-base font-normal text-[#1A1A1A] leading-snug line-clamp-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {product.name}
        </h3>
        <p className="text-xs text-stone-500 mt-1 font-light">
          {hasSale ? (
            <>
              <span className="text-red-900 font-normal mr-1.5">{$}{displayPrice.toFixed(2)}</span>
              <span className="line-through text-stone-400">{$}{product.price.toFixed(2)}</span>
            </>
          ) : (
            `$${product.price.toFixed(2)}`
          )}
        </p>
      </div>
    </Link>
  );
}

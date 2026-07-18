import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  AlertCircle,
  Package,
  ArrowRight,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Heart,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useCart, type CartProduct } from "@/lib/cart-context";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import type { CustomerData } from "@/components/storefront/checkout-form";
import { toast } from "sonner";

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

type Business = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  whatsapp_phone: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  category: { name: string; slug: string } | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  MXN: "$",
  COP: "$",
  BRL: "R$",
};
const sym = (c: string) => CURRENCY_SYMBOL[c] || "$";

function isNewProduct(createdAt: string) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > weekAgo;
}

function ProductDetailPage() {
  const { slug, productSlug } = useParams({
    from: "/go/$slug/product/$productSlug",
  });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { addItem, itemCount, items, clearCart, subtotal } = useCart();
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const { data: business, isLoading: bizLoading } = useQuery({
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
      if (!wa.error && wa.data?.whatsapp_phone) whatsapp_phone = wa.data.whatsapp_phone;
      return { ...data, whatsapp_phone };
    },
  });

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

  const { data: related = [] } = useQuery({
    queryKey: ["sf-related", business?.id, product?.id],
    enabled: !!business && !!product,
    queryFn: async (): Promise<Product[]> => {
      const query = supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)",
        )
        .eq("business_id", business!.id)
        .eq("status", "active")
        .neq("id", product!.id)
        .limit(5);
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
      const { data } = await query;
      return data ?? [];
    },
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
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <ShoppingBag className="size-3.5" />
          </div>
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
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
    );
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

  const $ = sym(business.currency);
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;
  const showNewBadge = isNewProduct(product.created_at);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground antialiased font-sans">
      {/* Announcement */}
      <div className="bg-foreground text-background text-[11px] py-2 text-center tracking-widest uppercase font-medium">
        Envio gratis en pedidos +{$}50
      </div>

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 bg-background/95 backdrop-blur-xl",
          isScrolled ? "shadow-sm border-b border-border/50" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <Link to="/go/$slug" params={{ slug }} className="flex items-center gap-2.5 group">
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
            <span className="text-lg font-semibold tracking-tight text-foreground">
              {business.name}
            </span>
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted/50"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 grid min-w-[16px] h-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12 py-8 lg:py-12">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 lg:mb-12 flex items-center gap-2 text-[11px] text-muted-foreground"
          >
            <Link
              to="/go/$slug"
              params={{ slug }}
              className="hover:text-foreground transition-colors underline underline-offset-2"
            >
              Inicio
            </Link>
            <ChevronRight className="size-3 opacity-40" />
            {product.category?.name && (
              <>
                <span className="text-muted-foreground">{product.category.name}</span>
                <ChevronRight className="size-3 opacity-40" />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[180px]">
              {product.name}
            </span>
          </nav>

          {/* Product Grid: 58% / 42% */}
          <div
            className="grid gap-12 lg:gap-16"
            style={{ gridTemplateColumns: "minmax(0, 58fr) minmax(0, 42fr)" }}
          >
            {/* Gallery — sticky on desktop */}
            <div ref={galleryRef} className="relative">
              <div className="lg:sticky lg:top-[110px]">
                {/* Main Image */}
                <div
                  className="relative w-full overflow-hidden bg-[#FAFAFA]"
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: "28px",
                    padding: "clamp(16px, 2vw, 24px)",
                  }}
                >
                  {product.image_url && !imgError ? (
                    <>
                      {!imgLoaded && (
                        <div className="absolute inset-[clamp(16px,2vw,24px)] rounded-[20px] bg-muted animate-pulse" />
                      )}
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="absolute inset-[clamp(16px,2vw,24px)] w-[calc(100%-clamp(32px,4vw,48px))] h-[calc(100%-clamp(32px,4vw,48px))] object-cover rounded-[20px]"
                        style={{
                          opacity: imgLoaded ? 1 : 0,
                          transition: "opacity .3s cubic-bezier(.22,.61,.36,1)",
                        }}
                        loading="eager"
                        onLoad={() => setImgLoaded(true)}
                        onError={() => setImgError(true)}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-[clamp(16px,2vw,24px)] rounded-[20px] flex items-center justify-center bg-muted/30">
                      <Package className="size-16 text-muted-foreground/15" strokeWidth={1} />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute left-5 top-5 flex flex-col gap-2 z-10">
                    {showNewBadge && (
                      <span className="rounded-lg bg-background/90 backdrop-blur-md text-foreground border border-border/40 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold shadow-sm">
                        Nuevo
                      </span>
                    )}
                    {hasSale && (
                      <span className="rounded-lg bg-destructive/90 backdrop-blur-md text-white px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold shadow-sm">
                        Oferta
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails — horizontal, snap on mobile */}
                <div className="mt-3 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      key={i}
                      className="shrink-0 snap-start rounded-2xl overflow-hidden border-2 border-primary/20 transition-all duration-250"
                      style={{
                        width: "96px",
                        height: "96px",
                        boxShadow: i === 0 ? "0 8px 24px rgba(0,0,0,.08)" : undefined,
                      }}
                    >
                      {product.image_url && !imgError ? (
                        <img
                          src={product.image_url}
                          alt={`Vista ${i + 1}`}
                          className={cn(
                            "size-full object-cover transition-all duration-250",
                            i === 0
                              ? "opacity-100"
                              : "opacity-50 hover:opacity-100 hover:scale-[1.04]",
                          )}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-muted/30">
                          <Package className="size-5 text-muted-foreground/20" strokeWidth={1} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Info — max-width 520px, left-aligned */}
            <div className="flex flex-col max-w-[520px]">
              {/* Rating */}
              <div className="mb-3 flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="size-3.5 text-foreground"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[32px] md:text-[40px] lg:text-[48px] font-semibold text-foreground leading-[1.1] tracking-tight line-clamp-2">
                {product.name}
              </h1>

              {/* Price — mt: 12px */}
              <div className="mt-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "text-[36px] md:text-[40px] lg:text-[42px] font-semibold tracking-[-0.02em]",
                      hasSale ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {$}
                    {displayPrice.toFixed(2)}
                  </span>
                  {hasSale && (
                    <span className="text-lg text-muted-foreground line-through">
                      {$}
                      {product.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Variants — mt: 28px from price */}
              <div className="mt-7">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground mb-3 block">
                  Opcion / Tamano
                </span>
                <div className="flex flex-wrap gap-3">
                  {["Estándar", "Premium"].map((size) => (
                    <button
                      key={size}
                      className="min-h-[52px] px-6 rounded-full text-sm font-medium transition-all duration-200 border-2 border-primary bg-primary text-primary-foreground"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes — mt: 24px from variants */}
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
                  className="w-full rounded-2xl border border-border/50 bg-muted/30 px-[18px] text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30"
                  style={{ height: "56px" }}
                />
              </div>

              {/* Quantity + CTA — mt: 24px from notes */}
              <div className="mt-6 flex items-center gap-4">
                {/* Quantity */}
                <div
                  className="flex items-center border border-border/50 rounded-full justify-between px-1 bg-transparent shrink-0"
                  style={{ height: "56px", width: "120px" }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid size-12 place-items-center text-muted-foreground hover:text-foreground transition-colors rounded-full"
                    aria-label="Restar uno"
                  >
                    <Minus className="size-4" strokeWidth={1.5} />
                  </button>
                  <span className="text-sm font-semibold tabular-nums -ml-2">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="grid size-12 place-items-center text-muted-foreground hover:text-foreground transition-colors rounded-full"
                    aria-label="Sumar uno"
                  >
                    <Plus className="size-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* CTA */}
                <button
                  onClick={handleAddToCart}
                  className="flex-1 rounded-full text-background font-semibold text-sm tracking-[.04em] flex items-center justify-center gap-3 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    height: "60px",
                    minWidth: "280px",
                    background: "var(--color-foreground)",
                    boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                  }}
                >
                  <ShoppingBag className="size-4" strokeWidth={1.5} />
                  <span>Agregar al pedido</span>
                  <span className="w-1 h-1 bg-background/40 rounded-full" />
                  <span>
                    {$}
                    {(displayPrice * quantity).toFixed(2)}
                  </span>
                </button>

                {/* Wishlist */}
                <button
                  aria-label="Agregar a favoritos"
                  className="size-[56px] flex items-center justify-center border border-border/50 rounded-full hover:border-foreground/30 transition-colors bg-transparent text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Heart className="size-5" strokeWidth={1.25} />
                </button>
              </div>

              {/* Delivery info */}
              <div className="mt-9 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary opacity-70" />
                </div>
                Envio gratis en pedidos mayores a {$}50
              </div>

              {/* Accordions — mt: 36px from CTA */}
              <div className="mt-9 space-y-0 divide-y divide-border/40">
                <details className="group" open>
                  <summary
                    className="flex items-center justify-between cursor-pointer select-none list-none"
                    style={{ height: "60px" }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
                      Descripcion
                    </span>
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform duration-250 group-open:rotate-180"
                      strokeWidth={1.5}
                    />
                  </summary>
                  <div className="pb-6 text-sm text-muted-foreground leading-relaxed">
                    {product.description || "Sin descripcion disponible."}
                  </div>
                </details>

                <details className="group">
                  <summary
                    className="flex items-center justify-between cursor-pointer select-none list-none"
                    style={{ height: "60px" }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground">
                      Envios y Devoluciones
                    </span>
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform duration-250 group-open:rotate-180"
                      strokeWidth={1.5}
                    />
                  </summary>
                  <div className="pb-6 text-sm text-muted-foreground leading-relaxed">
                    Envio gratis en pedidos de mas de {$}50. Los plazos y costos se coordinan
                    directamente por WhatsApp al enviar tu pedido.
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {related.length > 0 && (
            <section className="mt-20 lg:mt-28 border-t border-border/40 pt-16">
              <div className="mb-10 flex items-end justify-between">
                <h2 className="text-xl lg:text-2xl font-semibold text-foreground tracking-tight">
                  Completa tu Pedido
                </h2>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Ver Todos
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-8">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    to="/go/$slug/product/$productSlug"
                    params={{ slug, productSlug: p.slug }}
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
                      {p.sale_price ? (
                        <>
                          <span className="text-destructive">
                            {$}
                            {p.sale_price.toFixed(2)}
                          </span>
                          <span className="ml-1.5 text-xs text-muted-foreground line-through font-normal">
                            {$}
                            {p.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-foreground">
                          {$}
                          {p.price.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bottom spacing */}
          <div className="h-20" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 pt-16 pb-10 mt-auto">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight mb-4">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt=""
                  className="size-7 rounded-xl object-cover ring-1 ring-border/50"
                />
              )}
              {business.name}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5 max-w-xs">
              Productos de calidad. Pedidos directos por WhatsApp.
            </p>
            <div className="flex gap-2.5">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid size-9 place-items-center rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  <Icon className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
              Tienda
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  className="hover:text-foreground transition-colors"
                >
                  Catalogo Completo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
              Soporte
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Envios
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Terminos
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[10px] text-muted-foreground">
            &copy; {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            Powered by{" "}
            <a
              href="https://hyperbeecommerce.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
            >
              Commerce AI <ExternalLink className="size-2.5" />
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

import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, AlertCircle, Package, ArrowRight, ChevronRight,
  Minus, Plus, ShoppingBag, Heart, Star, Sparkles,
  ExternalLink, Facebook, Twitter, Instagram, ChevronDown, CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
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
      { name: "description", content: `Detalles del producto ${params.productSlug} en la tienda ${params.slug}.` },
    ],
  }),
});

type Business = {
  id: string; name: string; slug: string;
  logo_url: string | null; currency: string;
  whatsapp_phone: string | null;
};
type Product = {
  id: string; name: string; slug: string; price: number;
  sale_price: number | null; image_url: string | null;
  description: string | null;
  category: { name: string; slug: string } | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$",
};
const sym = (c: string) => CURRENCY_SYMBOL[c] || "$";

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

function getCategoryMocks(categoryName: string, productName: string) {
  const cat = (categoryName || "").toLowerCase();
  const prod = productName.toLowerCase();

  if (cat.includes("beauty") || cat.includes("cosmetic") || cat.includes("skin") || cat.includes("belleza") || cat.includes("cuidado") || prod.includes("serum") || prod.includes("crema") || prod.includes("shampoo")) {
    return {
      sizes: ["30ml", "50ml (+ $15.00)", "100ml (+ $30.00)"],
      ingredients: "Aqua, Hyaluronic Acid, Vitamin C, Organic Aloe Barbadensis Leaf Juice, Glycerin, Phenoxyethanol.",
      badges: ["Vegano", "Cruelty Free", "Probado Dermatológicamente"]
    };
  }
  if (cat.includes("burger") || cat.includes("hamburguesa") || cat.includes("pizza") || cat.includes("comida") || cat.includes("food") || cat.includes("bebida") || cat.includes("cafe")) {
    return {
      sizes: ["Mediano", "Grande (+ $3.00)"],
      ingredients: "Ingredientes 100% frescos y naturales seleccionados diariamente de productores locales.",
      badges: ["Hecho Al Instante", "100% Natural", "Ingredientes Locales"]
    };
  }
  if (cat.includes("ropa") || cat.includes("clothing") || cat.includes("moda") || cat.includes("t-shirt") || cat.includes("camisa") || cat.includes("zapatos")) {
    return {
      sizes: ["S", "M", "L (+ $2.00)", "XL (+ $4.00)"],
      ingredients: "100% Algodón orgánico premium, teñido ecológico certificado de larga duración.",
      badges: ["Algodón Orgánico", "Producción Ética", "Ajuste Cómodo"]
    };
  }
  return {
    sizes: ["Estándar", "Premium (+ $5.00)"],
    ingredients: "Materiales e insumos premium seleccionados cuidadosamente para garantizar la mejor durabilidad y experiencia.",
    badges: ["Calidad Garantizada", "Diseño Ergonómico", "Soporte Commerce AI"]
  };
}

function getMockReview(productName: string) {
  const sum = productName.charCodeAt(0) + productName.charCodeAt(productName.length - 1);
  const reviews = [
    `"Superó mis expectativas por completo. La calidad es increíble y el envío fue sumamente rápido. Definitivamente volveré a pedir."`,
    `"Excelente producto. El empaque es hermoso y los resultados se notan desde el primer día. Altamente recomendado."`,
    `"Increíble relación calidad-precio. Me encanta el minimalismo y el detalle en la presentación de la marca. 10/10."`,
    `"Muy satisfecho con la compra. El proceso fue súper fluido y rápido a través de WhatsApp. ¡Recomendado!"`
  ];
  const authors = ["María G.", "Julián R.", "Valeria M.", "Esteban C."];
  return {
    text: reviews[sum % reviews.length],
    author: authors[sum % authors.length]
  };
}

function ProductDetailPage() {
  const { slug, productSlug } = useParams({ from: "/go/$slug/product/$productSlug" });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedSize, setSelectedSize] = useState(0);

  const { addItem, itemCount, items, clearCart, subtotal } = useCart();

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
        .select("id, name, slug, price, sale_price, image_url, description, category:categories(name, slug)")
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
      let query = supabase
        .from("products")
        .select("id, name, slug, price, sale_price, image_url, description, category:categories(name, slug)")
        .eq("business_id", business!.id)
        .eq("status", "active")
        .neq("id", product!.id)
        .limit(4);
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
            .select("id, name, slug, price, sale_price, image_url, description, category:categories(name, slug)")
            .eq("business_id", business!.id)
            .eq("status", "active")
            .eq("category_id", cats.id)
            .neq("id", product!.id)
            .limit(4);
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

  function handleAddToCart() {
    if (!product) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: `${product.name} (${mocks.sizes[selectedSize].split(" ")[0]})`,
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
            <Sparkles className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{product.name}</p>
            <p className="text-[11px] opacity-60">Agregado al pedido</p>
          </div>
          <button
            onClick={() => { toast.dismiss(id); setCartOpen(true); }}
            className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Ver pedido ({itemCount + quantity})
          </button>
        </div>
      ),
      { duration: 3000, position: "bottom-center" }
    );
  }

  // ─── Loading / Not Found ──────────────────────────────────────────
  if (bizLoading || productLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="size-6" />
          </div>
          <p className="text-sm font-medium text-foreground">Cargando producto...</p>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!business || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Producto no encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este producto no existe o ya no está disponible.
          </p>
          <Link
            to="/go/$slug"
            params={{ slug }}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver a la tienda <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  const $ = sym(business.currency);
  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;

  const mocks = getCategoryMocks(product.category?.name || "", product.name);
  const review = getMockReview(product.name);
  const badge = getBadge(product.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Announcement bar ─────────────────────────────── */}
      <div className="bg-foreground text-background text-[11px] py-1.5 text-center tracking-wide font-light">
        <Sparkles className="mr-1.5 inline size-3 align-text-top opacity-60" />
        ENVÍO GRATIS EN PEDIDOS +{$}50
      </div>

      {/* ── Sticky header ────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-background/90 backdrop-blur-xl transition-shadow duration-200",
          isScrolled ? "shadow-sm border-b border-border/40" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/go/$slug"
            params={{ slug }}
            className="text-base font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt=""
                  className="size-7 rounded-xl object-cover ring-1 ring-border/50 shrink-0"
                />
              )}
              {business.name}
            </span>
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-12">

          {/* ── Breadcrumb ───────────────────────────────── */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link to="/go/$slug" params={{ slug }} className="hover:text-foreground transition-colors underline underline-offset-2">
              Inicio
            </Link>
            <ChevronRight className="size-3" />
            {product.category?.name && (
              <>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  className="hover:text-foreground transition-colors underline underline-offset-2"
                >
                  {product.category.name}
                </Link>
                <ChevronRight className="size-3" />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[160px]">
              {product.name}
            </span>
          </nav>

          {/* ── Product detail grid ──────────────────────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">

            {/* ── Gallery — left 7 cols ─────────────────── */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted group">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Package className="size-20 text-muted-foreground/20" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  {badge && (
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold shadow-sm", badge.bg)}>
                      {badge.emoji} {badge.label}
                    </span>
                  )}
                  {hasSale && (
                    <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      Oferta
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    className={cn(
                      "aspect-square overflow-hidden rounded-xl bg-muted border transition-all duration-200",
                      i === 0 ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border/40 hover:border-foreground/30"
                    )}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={`Vista ${i + 1}`}
                        className={cn("size-full object-cover transition-opacity", i === 0 ? "opacity-100" : "opacity-60 hover:opacity-100")}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package className="size-5 text-muted-foreground/20" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Info panel — right 5 cols ─────────────── */}
            <div className="lg:col-span-5 flex flex-col">

              {/* Rating */}
              <div className="mb-4 flex items-center gap-1.5 text-yellow-500 text-xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <Star key={starIndex} className="size-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-muted-foreground text-xs underline cursor-pointer hover:text-foreground transition-colors ml-1">
                  124 Reseñas
                </span>
              </div>

              {/* Product name */}
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-baseline gap-3">
                  <span className={cn("text-2xl font-bold", hasSale ? "text-destructive" : "text-foreground")}>
                    {$}{displayPrice.toFixed(2)}
                  </span>
                  {hasSale && (
                    <span className="text-base text-muted-foreground line-through">
                      {$}{product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Size / Option Selector */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-foreground mb-3 block">
                  Opción / Tamaño
                </span>
                <div className="flex flex-wrap gap-2">
                  {mocks.sizes.map((size, index) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(index)}
                      className={cn(
                        "px-4 py-2 border rounded-xl text-xs font-semibold transition-all duration-200",
                        selectedSize === index
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border text-muted-foreground bg-background hover:border-foreground/40 hover:text-foreground"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-foreground mb-3 block">
                  Notas (opcional)
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Sin cebolla, extra queso..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 h-10 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Quantity & CTA */}
              <div className="flex gap-3 mb-6">
                <div className="flex items-center border border-border rounded-xl w-28 justify-between px-3 bg-background h-12">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Restar uno"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="text-sm font-semibold tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Sumar uno"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 h-12 shadow-sm"
                >
                  <ShoppingBag className="size-4" strokeWidth={1.5} />
                  <span>Agregar al pedido</span>
                  <span className="w-1 h-1 bg-primary-foreground/50 rounded-full"></span>
                  <span>{$}{(displayPrice * quantity).toFixed(2)}</span>
                </button>

                <button
                  aria-label="Agregar a favoritos"
                  className="size-12 flex items-center justify-center border border-border rounded-xl hover:border-foreground/40 transition-colors bg-background shrink-0"
                >
                  <Heart className="size-4.5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Urgency banner */}
              <div className="flex items-center gap-2.5 bg-muted/60 border border-border/40 p-3.5 rounded-xl mb-8">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  12 personas están viendo este producto
                </span>
              </div>

              {/* Accordions */}
              <div className="space-y-0 divide-y divide-border">
                <details className="group py-4 cursor-pointer" open>
                  <summary className="flex items-center justify-between text-xs font-semibold text-foreground select-none list-none">
                    Descripción
                    <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>Detalle seleccionado de la mejor calidad. Preparado con especial cuidado y dedicación para garantizar la satisfacción completa de nuestros clientes.</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li>Elaborado con procesos certificados</li>
                      <li>Detalles premium únicos en el mercado</li>
                      <li>Entrega y soporte directo por WhatsApp</li>
                    </ul>
                  </div>
                </details>

                <details className="group py-4 cursor-pointer">
                  <summary className="flex items-center justify-between text-xs font-semibold text-foreground select-none list-none">
                    Detalles y Composición
                    <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {mocks.ingredients}
                  </div>
                </details>

                <details className="group py-4 cursor-pointer">
                  <summary className="flex items-center justify-between text-xs font-semibold text-foreground select-none list-none">
                    Envíos y Devoluciones
                    <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Envío gratis en pedidos de más de {$}50. Los plazos y costos específicos se coordinan directamente en el chat al enviar tu pedido.
                  </div>
                </details>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-border">
                {mocks.badges.map((badgeText, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center gap-2">
                    <CheckCircle2 className="size-5 text-primary" strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{badgeText}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── Related products ──────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-16 border-t border-border pt-12">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    to="/go/$slug/product/$productSlug"
                    params={{ slug, productSlug: p.slug }}
                    className="group block"
                  >
                    <div className="aspect-[3/4] bg-muted rounded-2xl overflow-hidden mb-3 relative border border-border/40">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <Package className="size-10 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {p.sale_price ? (
                        <>
                          <span className="text-destructive">{$}{p.sale_price.toFixed(2)}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground line-through font-normal">{$}{p.price.toFixed(2)}</span>
                        </>
                      ) : (
                        `${$}${p.price.toFixed(2)}`
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Testimonial ───────────────────────────────── */}
          <section className="mt-16 border-t border-border pt-12 pb-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center gap-0.5 text-yellow-500 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="text-base font-medium text-foreground leading-relaxed italic">
                {review.text}
              </p>
              <div className="flex flex-col items-center gap-1 mt-4">
                <span className="text-xs font-semibold text-foreground">
                  {review.author}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-primary" /> Comprador verificado
                </span>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
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
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">Categorías</h4>
            <ul className="space-y-2.5 text-xs text-background/50">
              <li><Link to="/go/$slug" params={{ slug }} className="hover:text-background transition-colors">Todos los productos</Link></li>
              <li><a href="#" className="hover:text-background transition-colors">Nuevos Ingresos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Populares</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">Soporte</h4>
            <ul className="space-y-2.5 text-xs text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-background transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Envíos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Devoluciones</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-5 text-background/60">Legal</h4>
            <ul className="space-y-2.5 text-xs text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Términos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[10px] text-background/30">© 2024 {business.name}. Todos los derechos reservados.</p>
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

      {/* ── Cart Drawer ──────────────────────────────────── */}
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

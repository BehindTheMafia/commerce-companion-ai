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
    links: [],
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
  description: string | null; created_at: string;
  category: { name: string; slug: string } | null;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$",
};
const sym = (c: string) => CURRENCY_SYMBOL[c] || "$";

// Dynamic Category mock details helper
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

// Deterministic mock reviews selector
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

  // ─── Queries ──────────────────────────────────────────────────────
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
        .select("id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)")
        .eq("business_id", business!.id)
        .eq("slug", productSlug)
        .eq("status", "active")
        .maybeSingle();
      return data ?? null;
    },
  });

  // Related products
  const { data: related = [] } = useQuery({
    queryKey: ["sf-related", business?.id, product?.id],
    enabled: !!business && !!product,
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)")
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
            .select("id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)")
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

  // ─── Checkout ─────────────────────────────────────────────────────
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
            <p className="text-xs font-semibold truncate text-background">{product.name}</p>
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
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/10 animate-pulse">
            <Sparkles className="size-6 animate-spin duration-1000" />
          </div>
          <Loader2 className="size-5 animate-spin text-primary" />
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 font-sans">
      {/* ── Announcement bar ─────────────────────────────── */}
      <div className="bg-foreground text-background text-[11px] py-2 text-center tracking-widest uppercase font-light">
        ✨ ENVÍO GRATIS EN PEDIDOS +{$}50 | CÓDIGO: <span className="font-semibold text-primary">COMPRAAI</span>
      </div>

      {/* ── Sticky header ────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 border-b bg-background/95 backdrop-blur-md",
          isScrolled 
            ? "shadow-sm border-border/60" 
            : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            to="/go/$slug"
            params={{ slug }}
            className="text-2xl font-medium tracking-widest text-foreground hover:text-primary transition-colors font-display"
          >
            {business.name.toUpperCase()}
          </Link>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative text-foreground hover:text-primary transition-colors"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <div className="relative p-1">
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground ring-2 ring-background">
                  {itemCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:py-12">

          {/* ── Breadcrumb ───────────────────────────────── */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-light"
          >
            <Link to="/go/$slug" params={{ slug }} className="hover:text-foreground transition-colors">
              Inicio
            </Link>
            <ChevronRight className="size-2.5 opacity-55" />
            {product.category?.name && (
              <>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category.name}
                </Link>
                <ChevronRight className="size-2.5 opacity-55" />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[160px]">
              {product.name}
            </span>
          </nav>

          {/* ── Product detail grid ──────────────────────── */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">

            {/* ── Gallery — left 7 cols ─────────────────── */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Main image */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-muted group border border-border/40">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Package className="size-20 text-muted-foreground/30" />
                  </div>
                )}

                {/* BESTSELLER / Sale Badge */}
                <div className="absolute left-4 top-4 flex flex-col gap-2">
                  <span className="bg-background/80 backdrop-blur-md border border-border px-3 py-1 rounded-full text-[9px] font-semibold tracking-widest text-foreground">
                    BESTSELLER
                  </span>
                  {hasSale && (
                    <span className="bg-destructive/10 backdrop-blur-md border border-destructive/20 px-3 py-1 rounded-full text-[9px] font-semibold tracking-widest text-destructive">
                      OFERTA
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    className={cn(
                      "aspect-square overflow-hidden rounded-md bg-muted border transition-all duration-200",
                      i === 0 ? "border-primary" : "border-transparent hover:border-border"
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
              
              {/* Rating stars */}
              <div className="mb-4 flex items-center gap-1.5 text-primary text-xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <Star key={starIndex} className="size-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-muted-foreground font-light text-[11px] underline cursor-pointer hover:text-foreground transition-colors ml-1">
                  124 Reseñas
                </span>
              </div>

              {/* Product name */}
              <h1 
                className="mb-2 text-4xl lg:text-5xl font-light text-foreground tracking-tight leading-tight font-display"
              >
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-light text-foreground">
                    {$}{displayPrice.toFixed(2)}
                  </span>
                  {hasSale && (
                    <span className="text-base text-muted-foreground line-through font-light">
                      {$}{product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                
                {product.description && (
                  <p className="mt-4 text-sm font-light text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Size / Option Selector */}
              <div className="mb-6">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground mb-3 block">
                  Opción / Tamaño
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {mocks.sizes.map((size, index) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(index)}
                      className={cn(
                        "px-4 py-2 border rounded-md text-xs tracking-wider transition-all duration-200 font-light focus:outline-none",
                        selectedSize === index
                          ? "border-primary bg-primary text-primary-foreground shadow-sm font-normal"
                          : "border-border text-muted-foreground bg-background hover:border-primary/60"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label
                  htmlFor="pd-notes"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Observaciones (opcional)
                </label>
                <textarea
                  id="pd-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sin picante, sin cebolla, alergia a..."
                  rows={2}
                  className="w-full resize-none rounded-md border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/50 transition-colors focus:border-primary focus:outline-none"
                />
              </div>

              {/* Quantity counter & CTA button */}
              <div className="flex gap-4 mb-6">
                <div className="flex items-center border border-border rounded-md w-28 justify-between px-3.5 bg-background h-12">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Restar uno"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="text-sm font-medium tabular-nums">{quantity}</span>
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
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all rounded-md py-3 text-xs tracking-widest font-semibold flex items-center justify-center gap-2 h-12 uppercase"
                >
                  <span>Agregar al pedido</span>
                  <span className="w-1 h-1 bg-primary-foreground/75 rounded-full"></span>
                  <span>{$}{(displayPrice * quantity).toFixed(2)}</span>
                </button>
                
                <button
                  aria-label="Agregar a favoritos"
                  className="w-12 h-12 flex items-center justify-center border border-border rounded-md hover:border-primary transition-colors bg-background"
                >
                  <Heart className="size-4.5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Social Proof / Urgency banner */}
              <div className="flex items-center gap-2.5 bg-muted border border-border p-3.5 rounded-md mb-8">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  12 personas están viendo este producto en este momento
                </span>
              </div>

              {/* Accordions */}
              <div className="space-y-0 border-t border-border">
                <details className="group py-4 border-b border-border cursor-pointer" open>
                  <summary className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest select-none list-none">
                    Descripción
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <div className="mt-4 text-xs font-light text-muted-foreground leading-relaxed space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p>{product.description || "Detalle seleccionado de la mejor calidad. Preparado con especial cuidado y dedicación para garantizar la satisfacción completa de nuestros clientes."}</p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground/80">
                      <li>Elaborado con procesos certificados</li>
                      <li>Detalles premium únicos en el mercado</li>
                      <li>Entrega y soporte directo por WhatsApp</li>
                    </ul>
                  </div>
                </details>
                
                <details className="group py-4 border-b border-border cursor-pointer">
                  <summary className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest select-none list-none">
                    Detalles y Composición
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <div className="mt-4 text-xs font-mono text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                    {mocks.ingredients}
                  </div>
                </details>

                <details className="group py-4 border-b border-border cursor-pointer">
                  <summary className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest select-none list-none">
                    Envíos y Devoluciones
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <div className="mt-4 text-xs font-light text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                    Envío gratis en pedidos de más de {$}50. Los plazos y costos específicos se coordinan directamente en el chat al enviar tu pedido.
                  </div>
                </details>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 mt-8 pt-4">
                {mocks.badges.map((badgeText, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center text-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{badgeText}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── Complete your routine (Cross-Sell) ─────────── */}
          {related.length > 0 && (
            <section className="mt-20 border-t border-border pt-16">
              <div className="mb-10 flex items-center justify-between">
                <h2 
                  className="text-3xl font-light text-foreground tracking-tight font-display"
                >
                  Completa tu Pedido
                </h2>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  className="text-xs font-medium underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
                >
                  Ver Todos
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
                {related.map((p) => (
                  <div key={p.id} className="group cursor-pointer">
                    <Link
                      to="/go/$slug/product/$productSlug"
                      params={{ slug, productSlug: p.slug }}
                    >
                      <div className="aspect-[3/4] bg-muted mb-4 relative overflow-hidden rounded-md border border-border/40">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package className="size-10 text-muted-foreground/30" />
                          </div>
                        )}
                        <span className="absolute bottom-3 right-3 w-8 h-8 bg-background/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-sm border border-border">
                          <Plus className="size-4 text-foreground" />
                        </span>
                      </div>
                    </Link>
                    <Link
                      to="/go/$slug/product/$productSlug"
                      params={{ slug, productSlug: p.slug }}
                      className="hover:underline"
                    >
                      <h3 
                        className="text-base font-normal text-foreground tracking-tight font-display"
                      >
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 font-light">
                      {p.sale_price ? (
                        <>
                          <span className="text-destructive font-normal mr-1.5">{$}{p.sale_price.toFixed(2)}</span>
                          <span className="line-through text-muted-foreground/60">{$}{p.price.toFixed(2)}</span>
                        </>
                      ) : (
                        `$${p.price.toFixed(2)}`
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Testimonial Snippet ───────────────────────── */}
          <section className="py-20 mt-20 border-t border-border bg-muted/30">
            <div className="max-w-4xl mx-auto text-center px-4">
              <div className="flex justify-center gap-0.5 text-primary mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <h3 
                className="text-2xl lg:text-3xl italic font-light leading-snug mb-6 text-foreground max-w-2xl mx-auto font-display"
              >
                {review.text}
              </h3>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
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
      <footer className="bg-foreground text-background pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
          <div className="col-span-1 md:col-span-1">
            <span 
              className="text-2xl tracking-widest block mb-6 font-medium font-display"
            >
              {business.name.toUpperCase()}
            </span>
            <p className="text-xs text-background/50 font-light leading-relaxed mb-6">
              Redefiniendo el comercio digital con un proceso limpio, rápido y directo por WhatsApp.
            </p>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram" className="text-background/50 hover:text-background transition-colors">
                <Instagram className="size-4" />
              </a>
              <a href="#" aria-label="Facebook" className="text-background/50 hover:text-background transition-colors">
                <Facebook className="size-4" />
              </a>
              <a href="#" aria-label="Twitter" className="text-background/50 hover:text-background transition-colors">
                <Twitter className="size-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Tienda</h4>
            <ul className="space-y-3 text-xs font-light text-background/50">
              <li><Link to="/go/$slug" params={{ slug }} className="hover:text-background transition-colors">Catálogo Completo</Link></li>
              <li><a href="#" className="hover:text-background transition-colors">Nuevos Ingresos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Populares</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Soporte</h4>
            <ul className="space-y-3 text-xs font-light text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Envíos</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3 text-xs font-light text-background/50">
              <li><a href="#" className="hover:text-background transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Términos</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-background/40 font-light">© 2024 {business.name}. Todos los derechos reservados.</p>
          <div className="flex gap-1.5 items-center text-[10px] text-background/40 font-light">
            Powered by{" "}
            <a
              href="https://commerceai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-background/60 underline underline-offset-4 hover:text-background transition-colors"
            >
              Commerce AI <ExternalLink className="size-2.5" />
            </a>
          </div>
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

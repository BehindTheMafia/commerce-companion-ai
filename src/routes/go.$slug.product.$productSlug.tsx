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
  Star,
  Sparkles,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  ChevronDown,
  CheckCircle2,
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

function getCategoryMocks(categoryName: string, productName: string) {
  const cat = (categoryName || "").toLowerCase();
  const prod = productName.toLowerCase();

  if (
    cat.includes("beauty") ||
    cat.includes("cosmetic") ||
    cat.includes("skin") ||
    cat.includes("belleza") ||
    cat.includes("cuidado") ||
    prod.includes("serum") ||
    prod.includes("crema") ||
    prod.includes("shampoo")
  ) {
    return {
      sizes: ["30ml", "50ml (+ $15.00)", "100ml (+ $30.00)"],
      ingredients:
        "Aqua, Hyaluronic Acid, Vitamin C, Organic Aloe Barbadensis Leaf Juice, Glycerin, Phenoxyethanol.",
      badges: ["Vegano", "Cruelty Free", "Probado Dermatológicamente"],
    };
  }
  if (
    cat.includes("burger") ||
    cat.includes("hamburguesa") ||
    cat.includes("pizza") ||
    cat.includes("comida") ||
    cat.includes("food") ||
    cat.includes("bebida") ||
    cat.includes("cafe")
  ) {
    return {
      sizes: ["Mediano", "Grande (+ $3.00)"],
      ingredients:
        "Ingredientes 100% frescos y naturales seleccionados diariamente de productores locales.",
      badges: ["Hecho Al Instante", "100% Natural", "Ingredientes Locales"],
    };
  }
  if (
    cat.includes("ropa") ||
    cat.includes("clothing") ||
    cat.includes("moda") ||
    cat.includes("t-shirt") ||
    cat.includes("camisa") ||
    cat.includes("zapatos")
  ) {
    return {
      sizes: ["S", "M", "L (+ $2.00)", "XL (+ $4.00)"],
      ingredients: "100% Algodón orgánico premium, teñido ecológico certificado de larga duración.",
      badges: ["Algodón Orgánico", "Producción Ética", "Ajuste Cómodo"],
    };
  }
  return {
    sizes: ["Estándar", "Premium (+ $5.00)"],
    ingredients:
      "Materiales e insumos premium seleccionados cuidadosamente para garantizar la mejor durabilidad y experiencia.",
    badges: ["Calidad Garantizada", "Diseño Ergonómico", "Soporte Commerce AI"],
  };
}

function getMockReview(productName: string) {
  const sum = productName.charCodeAt(0) + productName.charCodeAt(productName.length - 1);
  const reviews = [
    `"Superó mis expectativas por completo. La calidad es increíble y el envío fue sumamente rápido. Definitivamente volveré a pedir."`,
    `"Excelente producto. El empaque es hermoso y los resultados se notan desde el primer día. Altamente recomendado."`,
    `"Increíble relación calidad-precio. Me encanta el minimalismo y el detalle en la presentación de la marca. 10/10."`,
    `"Muy satisfecho con la compra. El proceso fue súper fluido y rápido a través de WhatsApp. ¡Recomendado!"`,
  ];
  const authors = ["María G.", "Julián R.", "Valeria M.", "Esteban C."];
  return {
    text: reviews[sum % reviews.length],
    author: authors[sum % authors.length],
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
            .select(
              "id, name, slug, price, sale_price, image_url, description, created_at, category:categories(name, slug)",
            )
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
        <div className="flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-background shadow-xl min-w-[280px] font-sans">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 className="size-4" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-background">{product.name}</p>
            <p className="text-[11px] font-light opacity-70">Agregado al pedido</p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(id);
              setCartOpen(true);
            }}
            className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Ver pedido ({itemCount + quantity})
          </button>
        </div>
      ),
      { duration: 3000, position: "bottom-center" },
    );
  }

  if (bizLoading || productLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  if (!business || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground/50">
            <AlertCircle className="size-6" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-2xl font-light text-foreground">Producto no encontrado</h1>
          <p className="mt-3 text-base text-muted-foreground font-light">
            Este producto no existe o ya no está disponible en el catálogo.
          </p>
          <Link
            to="/go/$slug"
            params={{ slug }}
            viewTransition
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5"
          >
            Volver a la tienda <ArrowRight className="size-3.5" strokeWidth={1.5} />
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
      <div className="bg-muted/50 text-foreground text-[10px] py-2.5 text-center tracking-widest uppercase font-light border-b border-border/40">
        <Sparkles
          className="inline-block size-3 mr-2 align-middle text-primary"
          strokeWidth={1.5}
        />
        Envío gratis en pedidos +{$}50 | Código: <span className="font-medium">COMPRAAI</span>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
          isScrolled ? "shadow-sm border-b border-border/50" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6 lg:px-10">
          <Link
            to="/go/$slug"
            params={{ slug }}
            viewTransition
            className="text-lg font-light tracking-widest text-foreground hover:text-primary transition-colors"
          >
            {business.name}
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted/50"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 grid min-w-[16px] h-4 place-items-center rounded-full bg-foreground text-[9px] font-medium text-background px-1">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-6 lg:px-10 py-10 lg:py-16">
          <nav
            aria-label="Breadcrumb"
            className="mb-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-light"
          >
            <Link
              to="/go/$slug"
              params={{ slug }}
              viewTransition
              className="hover:text-foreground transition-colors"
            >
              Inicio
            </Link>
            <ChevronRight className="size-3 opacity-40" strokeWidth={1.5} />
            {product.category?.name && (
              <>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  viewTransition
                  className="hover:text-foreground transition-colors"
                >
                  {product.category.name}
                </Link>
                <ChevronRight className="size-3 opacity-40" strokeWidth={1.5} />
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30 group">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Package className="size-16 text-muted-foreground/20" strokeWidth={1} />
                  </div>
                )}

                <div className="absolute left-5 top-5 flex flex-col gap-2.5">
                  <span className="bg-background/90 backdrop-blur-md px-3.5 py-1.5 rounded-md text-[9px] font-medium tracking-widest text-foreground shadow-sm">
                    BESTSELLER
                  </span>
                  {hasSale && (
                    <span className="bg-foreground/90 backdrop-blur-md px-3.5 py-1.5 rounded-md text-[9px] font-medium tracking-widest text-background shadow-sm">
                      OFERTA
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    className={cn(
                      "aspect-square overflow-hidden rounded-xl bg-muted/30 border-2 transition-all duration-300",
                      i === 0
                        ? "border-muted-foreground/20"
                        : "border-transparent hover:border-muted/60",
                    )}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={`Vista ${i + 1}`}
                        className={cn(
                          "size-full object-cover transition-opacity duration-300",
                          i === 0 ? "opacity-100" : "opacity-50 hover:opacity-100",
                        )}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package className="size-6 text-muted-foreground/20" strokeWidth={1} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <div className="mb-5 flex items-center gap-2 text-foreground text-xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <Star
                      key={starIndex}
                      className="size-3.5 fill-foreground text-foreground"
                      strokeWidth={1}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground font-light text-[11px] underline underline-offset-4 cursor-pointer hover:text-foreground transition-colors ml-2">
                  124 Reseñas
                </span>
              </div>

              <h1 className="mb-4 text-3xl lg:text-5xl font-light text-foreground tracking-tight leading-[1.1]">
                {product.name}
              </h1>

              <div className="mb-8 pb-8 border-b border-border/40">
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl font-light text-foreground">
                    {$}
                    {displayPrice.toFixed(2)}
                  </span>
                  {hasSale && (
                    <span className="text-lg text-muted-foreground line-through font-light">
                      {$}
                      {product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="mt-6 text-sm font-light text-muted-foreground leading-relaxed text-balance">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="mb-8">
                <span className="text-[10px] font-medium uppercase tracking-widest text-foreground mb-4 block">
                  Opción / Tamaño
                </span>
                <div className="flex flex-wrap gap-3">
                  {mocks.sizes.map((size, index) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(index)}
                      className={cn(
                        "px-5 py-2.5 rounded-full text-xs tracking-wider transition-all duration-300 font-light focus:outline-none border",
                        selectedSize === index
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/60 text-muted-foreground bg-transparent hover:border-foreground/30",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="pd-notes"
                  className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Observaciones (opcional)
                </label>
                <textarea
                  id="pd-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales para tu pedido..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border/40 bg-muted/10 px-4 py-3.5 text-sm text-foreground font-light placeholder:text-muted-foreground/40 transition-colors focus:border-foreground/30 focus:bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex gap-4 mb-8">
                <div className="flex items-center border border-border/60 rounded-full w-32 justify-between px-4 bg-transparent h-14">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label="Restar uno"
                  >
                    <Minus className="size-4" strokeWidth={1.5} />
                  </button>
                  <span className="text-sm font-light tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label="Sumar uno"
                  >
                    <Plus className="size-4" strokeWidth={1.5} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all duration-300 rounded-full py-3 text-xs tracking-widest font-medium flex items-center justify-center gap-3 h-14 uppercase"
                >
                  <span>Agregar al pedido</span>
                  <span className="w-1 h-1 bg-background/40 rounded-full"></span>
                  <span>
                    {$}
                    {(displayPrice * quantity).toFixed(2)}
                  </span>
                </button>

                <button
                  aria-label="Agregar a favoritos"
                  className="w-14 h-14 flex items-center justify-center border border-border/60 rounded-full hover:border-foreground/30 transition-colors bg-transparent text-muted-foreground hover:text-foreground"
                >
                  <Heart className="size-5" strokeWidth={1.25} />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 border border-border/30 p-4 rounded-2xl mb-10">
                <div className="relative flex h-1.5 w-1.5 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground opacity-70"></span>
                </div>
                <span className="text-[11px] font-light text-muted-foreground">
                  12 personas están viendo este producto en este momento
                </span>
              </div>

              <div className="space-y-1 border-t border-border/40">
                <details className="group py-5 border-b border-border/40 cursor-pointer" open>
                  <summary className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest select-none list-none text-foreground">
                    Descripción
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" strokeWidth={1.5} />
                    </span>
                  </summary>
                  <div className="mt-5 text-sm font-light text-muted-foreground leading-relaxed space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 pb-2">
                    <p>
                      {product.description ||
                        "Detalle seleccionado de la mejor calidad. Preparado con especial cuidado y dedicación para garantizar la satisfacción completa de nuestros clientes."}
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-1 text-muted-foreground/80">
                      <li>Elaborado con procesos certificados</li>
                      <li>Detalles premium únicos en el mercado</li>
                      <li>Entrega y soporte directo por WhatsApp</li>
                    </ul>
                  </div>
                </details>

                <details className="group py-5 border-b border-border/40 cursor-pointer">
                  <summary className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest select-none list-none text-foreground">
                    Detalles y Composición
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" strokeWidth={1.5} />
                    </span>
                  </summary>
                  <div className="mt-5 text-sm font-light text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 pb-2">
                    {mocks.ingredients}
                  </div>
                </details>

                <details className="group py-5 border-b border-border/40 cursor-pointer">
                  <summary className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest select-none list-none text-foreground">
                    Envíos y Devoluciones
                    <span className="transition-transform duration-300 group-open:rotate-180 text-muted-foreground">
                      <ChevronDown className="size-4" strokeWidth={1.5} />
                    </span>
                  </summary>
                  <div className="mt-5 text-sm font-light text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 pb-2">
                    Envío gratis en pedidos de más de {$}50. Los plazos y costos específicos se
                    coordinan directamente en el chat al enviar tu pedido.
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-10 pt-4">
                {mocks.badges.map((badgeText, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center text-center gap-3"
                  >
                    <div className="grid size-10 place-items-center rounded-full bg-muted/30 text-foreground">
                      <CheckCircle2 className="size-4" strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                      {badgeText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-24 border-t border-border/40 pt-20">
              <div className="mb-12 flex items-end justify-between">
                <h2 className="text-2xl lg:text-3xl font-light text-foreground tracking-tight">
                  Completa tu Pedido
                </h2>
                <Link
                  to="/go/$slug"
                  params={{ slug }}
                  viewTransition
                  className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors pb-1 border-b border-transparent hover:border-foreground"
                >
                  Ver Todos
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10 lg:gap-8">
                {related.map((p) => (
                  <div key={p.id} className="group cursor-pointer">
                    <Link
                      to="/go/$slug/product/$productSlug"
                      params={{ slug, productSlug: p.slug }}
                      viewTransition
                    >
                      <div className="aspect-[3/4] bg-muted/30 mb-5 relative overflow-hidden rounded-xl border border-border/20">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package className="size-8 text-muted-foreground/20" strokeWidth={1} />
                          </div>
                        )}
                      </div>
                    </Link>
                    <Link
                      to="/go/$slug/product/$productSlug"
                      params={{ slug, productSlug: p.slug }}
                      viewTransition
                      className="group-hover:opacity-70 transition-opacity"
                    >
                      <h3 className="text-sm font-light text-foreground tracking-wide line-clamp-1">
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-sm mt-1.5 font-light">
                      {p.sale_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">
                            {$}
                            {p.sale_price.toFixed(2)}
                          </span>
                          <span className="line-through text-muted-foreground/50 text-xs">
                            {$}
                            {p.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">${p.price.toFixed(2)}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="py-24 mt-24 border-t border-border/40">
            <div className="max-w-3xl mx-auto text-center px-4">
              <div className="flex justify-center gap-1 text-foreground mb-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="size-4 fill-foreground" strokeWidth={1} />
                ))}
              </div>
              <h3 className="text-2xl lg:text-4xl font-light leading-relaxed mb-10 text-foreground">
                {review.text}
              </h3>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-widest text-foreground">
                  {review.author}
                </span>
                <span className="text-[10px] font-light text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3" strokeWidth={1.5} /> Comprador verificado
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-muted/10 border-t border-border/40 pt-20 pb-10 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-20">
          <div className="md:col-span-5 lg:col-span-4">
            <span className="text-xl tracking-widest block mb-6 font-light">{business.name}</span>
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-8 max-w-sm">
              Redefiniendo el comercio digital con un proceso limpio, rápido y directo por WhatsApp.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full bg-muted/50 text-muted-foreground hover:bg-foreground hover:text-background transition-all"
              >
                <Instagram className="size-4" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="grid size-10 place-items-center rounded-full bg-muted/50 text-muted-foreground hover:bg-foreground hover:text-background transition-all"
              >
                <Facebook className="size-4" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="grid size-10 place-items-center rounded-full bg-muted/50 text-muted-foreground hover:bg-foreground hover:text-background transition-all"
              >
                <Twitter className="size-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-widest mb-6 text-foreground">
                Tienda
              </h4>
              <ul className="space-y-4 text-sm font-light text-muted-foreground">
                <li>
                  <Link
                    to="/go/$slug"
                    params={{ slug }}
                    viewTransition
                    className="hover:text-foreground transition-colors"
                  >
                    Catálogo Completo
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Nuevos Ingresos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Populares
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-medium uppercase tracking-widest mb-6 text-foreground">
                Soporte
              </h4>
              <ul className="space-y-4 text-sm font-light text-muted-foreground">
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
                    Envíos
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-[10px] font-medium uppercase tracking-widest mb-6 text-foreground">
                Legal
              </h4>
              <ul className="space-y-4 text-sm font-light text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Términos
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-muted-foreground font-light tracking-wide">
            © {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
          </p>
          <div className="flex gap-1.5 items-center text-[10px] text-muted-foreground font-light">
            Powered by{" "}
            <a
              href="https://commerceai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:opacity-70 transition-opacity"
            >
              Commerce AI <ExternalLink className="size-3" strokeWidth={1.5} />
            </a>
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

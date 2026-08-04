import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useCart, type CartProduct } from "@/lib/cart-context";
import { useBusinessQuery } from "@/hooks/use-business-query";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { useCheckout } from "@/hooks/use-checkout";
import { useCurrency } from "@/hooks/use-currency";
import { useProductImages } from "@/hooks/use-product-images";
import { hasSalePrice } from "@/lib/product";
import { StoreHeader } from "@/components/storefront/store-header";
import { StoreFooter } from "@/components/storefront/store-footer";
import { ProductBreadcrumbs } from "@/components/storefront/product-breadcrumbs";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductBadges } from "@/components/storefront/product-badges";
import { ProductQuantity } from "@/components/storefront/product-quantity";
import { ProductCTA } from "@/components/storefront/product-cta";
import { ProductAccordion } from "@/components/storefront/product-accordion";
import { ProductBenefits } from "@/components/storefront/product-benefits";
import { ProductShipping } from "@/components/storefront/product-shipping";
import { ProductVariants } from "@/components/storefront/product-variants";
import { useVariants } from "@/hooks/use-variants";
import { PricingSelector } from "@/components/storefront/pricing-selector";
import { usePricingMode } from "@/hooks/use-pricing-mode";
import { RelatedProducts } from "@/components/storefront/related-products";
import { SkeletonProductPage } from "@/components/storefront/skeleton-product-page";
import { CartDrawerV2 } from "@/components/storefront/cart-drawer-v2";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  ShoppingBag,
  Heart,
  Share2,
  MessageCircle,
  Box,
  Star,
  Lock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product, ProductVariant } from "@/types/storefront";

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

function ProductDetailPage() {
  const { slug, productSlug } = useParams({
    from: "/go/$slug/product/$productSlug",
  });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({});

  const { addItem, itemCount } = useCart();

  const { data: business, isLoading: bizLoading } = useBusinessQuery(slug);
  const settings = useStoreSettings(business);
  const { symbol: $ } = useCurrency(business?.currency ?? "USD");
  const { handleCheckout, busy: checkoutBusy, error: checkoutError } = useCheckout(business);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["sf-product", slug, productSlug],
    enabled: !!business,
    queryFn: async (): Promise<Product | null> => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, sku, stock, created_at, pricing_modes, specifications, shipping_info, warranty_info, wholesale_info, category:categories(name, slug), brand:brands(name)",
        )
        .eq("business_id", business!.id)
        .eq("slug", productSlug)
        .eq("status", "active")
        .maybeSingle();
      return (data ?? null) as unknown as Product | null;
    },
  });

  const { data: images = [] } = useProductImages(product?.id);

  const { data: variants = [] } = useQuery({
    queryKey: ["sf-product-variants", product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("*, values:product_variant_values(*)")
        .eq("product_id", product!.id)
        .order("sort_order");
      return (data ?? []) as unknown as ProductVariant[];
    },
  });

  const { data: related = [] } = useQuery({
    queryKey: ["sf-related", business?.id, product?.id],
    enabled: !!business && !!product && settings.recommendations.enabled,
    queryFn: async (): Promise<Product[]> => {
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
              "id, name, slug, price, sale_price, image_url, description, sku, stock, created_at, category:categories(name, slug), brand:brands(name)",
            )
            .eq("business_id", business!.id)
            .eq("status", "active")
            .eq("category_id", cats.id)
            .neq("id", product!.id)
            .limit(5);
          if (data && data.length > 0) return data;
        }
      }
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, image_url, description, sku, stock, created_at, category:categories(name, slug), brand:brands(name)",
        )
        .eq("business_id", business!.id)
        .eq("status", "active")
        .neq("id", product!.id)
        .limit(5);
      return data ?? [];
    },
  });

  const {
    selected: pricingMode,
    setSelectedId: setPricingMode,
    effectivePrice,
    minimumQuantity,
    showSelector,
  } = usePricingMode(product?.pricing_modes ?? null);

  const { hasVariants, defaultSelection } = useVariants(variants);

  const variantState = useMemo(() => {
    if (!hasVariants) return variantSelection;
    return { ...defaultSelection, ...variantSelection };
  }, [hasVariants, defaultSelection, variantSelection]);

  const unitPrice =
    effectivePrice ??
    (hasSalePrice(product?.price ?? 0, product?.sale_price ?? null)
      ? product!.sale_price!
      : (product?.price ?? 0));

  const onSale = product ? hasSalePrice(product.price, product.sale_price) : false;
  const displayPrice = onSale ? product!.sale_price! : (product?.price ?? 0);

  const discountPercent = useMemo(() => {
    if (!product?.sale_price || product.sale_price >= product.price) return null;
    return Math.round(((product.price - product.sale_price) / product.price) * 100);
  }, [product]);

  const canAddToCart = quantity >= minimumQuantity;
  const minQtyMessage =
    !canAddToCart && pricingMode
      ? `Minimo de compra para ${pricingMode.name} es ${minimumQuantity} unidades.`
      : null;

  const stockStatus = useMemo(() => {
    if (product?.stock == null) return null;
    if (product.stock <= 0)
      return { label: "Agotado", dot: "#DC2626", text: "#DC2626", bg: "bg-red-50/80" };
    if (product.stock <= 5)
      return {
        label: `Solo ${product.stock} restantes`,
        dot: "#D97706",
        text: "#D97706",
        bg: "bg-amber-50/80",
      };
    return { label: "En Stock", dot: "#16A34A", text: "#16A34A", bg: "bg-green-50/80" };
  }, [product?.stock]);

  const deliveryDates = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 2);
    const end = new Date(today);
    end.setDate(today.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return {
      start: start.toLocaleDateString("en-US", opts),
      end: end.toLocaleDateString("en-US", opts),
    };
  }, []);

  const variantLabel = useMemo(() => {
    if (!variants || !hasVariants) return "";
    for (const v of variants) {
      const selectedId = variantState[v.type];
      if (!selectedId) continue;
      const val = v.values.find((vv) => vv.id === selectedId);
      if (val) return val.label;
    }
    return "";
  }, [variants, hasVariants, variantState]);

  const handleAddToCart = useCallback(() => {
    if (!product || !canAddToCart) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      sale_price: product.sale_price,
      image_url: product.image_url,
      slug: product.slug,
      ...(pricingMode
        ? {
            pricingModeId: pricingMode.id,
            pricingModeName: pricingMode.name,
            unitPrice: pricingMode.price,
            minimumQuantity: pricingMode.minimumQuantity,
          }
        : {}),
    };
    addItem(cartProduct, quantity, notes || undefined);
    toast.custom(
      (id) => (
        <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl min-w-[280px]">
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
  }, [product, pricingMode, quantity, notes, canAddToCart, addItem, itemCount]);

  const handleWhatsAppOrder = useCallback(() => {
    if (!product || !canAddToCart) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      sale_price: product.sale_price,
      image_url: product.image_url,
      slug: product.slug,
      ...(pricingMode
        ? {
            pricingModeId: pricingMode.id,
            pricingModeName: pricingMode.name,
            unitPrice: pricingMode.price,
            minimumQuantity: pricingMode.minimumQuantity,
          }
        : {}),
    };
    addItem(cartProduct, quantity, notes || undefined);
    setCartOpen(true);
  }, [product, pricingMode, quantity, notes, canAddToCart, addItem]);

  const handleShare = useCallback(async () => {
    const text = product?.name
      ? `✨ Descubre ${product.name} de ${business?.name ?? slug}!\n\n${window.location.href}`
      : `✨ Descubre los productos de ${business?.name ?? slug}!\n\n${window.location.href}`;
    if (navigator.share) {
      await navigator.share({
        title: product?.name ?? business?.name ?? slug,
        text,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(text);
      toast("Enlace copiado al portapapeles", { duration: 2000 });
    }
  }, [product?.name, business?.name, slug]);

  const accordionSections = useMemo(() => {
    if (!product) return [];
    const sections: { title: string; content: ReactNode }[] = [];
    if (product.description) {
      sections.push({ title: "Descripción", content: product.description });
    }
    if (product.specifications?.length) {
      sections.push({
        title: "Especificaciones",
        content: (
          <ul className="flex flex-col gap-3">
            {product.specifications.map((spec, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center border-b border-border pb-2 last:border-0"
              >
                <span className="text-muted-foreground">{spec.label}</span>
                <span className="font-semibold text-foreground">{spec.value}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    const shippingText =
      product.shipping_info || (settings.shipping.enabled ? settings.shipping.banner_text : null);
    if (shippingText) {
      sections.push({ title: "Información de Envío", content: shippingText });
    }
    if (product.warranty_info) {
      sections.push({ title: "Devoluciones y Cambios", content: product.warranty_info });
    }
    const wholesaleMode = product.pricing_modes?.find(
      (m) => m.name.toLowerCase().includes("wholesale") && m.description,
    );
    const wholesaleInfo = product.wholesale_info || wholesaleMode?.description || null;
    if (wholesaleInfo) {
      sections.push({ title: "Información al por Mayor", content: wholesaleInfo });
    }
    return sections;
  }, [product, settings.shipping.enabled, settings.shipping.banner_text]);

  if (bizLoading || productLoading) {
    return <SkeletonProductPage />;
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

  const brandName = product.brand?.name ?? business.name;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-xl focus:shadow-lg focus:ring-2 focus:ring-foreground focus:text-sm focus:font-semibold"
      >
        Saltar al contenido principal
      </a>

      <StoreHeader business={business} slug={slug} onCartOpen={() => setCartOpen(true)} />

      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-[1600px] px-[clamp(1.25rem,5vw,4rem)] py-6 md:py-10 lg:py-16">
          <ProductBreadcrumbs
            items={[
              { label: "Inicio", to: "/go/$slug", params: { slug } },
              ...(product.category ? [{ label: product.category.name }] : []),
              { label: product.name },
            ]}
          />

          <div className="mt-6 md:mt-8 flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-10 xl:gap-12">
            {/* Left: Gallery */}
            <ProductGallery
              images={images}
              mainImageUrl={product.image_url}
              productName={product.name}
              discountPercent={discountPercent}
              badges={
                <ProductBadges
                  createdAt={product.created_at}
                  price={product.price}
                  salePrice={product.sale_price}
                />
              }
            />

            {/* Right: Product Information */}
            <div>
              <div className="lg:sticky lg:top-12 flex flex-col gap-6 md:gap-8 pb-28 lg:pb-0">
                {/* HEADER SECTION */}
                <div className="flex flex-col gap-3 md:gap-4 border-b border-border pb-5 md:pb-6">
                  <span className="text-[11px] md:text-[12px] font-bold text-muted-foreground">
                    {brandName}
                  </span>

                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold leading-[1.1] tracking-tight text-foreground">
                    {product.name}
                  </h1>

                  {settings.reviews.enabled && (
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex text-muted-foreground text-sm gap-[2px]">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="size-[18px]" strokeWidth={1.5} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PRICE & STOCK SECTION */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-end gap-3 md:gap-4">
                    <span className="text-3xl md:text-4xl font-extrabold">
                      {pricingMode
                        ? `${$}${pricingMode.price.toFixed(2)}`
                        : `${$}${displayPrice.toFixed(2)}`}
                    </span>
                    {onSale && !pricingMode && (
                      <span className="text-base sm:text-lg md:text-xl text-muted-foreground line-through font-medium mb-1 md:mb-1.5">
                        {$}
                        {product.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 md:gap-6 text-sm flex-wrap">
                    {stockStatus && (
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full font-bold"
                        style={{ backgroundColor: stockStatus.bg, color: stockStatus.text }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stockStatus.dot }}
                        />
                        {stockStatus.label}
                      </div>
                    )}
                    {product.sku && (
                      <span className="text-muted-foreground font-medium flex items-center gap-2">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                </div>

                {/* PRICING SELECTOR */}
                {showSelector && (
                  <PricingSelector
                    modes={product.pricing_modes ?? []}
                    selectedId={pricingMode?.id ?? null}
                    onChange={setPricingMode}
                  />
                )}

                {/* VARIANTS */}
                {hasVariants && (
                  <ProductVariants
                    variants={variants}
                    selected={variantState}
                    onChange={(type, valueId) =>
                      setVariantSelection((prev) => ({ ...prev, [type]: valueId }))
                    }
                  />
                )}

                {/* NOTES */}
                <div>
                  <label
                    htmlFor="pd-notes"
                    className="text-[13px] font-bold uppercase tracking-wider text-foreground block mb-3"
                  >
                    Notas (opcional)
                  </label>
                  <input
                    id="pd-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles adicionales para tu pedido..."
                    className="w-full bg-muted/40 border border-border rounded-[14px] px-[18px] h-[52px] text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  />
                </div>

                {/* PURCHASE ACTIONS */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <ProductQuantity
                      quantity={quantity}
                      onChange={setQuantity}
                      min={minimumQuantity}
                    />
                    <ProductCTA
                      label="Agregar al Carrito"
                      totalPrice={`${$}${(unitPrice * quantity).toFixed(2)}`}
                      onClick={handleAddToCart}
                      disabled={!canAddToCart}
                    />
                  </div>
                  {minQtyMessage && (
                    <p className="text-xs text-destructive font-medium">{minQtyMessage}</p>
                  )}

                  {/* WhatsApp Button */}
                  <button
                    onClick={handleWhatsAppOrder}
                    disabled={!canAddToCart}
                    className="w-full bg-[#25D366] text-white rounded-[14px] h-[56px] font-bold text-[15px] flex items-center justify-center gap-3 hover:bg-[#20bd5a] hover:shadow-[0_8px_20px_rgba(37,211,102,0.3)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="size-5" strokeWidth={1.5} />
                    Pedir por WhatsApp
                  </button>

                  {/* Tertiary Actions */}
                  <div className="flex justify-center gap-8 mt-2 py-2">
                    {settings.wishlist.enabled && (
                      <button className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
                        <Heart
                          className="size-[18px] group-hover:text-destructive transition-colors"
                          strokeWidth={1.5}
                        />
                        Agregar a Favoritos
                      </button>
                    )}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      <Share2
                        className="size-[18px] group-hover:text-primary transition-colors"
                        strokeWidth={1.5}
                      />
                      Compartir Producto
                    </button>
                  </div>
                </div>

                {/* DELIVERY ESTIMATE */}
                <div className="bg-muted/40 border border-border rounded-[16px] p-5 flex items-start gap-4">
                  <div className="bg-background p-2.5 rounded-full shadow-sm">
                    <Box className="size-5 text-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px] text-foreground">Entrega Estimada</h4>
                    <p className="text-muted-foreground text-[14px] mt-1">
                      Pide ahora y recíbelo entre el{" "}
                      <strong className="text-foreground">{deliveryDates.start}</strong> y el{" "}
                      <strong className="text-foreground">{deliveryDates.end}</strong>.
                    </p>
                  </div>
                </div>

                {/* TRUST BADGES */}
                <ProductBenefits benefits={settings.benefits} />

                {/* SHIPPING BANNER */}
                {settings.shipping.enabled && settings.shipping.banner_text && (
                  <ProductShipping
                    text={settings.shipping.banner_text}
                    freeThreshold={settings.shipping.free_threshold}
                    currencySymbol={$}
                  />
                )}

                {/* ACCORDION */}
                {accordionSections.length > 0 && <ProductAccordion sections={accordionSections} />}

                {/* SECURITY NOTE */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-medium">
                  <Lock className="size-3.5" strokeWidth={1.5} /> Pago seguro garantizado
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {settings.recommendations.enabled && related.length > 0 && (
            <RelatedProducts
              products={related}
              currencySymbol={$}
              storeSlug={slug}
              title={settings.recommendations.title ?? undefined}
            />
          )}
        </div>
      </main>

      <StoreFooter business={business} slug={slug} />

      <CartDrawerV2
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        currencySymbol={$}
        busy={checkoutBusy}
        error={checkoutError}
      />

      {/* MOBILE STICKY PURCHASE BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-semibold">
              {variantLabel || (showSelector ? (pricingMode?.name ?? "") : "")}
            </span>
            <span className="text-lg font-extrabold text-foreground">
              {pricingMode
                ? `${$}${(pricingMode.price * quantity).toFixed(2)}`
                : `${$}${(unitPrice * quantity).toFixed(2)}`}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="flex-1 bg-foreground text-background rounded-[12px] h-[48px] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
            Agregar al Carrito
          </button>
        </div>
      </div>
    </div>
  );
}

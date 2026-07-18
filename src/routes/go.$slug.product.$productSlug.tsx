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
import { AlertCircle, ArrowRight, ShoppingBag, Heart, Share2, MessageCircle, Box, Star, Lock } from "lucide-react";
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
    if (product.stock <= 0) return { label: "Out of Stock", dot: "#DC2626", text: "#DC2626", bg: "bg-red-50/80" };
    if (product.stock <= 5) return { label: `Only ${product.stock} left`, dot: "#D97706", text: "#D97706", bg: "bg-amber-50/80" };
    return { label: "In Stock", dot: "#16A34A", text: "#16A34A", bg: "bg-green-50/80" };
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
    if (navigator.share) {
      await navigator.share({
        title: product?.name ?? "",
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied to clipboard", { duration: 2000 });
    }
  }, [product?.name]);

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

  const accordionSections: { title: string; content: ReactNode }[] = [];
  if (product.description) {
    accordionSections.push({ title: "Description", content: product.description });
  }
  if (product.specifications && product.specifications.length > 0) {
    accordionSections.push({
      title: "Specifications",
      content: (
        <ul className="flex flex-col gap-3">
          {product.specifications.map((spec, idx) => (
            <li key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
              <span className="text-[#6B7280]">{spec.label}</span>
              <span className="font-semibold text-[#111827]">{spec.value}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  const shippingText = product.shipping_info || (settings.shipping.enabled ? settings.shipping.banner_text : null);
  if (shippingText) {
    accordionSections.push({ title: "Shipping Information", content: shippingText });
  }
  if (product.warranty_info) {
    accordionSections.push({ title: "Returns & Exchanges", content: product.warranty_info });
  }
  const wholesaleMode = product.pricing_modes?.find(
    (m) => m.name.toLowerCase().includes("wholesale") && m.description,
  );
  const wholesaleInfo = product.wholesale_info || wholesaleMode?.description || null;
  if (wholesaleInfo) {
    accordionSections.push({ title: "Wholesale Information", content: wholesaleInfo });
  }

  return (
    <div className="min-h-screen bg-white text-[#111827] antialiased font-sans">
      <StoreHeader business={business} slug={slug} onCartOpen={() => setCartOpen(true)} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12 py-8 lg:py-16">
          <ProductBreadcrumbs
            items={[
              { label: "Home", to: "/go/$slug", params: { slug } },
              ...(product.category ? [{ label: product.category.name }] : []),
              { label: product.name },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            {/* Left: Gallery */}
            <div className="lg:col-span-7">
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
            </div>

            {/* Right: Product Information */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-8 flex flex-col gap-8 pb-24 lg:pb-0">
                {/* HEADER SECTION */}
                <div className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-6">
                  <span className="uppercase tracking-[0.15em] text-[12px] font-bold text-[#6B7280]">
                    {brandName}
                  </span>

                  <h1 className="text-4xl lg:text-[42px] font-extrabold leading-[1.1] tracking-tight text-[#111827]">
                    {product.name}
                  </h1>

                  {settings.reviews.enabled && (
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex text-[#111827] text-sm gap-[2px]">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="size-[18px] fill-current" strokeWidth={0} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PRICE & STOCK SECTION */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-end gap-4">
                    <span className="text-3xl font-extrabold">
                      {pricingMode
                        ? `${$}${pricingMode.price.toFixed(2)}`
                        : `${$}${displayPrice.toFixed(2)}`}
                    </span>
                    {onSale && !pricingMode && (
                      <span className="text-lg text-[#6B7280] line-through font-medium mb-1">
                        {$}
                        {product.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm flex-wrap">
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
                      <span className="text-[#6B7280] font-medium flex items-center gap-2">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-[15px] leading-relaxed text-[#6B7280] mt-2">
                      {product.description}
                    </p>
                  )}
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
                    className="text-[13px] font-bold uppercase tracking-wider text-[#111827] block mb-3"
                  >
                    Notes (optional)
                  </label>
                  <input
                    id="pd-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details for your order..."
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-[14px] px-[18px] h-[52px] text-sm text-[#111827] placeholder:text-[#9CA3AF] transition-all duration-200 focus:outline-none focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10"
                  />
                </div>

                {/* PURCHASE ACTIONS */}
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <ProductQuantity
                      quantity={quantity}
                      onChange={setQuantity}
                      min={minimumQuantity}
                    />
                    <ProductCTA
                      label="Add to Cart"
                      totalPrice={`${$}${(unitPrice * quantity).toFixed(2)}`}
                      onClick={handleAddToCart}
                      disabled={!canAddToCart}
                    />
                  </div>
                  {minQtyMessage && (
                    <p className="text-xs text-[#DC2626] font-medium">{minQtyMessage}</p>
                  )}

                  {/* WhatsApp Button */}
                  <button
                    onClick={handleWhatsAppOrder}
                    disabled={!canAddToCart}
                    className="w-full bg-[#25D366] text-white rounded-[14px] h-[56px] font-bold text-[15px] flex items-center justify-center gap-3 hover:bg-[#20bd5a] hover:shadow-[0_8px_20px_rgba(37,211,102,0.3)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="size-5" strokeWidth={1.5} />
                    Order via WhatsApp
                  </button>

                  {/* Tertiary Actions */}
                  <div className="flex justify-center gap-8 mt-2 py-2">
                    {settings.wishlist.enabled && (
                      <button className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors group">
                        <Heart className="size-[18px] group-hover:text-[#DC2626] transition-colors" strokeWidth={1.5} />
                        Add to Wishlist
                      </button>
                    )}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors group"
                    >
                      <Share2 className="size-[18px] group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
                      Share Product
                    </button>
                  </div>
                </div>

                {/* DELIVERY ESTIMATE */}
                <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[16px] p-5 flex items-start gap-4">
                  <div className="bg-white p-2.5 rounded-full shadow-sm">
                    <Box className="size-5 text-[#111827]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px] text-[#111827]">Estimated Delivery</h4>
                    <p className="text-[#6B7280] text-[14px] mt-1">
                      Order now and receive it between{" "}
                      <strong className="text-[#111827]">{deliveryDates.start}</strong> and{" "}
                      <strong className="text-[#111827]">{deliveryDates.end}</strong>.
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
                {accordionSections.length > 0 && (
                  <ProductAccordion sections={accordionSections} />
                )}

                {/* SECURITY NOTE */}
                <div className="flex items-center justify-center gap-2 text-[#6B7280] text-xs font-medium">
                  <Lock className="size-3.5" strokeWidth={1.5} /> Guaranteed safe & secure checkout
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#E5E7EB] p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="text-xs text-[#6B7280] font-semibold">{variantLabel || (showSelector ? pricingMode?.name ?? "" : "")}</span>
            <span className="text-lg font-extrabold text-[#111827]">
              {pricingMode
                ? `${$}${(pricingMode.price * quantity).toFixed(2)}`
                : `${$}${(unitPrice * quantity).toFixed(2)}`}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="flex-1 bg-[#111827] text-white rounded-[12px] h-[48px] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

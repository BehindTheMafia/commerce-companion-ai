import { useState, useEffect, useCallback } from "react";
import { X, Minus, Plus, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  description: string | null;
  category: { name: string } | null;
};

type ProductQuickViewProps = {
  product: Product | null;
  currencySymbol: string;
  onClose: () => void;
  onAdd: (productId: string, quantity: number, notes: string) => void;
};

const BADGES = [
  { label: "🔥 Más vendido", className: "bg-orange-100 text-orange-700" },
  { label: "⭐ Popular", className: "bg-yellow-100 text-yellow-700" },
  { label: "🆕 Nuevo", className: "bg-blue-100 text-blue-700" },
  { label: "❤️ Recomendado", className: "bg-pink-100 text-pink-700" },
];

function getProductBadge(product: Product) {
  // Deterministic badge per product based on id hash
  if (!product) return null;
  const sum = product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1);
  if (sum % 5 === 0) return BADGES[0];
  if (sum % 5 === 1) return BADGES[1];
  if (sum % 5 === 2) return BADGES[2];
  if (sum % 5 === 3) return BADGES[3];
  return null;
}

export function ProductQuickView({
  product,
  currencySymbol: $,
  onClose,
  onAdd,
}: ProductQuickViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [imgError, setImgError] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setNotes("");
      setImgError(false);
      // Trigger entrance animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [product]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 220);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (product) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [product, handleClose]);

  if (!product) return null;

  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasSale ? product.sale_price! : product.price;
  const badge = getProductBadge(product);

  function handleAdd() {
    onAdd(product!.id, quantity, notes);
    handleClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background transition-all duration-[220ms] ease-out",
          "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
          "w-full sm:w-[480px] sm:rounded-2xl",
          "max-h-[92dvh] sm:max-h-[85dvh]",
          "rounded-t-2xl shadow-2xl",
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-8 opacity-0 sm:scale-95"
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border sm:hidden" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Product Image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:rounded-t-2xl">
            {product.image_url && !imgError ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="size-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="size-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-background/80 backdrop-blur text-foreground shadow-sm transition-all hover:bg-background"
            >
              <X className="size-4" strokeWidth={2} />
            </button>

            {/* Badge overlay */}
            {badge && (
              <span
                className={cn(
                  "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            )}

            {hasSale && (
              <span className="absolute bottom-3 left-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-white">
                Oferta
              </span>
            )}
          </div>

          {/* Product info */}
          <div className="p-5 space-y-4">
            {/* Category */}
            {product.category?.name && (
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {product.category.name}
              </p>
            )}

            {/* Title + Price */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight leading-snug">
                {product.name}
              </h2>
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold">
                  {$}{displayPrice.toFixed(2)}
                </p>
                {hasSale && (
                  <p className="text-xs text-muted-foreground line-through">
                    {$}{product.price.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Stars (decorative) */}
            <div className="flex items-center gap-1" aria-label="Calificación: 4.5 estrellas">
              {[1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
              ))}
              <Star className="size-3.5 fill-amber-200 text-amber-400" />
              <span className="ml-1 text-xs text-muted-foreground">4.5</span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-muted/50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Descripción
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity selector */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Cantidad
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Restar cantidad"
                  className="grid size-10 place-items-center rounded-full border-2 border-border text-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                >
                  <Minus className="size-4" strokeWidth={2} />
                </button>
                <span className="w-8 text-center text-lg font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Sumar cantidad"
                  className="grid size-10 place-items-center rounded-full border-2 border-border text-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                >
                  <Plus className="size-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="qv-notes"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Observaciones
              </label>
              <textarea
                id="qv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sin picante, sin cebolla..."
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-0"
              />
            </div>

            {/* Spacer for sticky CTA */}
            <div className="h-2" />
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="border-t border-border/60 bg-background px-5 pb-6 pt-4 sm:pb-5">
          <Button
            onClick={handleAdd}
            size="lg"
            className="w-full rounded-xl text-sm font-semibold h-12 transition-all active:scale-[0.98]"
          >
            Agregar al pedido · {$}{(displayPrice * quantity).toFixed(2)}
          </Button>
        </div>
      </div>
    </>
  );
}

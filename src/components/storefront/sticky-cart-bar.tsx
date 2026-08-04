import { ShoppingBag } from "lucide-react";

type StickyCartBarProps = {
  itemCount: number;
  subtotal: number;
  currencySymbol: string;
  onCartOpen: () => void;
  onBrowse: () => void;
};

export function StickyCartBar({
  itemCount,
  subtotal,
  currencySymbol: $,
  onCartOpen,
  onBrowse,
}: StickyCartBarProps) {
  const hasItems = itemCount > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 md:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onCartOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label="Abrir carrito"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="size-5" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {hasItems
                ? `${itemCount} artículo${itemCount !== 1 ? "s" : ""} · ${$}${subtotal.toFixed(2)}`
                : "Tu carrito está vacío"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {hasItems ? "Toca para revisar tu pedido" : "Toca para ver tu carrito"}
            </span>
          </span>
        </button>

        <button
          onClick={hasItems ? onCartOpen : onBrowse}
          className="shrink-0 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
        >
          {hasItems ? "Ver pedido" : "Ver catálogo"}
        </button>
      </div>
    </div>
  );
}

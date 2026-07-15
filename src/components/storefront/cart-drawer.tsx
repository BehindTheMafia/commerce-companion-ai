import { useCart } from "@/lib/cart-context";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
};

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, itemCount, subtotal } = useCart();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="size-4" />
            Carrito ({itemCount})
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Tu carrito está vacío
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const price = item.product.sale_price ?? item.product.price;
                return (
                  <div key={item.product.id} className="flex gap-3 rounded-lg border p-3">
                    {item.product.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="size-16 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {price.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="grid size-6 place-items-center rounded border text-muted-foreground hover:bg-accent"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="grid size-6 place-items-center rounded border text-muted-foreground hover:bg-accent"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {subtotal.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
            <Button className="w-full" onClick={onCheckout}>
              Ir al checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

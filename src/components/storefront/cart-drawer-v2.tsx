import { useState, useCallback } from "react";
import {
  X, Minus, Plus, ShoppingBag, Package, ChevronLeft,
  Truck, Store, Banknote, CreditCard, HandCoins, MessageCircle,
  CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import type { CustomerData } from "@/components/storefront/checkout-form";

type Step = 1 | 2 | 3;

type CartDrawerV2Props = {
  open: boolean;
  onClose: () => void;
  onCheckout: (data: CustomerData) => Promise<void>;
  currencySymbol: string;
  busy?: boolean;
  error?: string | null;
};

const paymentOptions = [
  { value: "cash" as const, icon: Banknote, label: "Efectivo" },
  { value: "transfer" as const, icon: CreditCard, label: "Transferencia" },
  { value: "cod" as const, icon: HandCoins, label: "Contra entrega" },
];

const paymentLabel: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  cod: "Pago contra entrega",
};

export function CartDrawerV2({
  open,
  onClose,
  onCheckout,
  currencySymbol: $,
  busy = false,
  error = null,
}: CartDrawerV2Props) {
  const { items, removeItem, updateQuantity, itemCount, subtotal } = useCart();
  const [step, setStep] = useState<Step>(1);

  // Customer form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "cod">("cash");
  const [cashAmount, setCashAmount] = useState("");

  const handleClose = useCallback(() => {
    setStep(1);
    onClose();
  }, [onClose]);

  function handleContinueToStep2() {
    if (items.length === 0) return;
    setStep(2);
  }

  async function handleContinueToStep3(e: React.FormEvent) {
    e.preventDefault();
    setStep(3);
  }

  async function handleSendWhatsApp() {
    await onCheckout({
      name,
      phone,
      deliveryType,
      address,
      neighborhood,
      reference,
      notes,
      paymentMethod,
      cashAmount,
    });
  }

  const stepTitles: Record<Step, string> = {
    1: "Tu pedido",
    2: "Tus datos",
    3: "Confirmar pedido",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={stepTitles[step]}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3.5">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Volver"
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </button>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {step === 1 && <ShoppingBag className="size-4 text-muted-foreground" strokeWidth={1.5} />}
              <span className="text-sm font-semibold">{stepTitles[step]}</span>
              {step === 1 && itemCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </div>
            {/* Step indicator */}
            <div className="mt-1.5 flex items-center gap-1">
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-all duration-300",
                    s <= step ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* ─── STEP 1: Order review ─── */}
        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                  <div className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/40">
                    <ShoppingBag className="size-8" strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium text-foreground">Tu carrito está vacío</p>
                  <p className="text-xs text-muted-foreground">Agrega productos para comenzar tu pedido</p>
                  <Button variant="outline" size="sm" onClick={handleClose} className="mt-2">
                    Ver productos
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {items.map((item) => {
                    const price = item.product.sale_price ?? item.product.price;
                    return (
                      <div key={item.product.id} className="flex gap-4 px-4 py-4">
                        {/* Image */}
                        <div className="shrink-0">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="size-16 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="grid size-16 place-items-center rounded-xl bg-muted">
                              <Package className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {item.product.name}
                            </p>
                            <button
                              onClick={() => removeItem(item.product.id)}
                              className="shrink-0 grid size-6 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Eliminar ${item.product.name}`}
                            >
                              <X className="size-3.5" strokeWidth={2} />
                            </button>
                          </div>

                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1">
                              📝 {item.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            {/* Qty controls */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                                aria-label="Restar uno"
                              >
                                <Minus className="size-3" strokeWidth={2} />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                                aria-label="Sumar uno"
                              >
                                <Plus className="size-3" strokeWidth={2} />
                              </button>
                            </div>

                            {/* Price */}
                            <p className="text-sm font-semibold">
                              {$}{(price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="shrink-0 border-t border-border/60 bg-background px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{$}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Costo de envío</span>
                  <span>Calculado posteriormente</span>
                </div>
                <Button
                  className="w-full h-12 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all"
                  onClick={handleContinueToStep2}
                >
                  Continuar
                </Button>
              </div>
            )}
          </>
        )}

        {/* ─── STEP 2: Customer data ─── */}
        {step === 2 && (
          <>
            <div className="flex-1 overflow-y-auto">
              <form id="checkout-form" onSubmit={handleContinueToStep3} className="space-y-5 p-4">
                {error && (
                  <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cd-name">Nombre completo *</Label>
                  <Input
                    id="cd-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="cd-phone">Teléfono *</Label>
                  <Input
                    id="cd-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 11 1234 5678"
                    required
                  />
                </div>

                {/* Delivery type */}
                <div className="space-y-2">
                  <Label>Tipo de entrega</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("delivery")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all duration-200",
                        deliveryType === "delivery"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Truck className="size-4" strokeWidth={1.5} />
                      Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("pickup")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all duration-200",
                        deliveryType === "pickup"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Store className="size-4" strokeWidth={1.5} />
                      Retiro en tienda
                    </button>
                  </div>
                </div>

                {/* Address fields */}
                {deliveryType === "delivery" && (
                  <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cd-address">Dirección *</Label>
                      <Input
                        id="cd-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle y número"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cd-neighborhood">Barrio</Label>
                      <Input
                        id="cd-neighborhood"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Barrio o colonia"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cd-reference">Referencia</Label>
                      <Input
                        id="cd-reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Cerca de... / color de casa..."
                      />
                    </div>
                  </div>
                )}

                {/* Payment */}
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentOptions.map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-medium transition-all duration-200",
                          paymentMethod === value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.5} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "cash" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-cash">¿Con cuánto pagará?</Label>
                    <Input
                      id="cd-cash"
                      type="number"
                      min="0"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Ej. 50"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="cd-notes">Notas adicionales (opcional)</Label>
                  <Textarea
                    id="cd-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones especiales..."
                    rows={2}
                  />
                </div>

                <div className="h-2" />
              </form>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border/60 bg-background px-4 py-4">
              <Button
                type="submit"
                form="checkout-form"
                className="w-full h-12 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all"
                disabled={busy}
              >
                Revisar pedido
              </Button>
            </div>
          </>
        )}

        {/* ─── STEP 3: Confirmation ─── */}
        {step === 3 && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Confirmation header */}
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center space-y-1">
                <CheckCircle2 className="mx-auto size-8 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-foreground">Tu pedido está listo</p>
                <p className="text-xs text-muted-foreground">Revísalo antes de enviarlo por WhatsApp</p>
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-border/60 divide-y divide-border/60">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Productos
                  </p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const price = item.product.sale_price ?? item.product.price;
                      return (
                        <div key={item.product.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground/80 flex-1 min-w-0 truncate">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span className="text-sm font-semibold shrink-0">
                            {$}{(price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-base font-bold">{$}{subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer info */}
              <div className="rounded-xl border border-border/60 divide-y divide-border/60">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Datos del cliente
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Nombre:</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Teléfono:</span>
                      <span className="font-medium">{phone}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Entrega:</span>
                      <span className="font-medium">
                        {deliveryType === "delivery" ? "Delivery" : "Retiro en tienda"}
                      </span>
                    </div>
                    {deliveryType === "delivery" && address && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">Dirección:</span>
                        <span className="font-medium">{address}{neighborhood ? `, ${neighborhood}` : ""}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">Pago:</span>
                      <span className="font-medium">
                        {paymentLabel[paymentMethod]}
                        {paymentMethod === "cash" && cashAmount ? ` (con $${cashAmount})` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-2" />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border/60 bg-background px-4 py-4">
              {error && (
                <div className="mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button
                onClick={handleSendWhatsApp}
                disabled={busy}
                className="w-full h-12 rounded-xl text-sm font-semibold gap-2 active:scale-[0.98] transition-all bg-[#25D366] hover:bg-[#20bd5a] text-white"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageCircle className="size-4" strokeWidth={1.5} />
                )}
                {busy ? "Abriendo WhatsApp..." : "Abrir WhatsApp"}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  Package,
  ChevronLeft,
  Truck,
  Store,
  Banknote,
  CreditCard,
  HandCoins,
  MessageCircle,
  CheckCircle2,
  Loader2,
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

const checkoutStepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
    filter: "blur(6px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
    filter: "blur(6px)",
  }),
};

const checkoutEase = [0.22, 0.61, 0.36, 1] as const;

const checkoutStepTransition = {
  duration: 0.24,
  ease: checkoutEase,
} as const;

const stackedBlockVariants = {
  enter: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    filter: "blur(5px)",
  },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.985,
    filter: "blur(5px)",
  },
};

const stackedBlockTransition = {
  duration: 0.28,
  ease: checkoutEase,
} as const;

const stackedLayoutTransition = {
  layout: {
    duration: 0.36,
    ease: checkoutEase,
  },
  opacity: {
    duration: 0.22,
    ease: checkoutEase,
  },
} as const;

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
  const [stepDirection, setStepDirection] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setStepDirection(-1);
    setStep(1);
    onClose();
  }, [onClose]);

  function goToStep(nextStep: Step) {
    setStepDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  }

  function handleContinueToStep2() {
    if (items.length === 0) return;
    goToStep(2);
  }

  async function handleContinueToStep3(e: React.FormEvent) {
    e.preventDefault();
    goToStep(3);
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

  const stepSubtitles: Record<Step, string> = {
    1: "Ajusta cantidades antes de continuar",
    2: "Completa solo lo necesario para preparar la entrega",
    3: "Última revisión antes de enviarlo por WhatsApp",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Centered checkout modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={stepTitles[step]}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex h-[min(760px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-[0_30px_90px_-28px_rgba(15,23,42,0.65)] ring-1 ring-black/5",
          "transition-all duration-300 ease-out",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div className="grid shrink-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-start gap-3 border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex justify-start">
            {step > 1 && (
              <button
                onClick={() => goToStep((step - 1) as Step)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Volver"
              >
                <ChevronLeft className="size-5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="min-w-0 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {step === 1 && (
                <ShoppingBag className="size-4 text-muted-foreground" strokeWidth={1.5} />
              )}
              <span className="text-base font-semibold leading-tight">{stepTitles[step]}</span>
              {step === 1 && itemCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <span className="max-w-md leading-snug">{stepSubtitles[step]}</span>
              <span className="mt-1.5 block w-fit rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Paso {step} de 3
              </span>
            </div>
            {/* Step indicator */}
            <div className="mx-auto mt-2.5 flex max-w-lg items-center gap-1">
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    s <= step ? "bg-primary" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait" custom={stepDirection}>
          {/* ─── STEP 1: Order review ─── */}
          {step === 1 && (
            <motion.div
              key="checkout-step-1"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={checkoutStepTransition}
              className="min-h-0 flex-1 flex flex-col"
            >
              <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {items.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center">
                    <div className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/40">
                      <ShoppingBag className="size-8" strokeWidth={1} />
                    </div>
                    <p className="text-sm font-medium text-foreground">Tu carrito está vacío</p>
                    <p className="text-xs text-muted-foreground">
                      Agrega productos para comenzar tu pedido
                    </p>
                    <Button variant="outline" size="sm" onClick={handleClose} className="mt-2">
                      Ver productos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const price = item.product.sale_price ?? item.product.price;
                      return (
                        <div
                          key={item.product.id}
                          className="flex gap-4 rounded-2xl border border-border/60 bg-muted/25 p-3"
                        >
                          {/* Image */}
                          <div className="shrink-0">
                            {item.product.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="size-20 rounded-2xl object-cover"
                              />
                            ) : (
                              <div className="grid size-20 place-items-center rounded-2xl bg-muted">
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
                                  className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                                  aria-label="Restar uno"
                                >
                                  <Minus className="size-3" strokeWidth={2} />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
                                  aria-label="Sumar uno"
                                >
                                  <Plus className="size-3" strokeWidth={2} />
                                </button>
                              </div>

                              {/* Price */}
                              <p className="text-sm font-semibold">
                                {$}
                                {(price * item.quantity).toFixed(2)}
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
                <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/95 px-5 py-4 shadow-[0_-16px_32px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                  <div className="space-y-2 rounded-2xl bg-muted/35 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">
                        {$}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span>Costo de envío</span>
                      <span className="text-right">Calculado posteriormente</span>
                    </div>
                  </div>
                  <Button
                    className="h-12 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    onClick={handleContinueToStep2}
                  >
                    Continuar
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── STEP 2: Customer data ─── */}
          {step === 2 && (
            <motion.div
              key="checkout-step-2"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={checkoutStepTransition}
              className="min-h-0 flex-1 flex flex-col"
            >
              <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <motion.form
                  id="checkout-form"
                  layout
                  transition={stackedLayoutTransition}
                  onSubmit={handleContinueToStep3}
                  className="space-y-4"
                >
                  {error && (
                    <motion.div
                      layout
                      transition={stackedLayoutTransition}
                      className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                      {error}
                    </motion.div>
                  )}

                  <motion.div
                    layout
                    transition={stackedLayoutTransition}
                    className="grid gap-3 sm:grid-cols-2"
                  >
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
                  </motion.div>

                  {/* Delivery type */}
                  <motion.div layout transition={stackedLayoutTransition} className="space-y-2">
                    <Label>Tipo de entrega</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("delivery")}
                        className={cn(
                          "flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200",
                          deliveryType === "delivery"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <Truck className="size-4" strokeWidth={1.5} />
                        Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("pickup")}
                        className={cn(
                          "flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200",
                          deliveryType === "pickup"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <Store className="size-4" strokeWidth={1.5} />
                        Retiro en tienda
                      </button>
                    </div>
                  </motion.div>

                  {/* Address fields */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {deliveryType === "delivery" && (
                      <motion.div
                        key="delivery-address-fields"
                        layout
                        variants={stackedBlockVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={stackedBlockTransition}
                        className="space-y-3 rounded-2xl bg-muted/35 p-4"
                      >
                        <motion.div
                          layout
                          transition={stackedLayoutTransition}
                          className="space-y-1.5"
                        >
                          <Label htmlFor="cd-address">Dirección *</Label>
                          <Input
                            id="cd-address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Calle y número"
                            required
                          />
                        </motion.div>
                        <motion.div
                          layout
                          transition={stackedLayoutTransition}
                          className="space-y-1.5"
                        >
                          <Label htmlFor="cd-neighborhood">Barrio</Label>
                          <Input
                            id="cd-neighborhood"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            placeholder="Barrio o colonia"
                          />
                        </motion.div>
                        <motion.div
                          layout
                          transition={stackedLayoutTransition}
                          className="space-y-1.5"
                        >
                          <Label htmlFor="cd-reference">Referencia</Label>
                          <Input
                            id="cd-reference"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Cerca de... / color de casa..."
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Payment */}
                  <motion.div layout transition={stackedLayoutTransition} className="space-y-2">
                    <Label>Método de pago</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentOptions.map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPaymentMethod(value)}
                          className={cn(
                            "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center text-xs font-medium transition-all duration-200",
                            paymentMethod === value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          <Icon className="size-4" strokeWidth={1.5} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  <AnimatePresence initial={false} mode="popLayout">
                    {paymentMethod === "cash" && (
                      <motion.div
                        key="cash-amount-field"
                        layout
                        variants={stackedBlockVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={stackedBlockTransition}
                        className="space-y-1.5"
                      >
                        <Label htmlFor="cd-cash">¿Con cuánto pagará?</Label>
                        <Input
                          id="cd-cash"
                          type="number"
                          min="0"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="Ej. 50"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Notes */}
                  <motion.div layout transition={stackedLayoutTransition} className="space-y-1.5">
                    <Label htmlFor="cd-notes">Notas adicionales (opcional)</Label>
                    <Textarea
                      id="cd-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Instrucciones especiales..."
                      rows={2}
                    />
                  </motion.div>
                </motion.form>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border/60 bg-background/95 px-5 py-4 shadow-[0_-16px_32px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                <Button
                  type="submit"
                  form="checkout-form"
                  className="h-12 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                  disabled={busy}
                >
                  Revisar pedido
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Confirmation ─── */}
          {step === 3 && (
            <motion.div
              key="checkout-step-3"
              custom={stepDirection}
              variants={checkoutStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={checkoutStepTransition}
              className="min-h-0 flex-1 flex flex-col"
            >
              <div ref={contentRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {/* Confirmation header */}
                <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="size-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Tu pedido está listo</p>
                    <p className="text-xs text-muted-foreground">
                      Revisa los datos antes de enviarlo por WhatsApp.
                    </p>
                  </div>
                </div>

                {/* Order summary */}
                <div className="divide-y divide-border/60 rounded-2xl border border-border/60">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Productos
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const price = item.product.sale_price ?? item.product.price;
                        return (
                          <div
                            key={item.product.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-sm text-foreground/80 flex-1 min-w-0 truncate">
                              {item.quantity}x {item.product.name}
                            </span>
                            <span className="text-sm font-semibold shrink-0">
                              {$}
                              {(price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-base font-bold">
                      {$}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Customer info */}
                <div className="divide-y divide-border/60 rounded-2xl border border-border/60">
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
                          <span className="font-medium">
                            {address}
                            {neighborhood ? `, ${neighborhood}` : ""}
                          </span>
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
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-border/60 bg-background/95 px-5 py-4 shadow-[0_-16px_32px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                {error && (
                  <div className="mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={busy}
                  className="h-12 w-full gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition-all hover:bg-[#20bd5a] active:scale-[0.98]"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4" strokeWidth={1.5} />
                  )}
                  {busy ? "Abriendo WhatsApp..." : "Abrir WhatsApp"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

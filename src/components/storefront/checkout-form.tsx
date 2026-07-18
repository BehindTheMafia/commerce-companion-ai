import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Truck, Store, Banknote, CreditCard, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";

export type CustomerData = {
  name: string;
  phone: string;
  deliveryType: "delivery" | "pickup";
  address: string;
  neighborhood: string;
  reference: string;
  notes: string;
  paymentMethod: "cash" | "transfer" | "cod";
  cashAmount: string;
};

type CheckoutFormProps = {
  busy: boolean;
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
};

export function CheckoutForm({ busy, onSubmit, onBack }: CheckoutFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "cod">("cash");
  const [cashAmount, setCashAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name & Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">Nombre completo *</Label>
        <Input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-phone">Teléfono *</Label>
        <Input
          id="cf-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+54 11 1234 5678"
          required
        />
      </div>

      {/* Delivery type toggle */}
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

      {/* Delivery address fields — conditional */}
      {deliveryType === "delivery" && (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-address">Dirección *</Label>
            <Input
              id="cf-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle y número"
              required={deliveryType === "delivery"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-neighborhood">Barrio</Label>
            <Input
              id="cf-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Barrio o colonia"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-reference">Referencia</Label>
            <Input
              id="cf-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Cerca de... / color de casa..."
            />
          </div>
        </div>
      )}

      {/* Payment method */}
      <div className="space-y-2">
        <Label>Método de pago</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "cash", icon: Banknote, label: "Efectivo" },
              { value: "transfer", icon: CreditCard, label: "Transferencia" },
              { value: "cod", icon: HandCoins, label: "Contra entrega" },
            ] as const
          ).map(({ value, icon: Icon, label }) => (
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

      {/* Cash amount — conditional */}
      {paymentMethod === "cash" && (
        <div className="space-y-1.5">
          <Label htmlFor="cf-cash">¿Con cuánto pagará?</Label>
          <Input
            id="cf-cash"
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
        <Label htmlFor="cf-notes">Notas adicionales (opcional)</Label>
        <Textarea
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instrucciones especiales para el pedido..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={busy} className="shrink-0">
          Volver
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Procesando...
            </>
          ) : (
            "Confirmar pedido"
          )}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export type CustomerData = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

type CheckoutFormProps = {
  busy: boolean;
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
};

export function CheckoutForm({ busy, onSubmit, onBack }: CheckoutFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, phone, address, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="space-y-1.5">
        <Label htmlFor="cf-address">Dirección de envío *</Label>
        <Input
          id="cf-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, ciudad"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cf-notes">Notas (opcional)</Label>
        <Textarea
          id="cf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instrucciones especiales..."
          rows={3}
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creando pedido...
            </>
          ) : (
            "Enviar pedido por WhatsApp"
          )}
        </Button>
      </div>
    </form>
  );
}

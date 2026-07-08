import { createFileRoute } from "@tanstack/react-router";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { activeBusiness, refetch } = useBusiness();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (activeBusiness) { setName(activeBusiness.name); setCurrency(activeBusiness.currency); }
  }, [activeBusiness]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("businesses").update({ name, currency }).eq("id", activeBusiness.id);
      if (error) throw error;
      toast.success("Guardado");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader title="Ajustes" description="Configuración general de tu empresa." />
      <Card className="mt-6 p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Nombre de la empresa</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-currency">Moneda</Label>
            <Input id="s-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
          <Button type="submit" disabled={busy}>Guardar cambios</Button>
        </form>
      </Card>
    </div>
  );
}

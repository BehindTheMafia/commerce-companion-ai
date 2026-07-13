import { createFileRoute } from "@tanstack/react-router";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Copy, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { activeBusiness, refetch } = useBusiness();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name);
      setCurrency(activeBusiness.currency);
      setLogoUrl(activeBusiness.logo_url || "");
    }
  }, [activeBusiness]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ name, currency, logo_url: logoUrl || null })
        .eq("id", activeBusiness.id);
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

      {activeBusiness?.slug && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Tu tienda online</p>
                <a
                  href={`/go/${activeBusiness.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground underline transition-colors hover:text-foreground"
                >
                  hyperbeecommerce.vercel.app/go/{activeBusiness.slug}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`https://hyperbeecommerce.vercel.app/go/${activeBusiness.slug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Logo de la empresa</Label>
            <ImageUpload value={logoUrl} onChange={setLogoUrl} />
          </div>
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

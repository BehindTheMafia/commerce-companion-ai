import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("*")
        .eq("business_id", activeBusiness!.id).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("categories").insert({
        business_id: activeBusiness.id, name, slug: slug + "-" + Math.random().toString(36).slice(2, 5),
      });
      if (error) throw error;
      toast.success("Categoría creada");
      setName(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Categorías"
        description="Organiza tu catálogo en categorías y subcategorías."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> Nueva</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva categoría</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Nombre</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <DialogFooter><Button type="submit" disabled={busy}>Crear</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 ? (
          <Card className="col-span-full flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Tag className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Aún no tienes categorías.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" /> Crear la primera</Button>
          </Card>
        ) : categories.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Tag className="size-4" /></div>
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.slug}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

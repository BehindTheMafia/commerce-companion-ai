import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/categories_/new")({
  component: NewCategoryPage,
});

function NewCategoryPage() {
  const { activeBusiness } = useBusiness();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("none");
  const [busy, setBusy] = useState(false);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-parents-new", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name")
        .eq("business_id", activeBusiness!.id)
        .order("name");
      return data ?? [];
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const slug_val = slug + "-" + Math.random().toString(36).slice(2, 5);
      const { error } = await supabase.from("categories").insert({
        business_id: activeBusiness.id,
        name,
        slug: slug_val,
        description: description || null,
        parent_id: parentId && parentId !== "none" ? parentId : null,
      });
      if (error) throw error;
      toast.success("Categoría creada");
      qc.invalidateQueries({ queryKey: ["categories"] });
      navigate({ to: "/app/categories" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la categoría");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-8 border-b border-border/60 bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/categories" })}>
            <X className="mr-1.5 size-4" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || busy}>
            {busy ? "Guardando..." : "Crear categoría"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nueva categoría</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una categoría para organizar tus productos.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Electrónicos"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug || "auto-generado"}
                placeholder="electronica"
                readOnly
                className="bg-muted/30 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Se generará automáticamente con un sufijo único.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Categoría padre</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Sin categoría padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría padre</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deja vacío para crear una categoría principal.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional..."
                rows={3}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Search, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/products")({
  component: ProductsPage,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductsPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,sku,price,sale_price,stock,status,image_url,description,category_id,category:categories(name)")
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-select", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").eq("business_id", activeBusiness!.id);
      return data ?? [];
    },
  });

  const filtered = products.filter((p) =>
    q ? p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase()) : true,
  );

  const editingProduct = editingId ? products.find((p) => p.id === editingId) ?? null : null;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Productos"
        description="Gestiona tu catálogo, precios e inventario."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nuevo producto</Button>
            {createOpen && (
              <ProductForm
                categories={categories}
                onDone={() => {
                  setCreateOpen(false);
                  qc.invalidateQueries({ queryKey: ["products"] });
                  qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
                }}
                onCancel={() => setCreateOpen(false)}
              />
            )}
          </Dialog>
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar productos..." className="pl-9" />
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => setCreateOpen(true)} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(p.category as { name?: string } | null)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.sale_price ? (
                      <span>
                        <span className="text-muted-foreground line-through">${Number(p.price).toFixed(2)}</span>{" "}
                        <span className="font-medium text-success">${Number(p.sale_price).toFixed(2)}</span>
                      </span>
                    ) : (
                      <span>${Number(p.price).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(p.id)}>
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) setEditingId(null); }}>
        {editingProduct && (
          <ProductForm
            product={editingProduct}
            categories={categories}
            onDone={() => {
              setEditingId(null);
              qc.invalidateQueries({ queryKey: ["products"] });
              qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
            }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Package className="size-6" />
      </div>
      <h3 className="text-base font-semibold">Aún no tienes productos</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Agrega tu primer producto para empezar a vender en tu tienda online.
      </p>
      <Button onClick={onNew} className="mt-2 gap-2"><Plus className="size-4" /> Nuevo producto</Button>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onDone,
  onCancel,
}: {
  product?: { id: string; name: string; sku: string | null; price: number; sale_price: number | null; stock: number; description: string | null; image_url: string | null; category_id: string | null; slug: string };
  categories: Array<{ id: string; name: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { activeBusiness } = useBusiness();
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(product?.sale_price?.toString() ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [busy, setBusy] = useState(false);
  const isEdit = !!product;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const payload = {
        name,
        sku: sku || null,
        description: description || null,
        price: Number(price || 0),
        sale_price: salePrice ? Number(salePrice) : null,
        stock: parseInt(stock || "0", 10),
        category_id: categoryId || null,
        image_url: imageUrl || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        const { error } = await supabase.from("products").insert({
          ...payload,
          business_id: activeBusiness.id,
          slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
          status: "active",
        });
        if (error) throw error;
        toast.success("Producto creado");
      }

      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nombre</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-sku">SKU</Label>
            <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cat">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="p-cat"><SelectValue placeholder="Ninguna" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-price">Precio</Label>
            <Input id="p-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-sale">Oferta</Label>
            <Input id="p-sale" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-stock">Stock</Label>
            <Input id="p-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Imagen del producto</Label>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Descripción</Label>
          <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{isEdit ? "Guardar" : "Crear"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

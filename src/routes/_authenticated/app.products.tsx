import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        description="Gestiona tu catalogo, precios e inventario."
        action={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar productos..."
                className="w-56 pl-9"
              />
            </div>
            <Button className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Nuevo producto
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
          </>
        }
      />

      {isLoading ? (
        <SkeletonLoader />
      ) : filtered.length === 0 ? (
        <EmptyState onNew={() => setCreateOpen(true)} hasQuery={!!q} />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onEdit={() => setEditingId(p.id)}
            />
          ))}
        </div>
      )}

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

function EmptyState({ onNew, hasQuery }: { onNew: () => void; hasQuery?: boolean }) {
  if (hasQuery) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-muted">
          <Search className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Sin resultados</h3>
        <p className="text-sm text-muted-foreground">Ningun producto coincide con tu busqueda.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 flex flex-col items-center gap-5 text-center">
      <div className="relative">
        <div className="grid size-20 place-items-center rounded-2xl bg-primary/[0.06] text-primary ring-1 ring-primary/10">
          <Package className="size-8" />
        </div>
        <div className="absolute -right-2 -top-1 grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
          <Plus className="size-3" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Aun no tienes productos</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Agrega tu primer producto para empezar a vender en tu tienda online.
        </p>
      </div>
      <Button onClick={onNew} className="mt-1 gap-2">
        <Plus className="size-4" /> Nuevo producto
      </Button>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
          <div className="mb-3 aspect-square rounded-lg bg-muted" />
          <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
          <div className="mb-3 h-3 w-1/2 rounded bg-muted" />
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-5 w-14 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  index,
  onEdit,
}: {
  product: { id: string; name: string; sku: string | null; price: number; sale_price: number | null; stock: number; status: string; image_url: string | null; category: { name?: string } | null };
  index: number;
  onEdit: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasSale = product.sale_price != null && product.sale_price < product.price;

  return (
    <div
      className="group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animation: `fadeSlideIn 0.4s both ease-out`, animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={onEdit}
        className="absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-md border bg-background text-muted-foreground opacity-0 shadow-sm transition-all duration-200 hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="size-3.5" />
      </button>

      <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-muted">
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover transition-all duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-8 text-muted-foreground/20" />
          </div>
        )}
      </div>

      <div>
        <div className="mb-0.5 flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-medium text-foreground">{product.name}</h3>
        </div>
        {product.sku && (
          <p className="mb-2 truncate text-xs text-muted-foreground">{product.sku}</p>
        )}
        {product.category?.name && (
          <p className="mb-2 truncate text-xs text-muted-foreground">{product.category.name}</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="space-y-0.5">
          {hasSale ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-success">
                ${Number(product.sale_price).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground line-through">
                ${Number(product.price).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold">${Number(product.price).toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-xs text-muted-foreground">{product.stock} und.</span>
          <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-[10px]">
            {product.status === "active" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>
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
    <DialogContent className="max-h-[92vh] sm:max-h-[85vh] w-[92vw] sm:w-full overflow-y-auto sm:max-w-xl [&>button]:top-6 [&>button]:right-6 shadow-2xl border-border/40 scrollbar-thin">
      <div className="px-0.5">
        <DialogHeader className="pb-5 border-b border-border/30">
          <DialogTitle className="text-2xl tracking-tight font-semibold">{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <p className="text-sm text-muted-foreground/80 font-normal mt-1.5 leading-relaxed">
            {isEdit ? "Actualiza los datos del producto." : "Completa los datos para agregar un nuevo producto a tu catalogo."}
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="pt-6 space-y-5">
          <div className="flex justify-center pb-2">
            <div className="w-40">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="p-name" className="text-sm font-medium tracking-tight">Nombre del producto</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Camiseta de algodón" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <Label htmlFor="p-sku" className="text-sm font-medium tracking-tight">SKU</Label>
                <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="PROD-001" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cat" className="text-sm font-medium tracking-tight">Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="p-cat" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div className="space-y-2">
                <Label htmlFor="p-price" className="text-sm font-medium tracking-tight">Precio</Label>
                <Input id="p-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sale" className="text-sm font-medium tracking-tight">Oferta</Label>
                <Input id="p-sale" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-stock" className="text-sm font-medium tracking-tight">Stock</Label>
                <Input id="p-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc" className="text-sm font-medium tracking-tight">Descripción</Label>
              <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe los detalles del producto..." className="min-h-[88px] resize-y transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50" />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-5 border-t border-border/30">
            <Button type="button" variant="outline" onClick={onCancel} className="active:scale-[0.97] transition-all duration-150 ease-[cubic-bezier(.22,.61,.36,1)]">
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="min-w-[130px] active:scale-[0.97] transition-all duration-150 ease-[cubic-bezier(.22,.61,.36,1)]">
              {busy ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </DialogContent>
  );
}

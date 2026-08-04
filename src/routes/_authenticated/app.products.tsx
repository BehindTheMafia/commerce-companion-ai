import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { activeBusiness } = useBusiness();
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        toast.error("Error al eliminar el producto");
        return;
      }
      toast.success("Producto eliminado");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } finally {
      setDeletingId(null);
    }
  }

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,slug,sku,price,sale_price,stock,status,image_url,description,category_id,pricing_modes,specifications,shipping_info,warranty_info,wholesale_info,category:categories(name)",
        )
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = products.filter((p) =>
    q
      ? p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(q.toLowerCase())
      : true,
  );

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
            <Button
              className="gap-2 shrink-0"
              onClick={() => navigate({ to: "/app/products/new" })}
            >
              <Plus className="size-4" /> Nuevo producto
            </Button>
          </>
        }
      />

      {isLoading ? (
        <SkeletonLoader />
      ) : filtered.length === 0 ? (
        <EmptyState onNew={() => navigate({ to: "/app/products/new" })} hasQuery={!!q} />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              deleting={deletingId === p.id}
              onEdit={() => navigate({ to: "/app/products/$id/edit", params: { id: p.id } })}
              onDelete={() => handleDelete(p.id, p.name)}
            />
          ))}
        </div>
      )}
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
  deleting,
  onEdit,
  onDelete,
}: {
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    sale_price: number | null;
    stock: number;
    status: string;
    image_url: string | null;
    category: { name?: string } | null;
  };
  index: number;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasSale = product.sale_price != null && product.sale_price < product.price;

  return (
    <div
      className="group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animation: `fadeSlideIn 0.4s both ease-out`, animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${product.name}`}
          className="grid size-7 place-items-center rounded-md border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Eliminar ${product.name}`}
          className="grid size-7 place-items-center rounded-md border bg-background text-muted-foreground shadow-sm hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      </div>

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
          <Badge
            variant={product.status === "active" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {product.status === "active" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

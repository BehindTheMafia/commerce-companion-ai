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
import { Tabs, TabsList, TabsTab, TabsPanels, TabsPanel } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Search, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/products")({
  component: ProductsPage,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function genId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

type PricingModeForm = {
  id: string;
  name: string;
  price: number;
  minimumQuantity: number;
  badge: string;
  description: string;
  enabled: boolean;
};

type VariantValueForm = {
  id: string;
  label: string;
  value: string;
  image_url: string;
  available: boolean;
  sort_order: number;
};

type VariantGroupForm = {
  id: string;
  name: string;
  type: string;
  values: VariantValueForm[];
  sort_order: number;
};

type SpecForm = {
  id: string;
  label: string;
  value: string;
};

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
        .select("id,name,slug,sku,price,sale_price,stock,status,image_url,description,category_id,pricing_modes,specifications,shipping_info,warranty_info,wholesale_info,category:categories(name)")
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
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

  const editingProduct = editingId ? (products as any[]).find((p) => p.id === editingId) ?? null : null;

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
  product?: { id: string; name: string; sku: string | null; price: number; sale_price: number | null; stock: number; description: string | null; image_url: string | null; category_id: string | null; slug: string; pricing_modes?: unknown; specifications?: unknown; shipping_info?: string | null; warranty_info?: string | null; wholesale_info?: string | null };
  categories: Array<{ id: string; name: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { activeBusiness } = useBusiness();
  const isEdit = !!product;

  const parseModes = (): PricingModeForm[] => {
    if (!product?.pricing_modes || !Array.isArray(product.pricing_modes)) return [];
    return product.pricing_modes.map((m: Record<string, unknown>) => ({
      id: (m.id as string) ?? genId(),
      name: (m.name as string) ?? "",
      price: (m.price as number) ?? 0,
      minimumQuantity: (m.minimumQuantity as number) ?? 1,
      badge: (m.badge as string) ?? "",
      description: (m.description as string) ?? "",
      enabled: (m.enabled as boolean) ?? true,
    }));
  };

  const parseSpecs = (): SpecForm[] => {
    if (!product?.specifications || !Array.isArray(product.specifications)) return [];
    return product.specifications.map((s: Record<string, unknown>) => ({
      id: genId(),
      label: (s.label as string) ?? "",
      value: (s.value as string) ?? "",
    }));
  };

  const [tab, setTab] = useState("general");
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(product?.sale_price?.toString() ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [brandId, setBrandId] = useState<string>("");
  const [pricingModes, setPricingModes] = useState<PricingModeForm[]>(parseModes);
  const [variantGroups, setVariantGroups] = useState<VariantGroupForm[]>([]);
  const [specs, setSpecs] = useState<SpecForm[]>(parseSpecs);
  const [shippingInfo, setShippingInfo] = useState(product?.shipping_info ?? "");
  const [warrantyInfo, setWarrantyInfo] = useState(product?.warranty_info ?? "");
  const [wholesaleInfo, setWholesaleInfo] = useState(product?.wholesale_info ?? "");
  const [busy, setBusy] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-select", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id,name").eq("business_id", activeBusiness!.id).order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!isEdit || !product?.id) return;
    (supabase as any)
      .from("products")
      .select("brand_id")
      .eq("id", product.id)
      .maybeSingle()
      .then(({ data }: { data: { brand_id: string } | null }) => {
        if (data?.brand_id) setBrandId(data.brand_id);
      });
  }, [isEdit, product?.id]);

  useEffect(() => {
    if (!isEdit || !product?.id) return;
    (supabase as any)
      .from("product_variants")
      .select("*, values:product_variant_values(*)")
      .eq("product_id", product.id)
      .order("sort_order")
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setVariantGroups(
            data.map((v: any) => ({
              id: v.id,
              name: v.name,
              type: v.type,
              sort_order: v.sort_order,
              values: (v.values ?? []).map((vl: any) => ({
                id: vl.id ?? genId(),
                label: vl.label ?? "",
                value: vl.value ?? "",
                image_url: vl.image_url ?? "",
                available: vl.available ?? true,
                sort_order: vl.sort_order ?? 0,
              })),
            })),
          );
        }
      });
  }, [isEdit, product?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const pricing_modes_data = pricingModes.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        minimumQuantity: m.minimumQuantity,
        badge: m.badge || null,
        description: m.description || null,
        enabled: m.enabled,
        sortOrder: pricingModes.indexOf(m),
      }));

      const specifications_data = specs.filter((s) => s.label && s.value).map((s) => ({
        label: s.label,
        value: s.value,
      }));

      const payload: Record<string, unknown> = {
        name,
        sku: sku || null,
        description: description || null,
        price: Number(price || 0),
        sale_price: salePrice ? Number(salePrice) : null,
        stock: parseInt(stock || "0", 10),
        category_id: categoryId || null,
        brand_id: brandId || null,
        image_url: imageUrl || null,
        pricing_modes: pricing_modes_data,
        specifications: specifications_data,
        shipping_info: shippingInfo || null,
        warranty_info: warrantyInfo || null,
        wholesale_info: wholesaleInfo || null,
      };

      let productId = product?.id;

      const sb = supabase as any;

      if (isEdit) {
        const { error } = await sb.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        toast.success("Producto actualizado");
      } else {
        const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
        const { data: inserted, error } = await sb
          .from("products")
          .insert({ ...payload, business_id: activeBusiness.id, slug, status: "active" })
          .select("id")
          .single();
        if (error) throw error;
        productId = inserted.id;
        toast.success("Producto creado");
      }

      // Save variants (delete + reinsert)
      if (productId) {
        const { data: existingVariants } = await sb.from("product_variants").select("id").eq("product_id", productId);
        const ids = (existingVariants ?? []).map((v: any) => v.id);
        if (ids.length > 0) {
          await sb.from("product_variant_values").delete().in("variant_id", ids);
          await sb.from("product_variants").delete().eq("product_id", productId);
        }

        for (const group of variantGroups) {
          if (!group.name) continue;
          const { data: insertedGroup } = await sb
            .from("product_variants")
            .insert({
              product_id: productId,
              name: group.name,
              type: group.type,
              sort_order: group.sort_order,
            })
            .select("id")
            .single();

          if (insertedGroup && group.values.length > 0) {
            await sb.from("product_variant_values").insert(
              group.values
                .filter((v: VariantValueForm) => v.label && v.value)
                .map((v: VariantValueForm, i: number) => ({
                  variant_id: insertedGroup.id,
                  label: v.label,
                  value: v.value,
                  image_url: v.image_url || null,
                  available: v.available,
                  sort_order: i,
                })),
            );
          }
        }
      }

      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function addPricingMode() {
    setPricingModes((prev) => [
      ...prev,
      { id: genId(), name: "", price: 0, minimumQuantity: 1, badge: "", description: "", enabled: true },
    ]);
  }

  function removePricingMode(id: string) {
    setPricingModes((prev) => prev.filter((m) => m.id !== id));
  }

  function updatePricingMode(id: string, field: string, value: unknown) {
    setPricingModes((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  function addVariantGroup() {
    setVariantGroups((prev) => [
      ...prev,
      { id: genId(), name: "", type: "pill", values: [], sort_order: prev.length },
    ]);
  }

  function removeVariantGroup(id: string) {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function updateVariantGroup(id: string, field: string, value: unknown) {
    setVariantGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  }

  function addVariantValue(groupId: string) {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, values: [...g.values, { id: genId(), label: "", value: "", image_url: "", available: true, sort_order: g.values.length }] }
          : g,
      ),
    );
  }

  function removeVariantValue(groupId: string, valueId: string) {
    setVariantGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, values: g.values.filter((v) => v.id !== valueId) } : g)),
    );
  }

  function updateVariantValue(groupId: string, valueId: string, field: string, value: unknown) {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.map((v) => (v.id === valueId ? { ...v, [field]: value } : v)) }
          : g,
      ),
    );
  }

  function addSpec() {
    setSpecs((prev) => [...prev, { id: genId(), label: "", value: "" }]);
  }

  function removeSpec(id: string) {
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSpec(id: string, field: string, value: string) {
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  return (
    <DialogContent className="max-h-[92vh] sm:max-h-[90vh] w-[95vw] sm:max-w-2xl [&>button]:top-6 [&>button]:right-6 shadow-2xl border-border/40 scrollbar-thin">
      <div className="px-0.5 flex flex-col h-full">
        <DialogHeader className="pb-5 border-b border-border/30 shrink-0">
          <DialogTitle className="text-2xl tracking-tight font-semibold">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground/80 font-normal mt-1.5 leading-relaxed">
            {isEdit ? "Actualiza los datos del producto." : "Completa los datos para agregar un nuevo producto a tu catalogo."}
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent p-0 h-auto shrink-0 overflow-x-auto [&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-transparent [&>button]:px-4 [&>button]:py-3 [&>button]:text-sm [&>button]:font-medium [&>button]:data-[selected]:border-primary [&>button]:data-[selected]:bg-transparent [&>button]:data-[selected]:shadow-none">
            {["general", "pricing", "variants", "specs", "extended"].map((t) => (
              <TabsTab
                key={t}
                value={t}
              >
                {t === "general" ? "General" : t === "pricing" ? "Precios" : t === "variants" ? "Variantes" : t === "specs" ? "Especificaciones" : "Info extra"}
              </TabsTab>
            ))}
          </TabsList>

          <TabsPanels className="flex-1 flex flex-col min-h-0">
          <form onSubmit={submit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-0.5 py-5">
              {/* TAB: GENERAL */}
              <TabsPanel value="general" className="mt-0 space-y-5">
                <div className="flex justify-center pb-2">
                  <div className="w-40">
                    <ImageUpload value={imageUrl} onChange={setImageUrl} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-name">Nombre del producto</Label>
                  <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Camiseta de algodón" className="h-10" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-sku">SKU</Label>
                    <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="PROD-001" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-cat">Categoría</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger id="p-cat" className="h-10">
                        <SelectValue placeholder="Sin categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-brand">Marca</Label>
                    <Select value={brandId} onValueChange={setBrandId}>
                      <SelectTrigger id="p-brand" className="h-10">
                        <SelectValue placeholder="Sin marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="p-price">Precio</Label>
                    <Input id="p-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-sale">Oferta</Label>
                    <Input id="p-sale" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-stock">Stock</Label>
                    <Input id="p-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-desc">Descripción</Label>
                  <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe los detalles del producto..." className="min-h-[88px] resize-y" />
                </div>
              </TabsPanel>

              {/* TAB: PRICING MODES */}
              <TabsPanel value="pricing" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Modalidades de precio</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPricingMode} className="gap-1">
                    <Plus className="size-3.5" /> Agregar
                  </Button>
                </div>
                {pricingModes.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin modalidades. Agrega Retail, Wholesale, etc.</p>
                )}
                {pricingModes.map((mode) => (
                  <div key={mode.id} className="rounded-lg border border-border/60 p-4 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removePricingMode(mode.id)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 pr-8">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nombre</Label>
                        <Input value={mode.name} onChange={(e) => updatePricingMode(mode.id, "name", e.target.value)} placeholder="Retail" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio</Label>
                        <Input type="number" step="0.01" min="0" value={mode.price} onChange={(e) => updatePricingMode(mode.id, "price", Number(e.target.value))} placeholder="0.00" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cant. mínima</Label>
                        <Input type="number" min="1" value={mode.minimumQuantity} onChange={(e) => updatePricingMode(mode.id, "minimumQuantity", Number(e.target.value))} placeholder="1" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Badge</Label>
                        <Input value={mode.badge} onChange={(e) => updatePricingMode(mode.id, "badge", e.target.value)} placeholder="Bulk" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs">Descripción</Label>
                        <Input value={mode.description} onChange={(e) => updatePricingMode(mode.id, "description", e.target.value)} placeholder="Descripción de esta modalidad..." className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={mode.enabled}
                        onCheckedChange={(v) => updatePricingMode(mode.id, "enabled", v)}
                        id={`mode-${mode.id}`}
                      />
                      <Label htmlFor={`mode-${mode.id}`} className="text-xs text-muted-foreground">Habilitado</Label>
                    </div>
                  </div>
                ))}
              </TabsPanel>

              {/* TAB: VARIANTS */}
              <TabsPanel value="variants" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Grupos de variantes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariantGroup} className="gap-1">
                    <Plus className="size-3.5" /> Agregar grupo
                  </Button>
                </div>
                {variantGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin variantes. Agrega grupos como Tamaño, Color, etc.</p>
                )}
                {variantGroups.map((group) => (
                  <div key={group.id} className="rounded-lg border border-border/60 p-4 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => removeVariantGroup(group.id)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 pr-8">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nombre del grupo</Label>
                        <Input value={group.name} onChange={(e) => updateVariantGroup(group.id, "name", e.target.value)} placeholder="Tamaño" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={group.type} onValueChange={(v) => updateVariantGroup(group.id, "type", v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pill">Pills</SelectItem>
                            <SelectItem value="segmented">Segmentado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Values */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Valores</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => addVariantValue(group.id)} className="h-7 text-xs gap-1">
                          <Plus className="size-3" /> Agregar valor
                        </Button>
                      </div>
                      {group.values.map((val) => (
                        <div key={val.id} className="flex items-center gap-2">
                          <Input value={val.label} onChange={(e) => updateVariantValue(group.id, val.id, "label", e.target.value)} placeholder="50ml" className="h-8 text-sm flex-1" />
                          <Input value={val.value} onChange={(e) => updateVariantValue(group.id, val.id, "value", e.target.value)} placeholder="50ml" className="h-8 text-sm w-24" />
                          <Input value={val.image_url} onChange={(e) => updateVariantValue(group.id, val.id, "image_url", e.target.value)} placeholder="URL imagen" className="h-8 text-sm flex-1 hidden sm:block" />
                          <button
                            type="button"
                            onClick={() => removeVariantValue(group.id, val.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsPanel>

              {/* TAB: SPECIFICATIONS */}
              <TabsPanel value="specs" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Especificaciones técnicas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpec} className="gap-1">
                    <Plus className="size-3.5" /> Agregar
                  </Button>
                </div>
                {specs.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin especificaciones. Agrega pares clave-valor.</p>
                )}
                {specs.map((spec) => (
                  <div key={spec.id} className="flex items-center gap-2">
                    <Input
                      value={spec.label}
                      onChange={(e) => updateSpec(spec.id, "label", e.target.value)}
                      placeholder="Etiqueta (ej: Fragrance Family)"
                      className="h-9 text-sm flex-1"
                    />
                    <Input
                      value={spec.value}
                      onChange={(e) => updateSpec(spec.id, "value", e.target.value)}
                      placeholder="Valor (ej: Woody Oriental)"
                      className="h-9 text-sm flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(spec.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </TabsPanel>

              {/* TAB: EXTENDED INFO */}
              <TabsPanel value="extended" className="mt-0 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="p-ship">Información de envío</Label>
                  <Textarea id="p-ship" value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} rows={3} placeholder="Detalles sobre el envío..." className="resize-y" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-warranty">Política de devoluciones</Label>
                  <Textarea id="p-warranty" value={warrantyInfo} onChange={(e) => setWarrantyInfo(e.target.value)} rows={3} placeholder="Detalles sobre devoluciones y garantía..." className="resize-y" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-wholesale">Información para mayoreo</Label>
                  <Textarea id="p-wholesale" value={wholesaleInfo} onChange={(e) => setWholesaleInfo(e.target.value)} rows={3} placeholder="Detalles sobre compras al por mayor..." className="resize-y" />
                </div>
              </TabsPanel>
            </div>

            <DialogFooter className="gap-3 pt-4 border-t border-border/30 shrink-0">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy} className="min-w-[130px]">
                {busy ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
          </TabsPanels>
        </Tabs>
      </div>
    </DialogContent>
  );
}

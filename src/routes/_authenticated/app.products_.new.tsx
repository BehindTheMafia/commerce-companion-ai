import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Package,
  Trash2,
  Sparkles,
  ImageIcon,
  Upload,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";

export const Route = createFileRoute("/_authenticated/app/products_/new")({
  component: NewProductPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function NewProductPage() {
  const { activeBusiness } = useBusiness();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [visibility, setVisibility] = useState("visible");
  const [pricingModes, setPricingModes] = useState<PricingModeForm[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroupForm[]>([]);
  const [specs, setSpecs] = useState<SpecForm[]>([]);
  const [shippingInfo, setShippingInfo] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState("");
  const [wholesaleInfo, setWholesaleInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-select-new", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name")
        .eq("business_id", activeBusiness!.id);
      return data ?? [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-select-new", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("id,name")
        .eq("business_id", activeBusiness!.id)
        .order("name");
      return data ?? [];
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
  }

  async function uploadImage(file: File) {
    setImageUploading(true);
    try {
      const { getImageKitAuth } = await import("@/lib/imagekit-auth");
      const auth = await getImageKitAuth();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", auth.publicKey);
      formData.append("token", auth.token);
      formData.append("expire", auth.expire.toString());
      formData.append("signature", auth.signature);
      formData.append("folder", "products");
      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      else throw new Error(data.message || "Error uploading");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen");
    } finally {
      setImageUploading(false);
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setImageDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadImage(file);
    }
  }, []);

  function addPricingMode() {
    setPricingModes((prev) => [
      ...prev,
      {
        id: genId(),
        name: "",
        price: 0,
        minimumQuantity: 1,
        badge: "",
        description: "",
        enabled: true,
      },
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
          ? {
              ...g,
              values: [
                ...g.values,
                {
                  id: genId(),
                  label: "",
                  value: "",
                  image_url: "",
                  available: true,
                  sort_order: g.values.length,
                },
              ],
            }
          : g,
      ),
    );
  }

  function removeVariantValue(groupId: string, valueId: string) {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, values: g.values.filter((v) => v.id !== valueId) } : g,
      ),
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

  async function submit(e: React.FormEvent, publishStatus: string) {
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

      const specifications_data = specs
        .filter((s) => s.label && s.value)
        .map((s) => ({
          label: s.label,
          value: s.value,
        }));

      type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
      const payload: Omit<ProductInsert, "business_id" | "slug"> = {
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
        status: publishStatus,
      };

      const slug_val = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);

      const { data: inserted, error } = await supabase
        .from("products")
        .insert({ ...payload, business_id: activeBusiness.id, slug: slug_val })
        .select("id")
        .single();

      if (error) throw error;
      const productId = inserted.id;

      if (productId) {
        const { data: existingVariants } = await supabase
          .from("product_variants")
          .select("id")
          .eq("product_id", productId);
        const ids = (existingVariants ?? []).map((v) => v.id);
        if (ids.length > 0) {
          await supabase.from("product_variant_values").delete().in("variant_id", ids);
          await supabase.from("product_variants").delete().eq("product_id", productId);
        }

        for (const group of variantGroups) {
          if (!group.name) continue;
          const { data: insertedGroup } = await supabase
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
            await supabase.from("product_variant_values").insert(
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

      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(publishStatus === "active" ? "Producto publicado" : "Borrador guardado");
      navigate({ to: "/app/products" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  function removeImage() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImageUrl("");
  }

  const totalVariants = variantGroups.reduce((s, g) => s + g.values.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-end px-6 py-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/app/products" })}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => formRef.current?.requestSubmit()}
              className="gap-1.5 h-8 text-xs"
            >
              <Sparkles className="size-3" />
              {busy ? "Guardando..." : "Publicar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Nuevo producto
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Completa los datos para agregar un nuevo producto a tu catálogo.
            </p>
          </div>

          <form ref={formRef} onSubmit={(e) => submit(e, "active")}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <Card className="border-border/40 p-6">
                  <div className="mb-5">
                    <h2 className="text-base font-semibold text-foreground">Imagen del producto</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Arrastra una imagen o haz clic para subir.
                    </p>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setImageDragOver(true);
                    }}
                    onDragLeave={() => setImageDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-200 ${
                      imageDragOver
                        ? "border-primary bg-primary/5"
                        : imageUrl
                          ? "border-border/40 bg-muted/20"
                          : "border-border/40 hover:border-muted-foreground/30 hover:bg-muted/20"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {imageUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                      </div>
                    ) : imageUrl ? (
                      <div className="w-full max-w-md">
                        <div className="relative group/image">
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="mx-auto max-h-64 rounded-lg object-contain"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <Upload className="size-6 text-white" />
                            <span className="text-xs font-medium text-white/90">
                              Cambiar imagen
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage();
                            }}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground shadow-sm transition-colors"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          Arrastra o haz clic para cambiar
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground/60 mb-4">
                          <ImageIcon className="size-6" />
                        </div>
                        <p className="text-sm font-medium text-foreground/70">
                          Arrastra una imagen aquí
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/50">
                          o haz clic para seleccionar · PNG, JPG, WebP
                        </p>
                      </>
                    )}
                  </div>
                </Card>

                <Card className="border-border/40 p-6">
                  <h2 className="text-base font-semibold text-foreground mb-5">
                    Información del producto
                  </h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="p-name" className="text-sm font-medium">
                        Nombre del producto
                      </Label>
                      <Input
                        id="p-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Ej: Camiseta de algodón premium"
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="p-sku" className="text-sm font-medium">
                          SKU
                        </Label>
                        <Input
                          id="p-sku"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="PROD-001"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-cat" className="text-sm font-medium">
                          Categoría
                        </Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger id="p-cat" className="h-10">
                            <SelectValue placeholder="Sin categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p-brand" className="text-sm font-medium">
                          Marca
                        </Label>
                        <Select value={brandId} onValueChange={setBrandId}>
                          <SelectTrigger id="p-brand" className="h-10">
                            <SelectValue placeholder="Sin marca" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="p-desc" className="text-sm font-medium">
                        Descripción
                      </Label>
                      <Textarea
                        id="p-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Describe los detalles del producto..."
                        className="min-h-[100px] resize-y"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="border-border/40 p-6">
                  <h2 className="text-base font-semibold text-foreground mb-5">
                    Precio e inventario
                  </h2>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="p-price" className="text-sm font-medium">
                        Precio
                      </Label>
                      <Input
                        id="p-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        placeholder="0.00"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-sale" className="text-sm font-medium">
                        Precio de oferta
                      </Label>
                      <Input
                        id="p-sale"
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="0.00"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-stock" className="text-sm font-medium">
                        Stock
                      </Label>
                      <Input
                        id="p-stock"
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border/30 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Modalidades de precio
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ej: Retail, Wholesale, Bulk
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPricingMode}
                        className="gap-1"
                      >
                        <Plus className="size-3.5" /> Agregar
                      </Button>
                    </div>
                    {pricingModes.length === 0 && (
                      <p className="text-sm text-muted-foreground/60 py-6 text-center border border-dashed border-border/40 rounded-lg">
                        Sin modalidades adicionales. El precio principal se usará por defecto.
                      </p>
                    )}
                    <div className="space-y-3">
                      {pricingModes.map((mode) => (
                        <div
                          key={mode.id}
                          className="rounded-lg border border-border/60 p-4 space-y-3 relative"
                        >
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
                              <Input
                                value={mode.name}
                                onChange={(e) => updatePricingMode(mode.id, "name", e.target.value)}
                                placeholder="Wholesale"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Precio</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={mode.price}
                                onChange={(e) =>
                                  updatePricingMode(mode.id, "price", Number(e.target.value))
                                }
                                placeholder="0.00"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Cant. mínima</Label>
                              <Input
                                type="number"
                                min="1"
                                value={mode.minimumQuantity}
                                onChange={(e) =>
                                  updatePricingMode(
                                    mode.id,
                                    "minimumQuantity",
                                    Number(e.target.value),
                                  )
                                }
                                placeholder="1"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Badge</Label>
                              <Input
                                value={mode.badge}
                                onChange={(e) =>
                                  updatePricingMode(mode.id, "badge", e.target.value)
                                }
                                placeholder="Bulk"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                              <Label className="text-xs">Descripción</Label>
                              <Input
                                value={mode.description}
                                onChange={(e) =>
                                  updatePricingMode(mode.id, "description", e.target.value)
                                }
                                placeholder="Descripción de esta modalidad..."
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              checked={mode.enabled}
                              onCheckedChange={(v) => updatePricingMode(mode.id, "enabled", v)}
                              id={`mode-${mode.id}`}
                            />
                            <Label
                              htmlFor={`mode-${mode.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Habilitado
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card className="border-border/40 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Variantes</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tamaño, color, sabor, etc.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariantGroup}
                      className="gap-1"
                    >
                      <Plus className="size-3.5" /> Agregar grupo
                    </Button>
                  </div>
                  {variantGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground/60 py-6 text-center border border-dashed border-border/40 rounded-lg">
                      Sin variantes. Agrega grupos como Tamaño, Color, etc.
                    </p>
                  )}
                  <div className="space-y-4">
                    {variantGroups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-border/60 p-4 space-y-3 relative"
                      >
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
                            <Input
                              value={group.name}
                              onChange={(e) => updateVariantGroup(group.id, "name", e.target.value)}
                              placeholder="Tamaño"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={group.type}
                              onValueChange={(v) => updateVariantGroup(group.id, "type", v)}
                            >
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
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Valores</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addVariantValue(group.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <Plus className="size-3" /> Agregar valor
                            </Button>
                          </div>
                          {group.values.map((val) => (
                            <div key={val.id} className="flex items-center gap-2">
                              <Input
                                value={val.label}
                                onChange={(e) =>
                                  updateVariantValue(group.id, val.id, "label", e.target.value)
                                }
                                placeholder="50ml"
                                className="h-8 text-sm flex-1"
                              />
                              <Input
                                value={val.value}
                                onChange={(e) =>
                                  updateVariantValue(group.id, val.id, "value", e.target.value)
                                }
                                placeholder="50ml"
                                className="h-8 text-sm w-24"
                              />
                              <Input
                                value={val.image_url}
                                onChange={(e) =>
                                  updateVariantValue(group.id, val.id, "image_url", e.target.value)
                                }
                                placeholder="URL imagen"
                                className="h-8 text-sm flex-1 hidden sm:block"
                              />
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
                  </div>
                </Card>

                <Card className="border-border/40 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Especificaciones técnicas
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Pares clave-valor</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSpec}
                      className="gap-1"
                    >
                      <Plus className="size-3.5" /> Agregar
                    </Button>
                  </div>
                  {specs.length === 0 && (
                    <p className="text-sm text-muted-foreground/60 py-6 text-center border border-dashed border-border/40 rounded-lg">
                      Sin especificaciones. Agrega pares clave-valor como Fragrance, Material, etc.
                    </p>
                  )}
                  <div className="space-y-2">
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
                  </div>
                </Card>

                <Card className="border-border/40 p-6">
                  <h2 className="text-base font-semibold text-foreground mb-5">
                    Información adicional
                  </h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="p-ship" className="text-sm font-medium">
                        Información de envío
                      </Label>
                      <Textarea
                        id="p-ship"
                        value={shippingInfo}
                        onChange={(e) => setShippingInfo(e.target.value)}
                        rows={3}
                        placeholder="Detalles sobre el envío..."
                        className="min-h-[88px] resize-y"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-warranty" className="text-sm font-medium">
                        Política de devoluciones
                      </Label>
                      <Textarea
                        id="p-warranty"
                        value={warrantyInfo}
                        onChange={(e) => setWarrantyInfo(e.target.value)}
                        rows={3}
                        placeholder="Detalles sobre devoluciones y garantía..."
                        className="min-h-[88px] resize-y"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-wholesale" className="text-sm font-medium">
                        Información para mayoreo
                      </Label>
                      <Textarea
                        id="p-wholesale"
                        value={wholesaleInfo}
                        onChange={(e) => setWholesaleInfo(e.target.value)}
                        rows={3}
                        placeholder="Detalles sobre compras al por mayor..."
                        className="min-h-[88px] resize-y"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="lg:sticky lg:top-24 lg:space-y-6">
                  <Card className="border-border/40 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                      Estado
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2 w-2 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-amber-500"}`}
                          />
                          <span className="text-sm text-foreground">Status</span>
                        </div>
                        <Badge
                          variant={status === "active" ? "default" : "secondary"}
                          className="text-[10px] font-medium"
                        >
                          {status === "active" ? "Activo" : "Borrador"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {visibility === "visible" ? (
                            <Eye className="size-4 text-muted-foreground" />
                          ) : (
                            <EyeOff className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-foreground">Visibilidad</span>
                        </div>
                        <Select value={visibility} onValueChange={setVisibility}>
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visible">Visible</SelectItem>
                            <SelectItem value="hidden">Oculto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-border/40 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                      Organización
                    </h3>
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Categoría</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Sin categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Marca</Label>
                        <Select value={brandId} onValueChange={setBrandId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Sin marca" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-border/40 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                      Inventario
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Stock</span>
                        <span className="text-sm font-semibold tabular-nums">{stock || "0"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Variantes</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {totalVariants}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Modalidades</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {pricingModes.length}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-border/40 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                      SEO
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Slug</Label>
                        <p className="text-xs text-foreground/70 font-mono truncate bg-muted/50 rounded px-2 py-1">
                          {slugify(name || "producto-nuevo")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Vista previa</Label>
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                          <p className="text-xs font-medium text-foreground truncate">
                            {name || "Nombre del producto"}
                          </p>
                          <p className="text-[10px] text-primary truncate">
                            {slugify(name || "producto")}.misitio.com
                          </p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {description
                              ? description.slice(0, 120)
                              : "Descripción del producto..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-border/40 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                      Publicación
                    </h3>
                    <div className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="size-3.5" />
                        <span>Creado ahora</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="size-3.5" />
                        <span>No publicado aún</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

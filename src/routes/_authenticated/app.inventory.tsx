import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Boxes, AlertTriangle, Plus, Search, Package, DollarSign,
  TrendingDown, TrendingUp, Clock, MoreHorizontal, ChevronRight,
  X, Edit3, Trash2, Archive, BarChart3, RefreshCw, ArrowUpDown,
  Warehouse,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: InventoryPage,
});

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  min_stock: number;
  price: number;
  cost: number | null;
  image_url: string | null;
  status: string;
  tags: string[] | null;
  updated_at: string;
  created_at: string;
  category: { name: string } | null;
  brand: { name: string } | null;
};

type Movement = {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
};

function sym(c: string) {
  return ({ USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$" }[c] || "$");
}

function stockStatus(stock: number, minStock: number): { label: string; color: string } {
  if (stock <= 0) return { label: "Sin stock", color: "bg-destructive/10 text-destructive" };
  if (stock <= minStock) return { label: "Stock bajo", color: "bg-warning/20 text-warning-foreground" };
  if (stock > minStock * 3) return { label: "Saludable", color: "bg-success/20 text-success" };
  return { label: "Normal", color: "bg-primary/10 text-primary" };
}

function stockPercent(stock: number, minStock: number, maxRef = 100): number {
  if (minStock === 0) return stock > 0 ? 100 : 0;
  const percent = Math.round((stock / (minStock * 2)) * 100);
  return Math.min(Math.max(percent, 0), maxRef);
}

function InventoryPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,stock,min_stock,price,cost,image_url,status,tags,updated_at,created_at,category:categories(name),brand:brands(name)")
        .eq("business_id", activeBusiness!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["product-movements", selectedProduct?.id],
    enabled: !!selectedProduct,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("id,type,quantity,reason,created_at,created_by")
        .eq("product_id", selectedProduct!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });

  const filtered = useMemo(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const name = p.name.toLowerCase();
        const sku = (p.sku ?? "").toLowerCase();
        const cat = (p.category?.name ?? "").toLowerCase();
        return name.includes(q) || sku.includes(q) || cat.includes(q);
      });
    }
    if (filter !== "all") {
      result = result.filter((p) => {
        switch (filter) {
          case "low-stock": return p.stock > 0 && p.stock <= p.min_stock;
          case "out-of-stock": return p.stock <= 0;
          case "active": return p.status === "active";
          case "inactive": return p.status !== "active";
          default: return true;
        }
      });
    }
    return result;
  }, [products, search, filter]);

  const stats = useMemo(() => {
    const total = products.length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const invValue = products.reduce((s, p) => s + (p.cost ?? p.price) * p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    return { total, totalUnits, invValue, lowStock, outOfStock };
  }, [products]);

  const currency = activeBusiness?.currency ?? "USD";
  const $ = sym(currency);

  const FILTERS = [
    { value: "all", label: "Todos" },
    { value: "low-stock", label: "Stock bajo" },
    { value: "out-of-stock", label: "Sin stock" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  if (isMobile) {
    return (
      <MobileInventory
        products={filtered}
        stats={stats}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        FILTERS={FILTERS}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        movements={movements}
        currency={currency}
        $={$}
        movementOpen={movementOpen}
        setMovementOpen={setMovementOpen}
        productsAll={products}
        qc={qc}
      />
    );
  }

  return (
    <div
      className="grid transition-[grid-template-columns] duration-200 ease-in-out"
      style={{
        gridTemplateColumns: selectedProduct ? "minmax(0, 1fr) 420px" : "minmax(0, 1fr) 0px",
      }}
    >
      <div className="min-w-0 overflow-hidden px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stats.total} producto{stats.total !== 1 ? "s" : ""} · {stats.totalUnits} unidades en stock
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="size-4" /> Movimiento</Button>
              </DialogTrigger>
              <MovementForm products={products} onDone={() => { setMovementOpen(false); qc.invalidateQueries({ queryKey: ["inventory-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); }} />
            </Dialog>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3">
          <StatCard icon={Package} label="Productos" value={stats.total} />
          <StatCard icon={Boxes} label="Unidades en stock" value={stats.totalUnits} />
          <StatCard icon={DollarSign} label="Valor inventario" value={`${revenue(currency, stats.invValue)}`} />
          <StatCard icon={TrendingDown} label="Stock bajo" value={stats.lowStock} warn />
          <StatCard icon={AlertTriangle} label="Sin stock" value={stats.outOfStock} critical />
        </div>

        {stats.outOfStock > 0 && (
          <Card className="mt-4 flex items-center gap-3 border-destructive/30 bg-destructive/5 p-3.5">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <p className="text-sm">
              <span className="font-semibold">{stats.outOfStock}</span> producto{stats.outOfStock !== 1 ? "s" : ""} agotado{stats.outOfStock !== 1 ? "s" : ""}.
              {stats.lowStock > 0 && <> También <span className="font-semibold">{stats.lowStock}</span> con stock bajo.</>}
            </p>
          </Card>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría..."
              className="w-full pl-9"
            />
          </div>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="mt-4 overflow-hidden">
          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/5 text-primary"><Boxes className="size-7" /></div>
              <h3 className="text-lg font-semibold">Inventario vacío</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Crea productos desde el catálogo para que aparezcan aquí con su stock.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Mínimo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Actualizado</th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No se encontraron productos para "{search}"
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const st = stockStatus(p.stock, p.min_stock);
                    const barPercent = stockPercent(p.stock, p.min_stock);
                    const barColor = st.label === "Sin stock" ? "bg-destructive" : st.label === "Stock bajo" ? "bg-warning" : "bg-success";
                    return (
                      <tr
                        key={p.id}
                        className={`cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0 ${
                          selectedProduct?.id === p.id ? "bg-muted/30" : ""
                        }`}
                        onClick={() => setSelectedProduct(p)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-border/50" />
                            ) : (
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/50">
                                <Package className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{p.name}</p>
                              {p.brand?.name && <p className="text-xs text-muted-foreground">{p.brand.name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.category?.name || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm tabular-nums font-semibold ${
                              p.stock <= 0 ? "text-destructive" : p.stock <= p.min_stock ? "text-warning-foreground" : ""
                            }`}>
                              {p.stock}
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(barPercent, p.stock > 0 ? 10 : 0)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.min_stock}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-sm text-muted-foreground">
                          {$}{(p.cost ?? p.price).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(p.updated_at), "dd MMM yyyy")}
                        </td>
                        <td className="w-12 px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedProduct(p)}
                          >
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="overflow-hidden border-l" style={{ overflow: selectedProduct ? undefined : "hidden" }}>
        {selectedProduct && (
          <ProductPanel
            product={selectedProduct}
            movements={movements}
            onClose={() => setSelectedProduct(null)}
            currency={currency}
            $={$}
            qc={qc}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, warn, critical }: { icon: any; label: string; value: string | number; warn?: boolean; critical?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3.5">
      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${
        critical ? "bg-destructive/10 text-destructive" :
        warn ? "bg-warning/20 text-warning-foreground" :
        "bg-primary/5 text-primary"
      }`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${critical ? "text-destructive" : warn ? "text-warning-foreground" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function revenue(currency: string, amount: number): string {
  const $ = sym(currency);
  return amount < 1000 ? `${$}${amount.toFixed(2)}` : `${$}${(amount / 1000).toFixed(1)}k`;
}

function ProductPanel({
  product, movements, onClose, currency, $, qc,
}: {
  product: Product;
  movements: Movement[];
  onClose: () => void;
  currency: string;
  $: string;
  qc: any;
}) {
  const st = stockStatus(product.stock, product.min_stock);
  const barPercent = stockPercent(product.stock, product.min_stock);
  const barColor = st.label === "Sin stock" ? "bg-destructive" : st.label === "Stock bajo" ? "bg-warning" : "bg-success";
  const invValue = (product.cost ?? product.price) * product.stock;

  return (
    <div className="sticky top-0 flex h-screen flex-col">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-border/50" />
          ) : (
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/50">
              <Package className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{product.name}</p>
            {product.sku && <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>}
          </div>
        </div>
        <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
          <span className="ml-auto text-lg tabular-nums font-bold">{$}{invValue.toFixed(2)}</span>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Stock: <strong className={product.stock <= 0 ? "text-destructive" : product.stock <= product.min_stock ? "text-warning-foreground" : ""}>{product.stock}</strong></span>
            <span>Mínimo: {product.min_stock}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(barPercent, product.stock > 0 ? 10 : 0)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Precio venta</p>
            <p className="text-lg font-bold tabular-nums">{$}{product.price.toFixed(2)}</p>
          </div>
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Costo</p>
            <p className="text-lg font-bold tabular-nums">{$}{(product.cost ?? 0).toFixed(2)}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalles</p>
          <div className="space-y-2 rounded-lg border p-3.5 text-sm">
            {product.category?.name && (
              <div className="flex justify-between"><span className="text-muted-foreground">Categoría</span><span>{product.category.name}</span></div>
            )}
            {product.brand?.name && (
              <div className="flex justify-between"><span className="text-muted-foreground">Marca</span><span>{product.brand.name}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span>{product.status === "active" ? "Activo" : "Inactivo"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor inventario</span><span className="tabular-nums font-semibold">{$}{invValue.toFixed(2)}</span></div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3" /> Movimientos recientes
          </div>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {movements.slice(0, 10).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      m.type === "in" ? "bg-success/20 text-success" :
                      m.type === "out" ? "bg-destructive/10 text-destructive" :
                      "bg-warning/20 text-warning-foreground"
                    }`}>
                      {m.type === "in" ? "IN" : m.type === "out" ? "OUT" : "AJ"}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{m.type === "in" ? "Entrada" : m.type === "out" ? "Salida" : "Ajuste"}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.reason || "Sin motivo"} · {format(new Date(m.created_at), "dd MMM")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm tabular-nums font-semibold ${
                    m.type === "in" ? "text-success" : m.type === "out" ? "text-destructive" : ""
                  }`}>
                    {m.type === "in" ? "+" : m.type === "out" ? "-" : "±"}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2"><Edit3 className="size-4" /> Ajustar</Button>
            </DialogTrigger>
            <MovementForm
              products={[product]}
              defaultProductId={product.id}
              onDone={() => { qc.invalidateQueries({ queryKey: ["inventory-products"] }); qc.invalidateQueries({ queryKey: ["product-movements"] }); }}
            />
          </Dialog>
          <Button variant="outline" className="flex-1 gap-2"><RefreshCw className="size-4" /> Transferir</Button>
        </div>
      </div>
    </div>
  );
}

function MovementForm({
  products, onDone, defaultProductId,
}: {
  products: Array<{ id: string; name: string; stock?: number }>;
  onDone: () => void;
  defaultProductId?: string;
}) {
  const { activeBusiness } = useBusiness();
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness || !productId) return;
    setBusy(true);
    try {
      const qty = parseInt(quantity, 10);
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error("Producto no encontrado");

      const { data: userData } = await supabase.auth.getUser();
      const { error: mvErr } = await supabase.from("inventory_movements").insert({
        business_id: activeBusiness.id,
        product_id: productId,
        type,
        quantity: qty,
        reason: reason || null,
        created_by: userData.user?.id,
      });
      if (mvErr) throw mvErr;

      const newStock =
        type === "in" ? (product.stock ?? 0) + qty :
        type === "out" ? Math.max(0, (product.stock ?? 0) - qty) :
        qty;
      const { error: pErr } = await supabase.from("products").update({ stock: newStock }).eq("business_id", activeBusiness.id).eq("id", productId);
      if (pErr) throw pErr;

      toast.success("Movimiento registrado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Producto</Label>
          <Select value={productId} onValueChange={setProductId} disabled={!!defaultProductId}>
            <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.stock !== undefined ? ` (stock: ${p.stock})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "in")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrada</SelectItem>
                <SelectItem value="out">Salida</SelectItem>
                <SelectItem value="adjustment">Ajuste (nuevo total)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mv-qty">Cantidad</Label>
            <Input id="mv-qty" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mv-reason">Motivo</Label>
          <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Compra, venta, ajuste..." />
        </div>
        <DialogFooter><Button type="submit" disabled={busy || !productId}>Registrar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function MobileInventory({
  products, stats, search, setSearch, filter, setFilter, FILTERS,
  selectedProduct, setSelectedProduct, movements, currency, $,
  movementOpen, setMovementOpen, productsAll, qc,
}: {
  products: Product[];
  stats: { total: number; totalUnits: number; invValue: number; lowStock: number; outOfStock: number };
  search: string; setSearch: (v: string) => void;
  filter: string; setFilter: (v: string) => void;
  FILTERS: { value: string; label: string }[];
  selectedProduct: Product | null; setSelectedProduct: (v: Product | null) => void;
  movements: Movement[]; currency: string; $: string;
  movementOpen: boolean; setMovementOpen: (v: boolean) => void;
  productsAll: Product[]; qc: any;
}) {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventario</h1>
        <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="size-4" /> Movimiento</Button>
          </DialogTrigger>
          <MovementForm products={productsAll} onDone={() => { setMovementOpen(false); qc.invalidateQueries({ queryKey: ["inventory-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); }} />
        </Dialog>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full pl-9" />
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Boxes className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sin productos en inventario</p>
          </div>
        ) : (
          <div className="divide-y">
            {products.map((p) => {
              const st = stockStatus(p.stock, p.min_stock);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50" onClick={() => setSelectedProduct(p)}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border/50" />
                  ) : (
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/50"><Package className="size-4" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku || p.category?.name || ""}</p>
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm tabular-nums font-semibold ${p.stock <= 0 ? "text-destructive" : ""}`}>{p.stock}</p>
                    <p className="text-xs text-muted-foreground">mín: {p.min_stock}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedProduct && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 transition-opacity" onClick={() => setSelectedProduct(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out translate-x-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt="" className="size-9 rounded-lg object-cover ring-1 ring-border/50" />
                ) : (
                  <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground/50"><Package className="size-4" /></div>
                )}
                <p className="text-sm font-medium">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStatus(selectedProduct.stock, selectedProduct.min_stock).color}`}>
                  {stockStatus(selectedProduct.stock, selectedProduct.min_stock).label}
                </span>
                <span className="ml-auto text-lg tabular-nums font-bold">{$}{(selectedProduct.cost ?? selectedProduct.price).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Stock</p><p className="text-xl font-bold">{selectedProduct.stock}</p></div>
                <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Mínimo</p><p className="text-xl font-bold">{selectedProduct.min_stock}</p></div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Movimientos</p>
                {movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos</p>
                ) : (
                  movements.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between border-b py-2 text-sm">
                      <span className="capitalize">{m.type} · {m.reason || "—"}</span>
                      <span className={`tabular-nums font-semibold ${m.type === "in" ? "text-success" : m.type === "out" ? "text-destructive" : ""}`}>
                        {m.type === "in" ? "+" : m.type === "out" ? "-" : "±"}{m.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

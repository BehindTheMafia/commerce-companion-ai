import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Boxes, AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("id,name,sku,stock,min_stock")
        .eq("business_id", activeBusiness!.id).order("stock", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lowStock = products.filter((p) => p.stock <= p.min_stock);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Inventario"
        description="Kardex y control de stock por producto."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> Movimiento</Button></DialogTrigger>
            <MovementForm products={products} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["inventory-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); }} />
          </Dialog>
        }
      />

      {lowStock.length > 0 && (
        <Card className="mt-6 flex items-center gap-3 border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="size-5 text-warning-foreground" />
          <div className="text-sm">
            <strong>{lowStock.length}</strong> producto(s) por debajo del stock mínimo.
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Boxes className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Aún no tienes productos con inventario.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.min_stock}</TableCell>
                  <TableCell>
                    {p.stock <= p.min_stock ? <Badge variant="destructive">Bajo</Badge> : <Badge variant="secondary">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function MovementForm({
  products, onDone,
}: {
  products: Array<{ id: string; name: string; stock: number }>;
  onDone: () => void;
}) {
  const { activeBusiness } = useBusiness();
  const [productId, setProductId] = useState("");
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
        type === "in" ? product.stock + qty :
        type === "out" ? product.stock - qty :
        qty;
      const { error: pErr } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
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
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (stock: {p.stock})</SelectItem>)}
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

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/orders")({
  component: OrdersPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-foreground",
  paid: "bg-primary/10 text-primary",
  preparing: "bg-warning/20 text-warning-foreground",
  shipped: "bg-accent text-accent-foreground",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function OrdersPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,total,currency,created_at,customer:customers(full_name)")
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Pedidos"
        description="Gestiona el ciclo completo desde pendiente hasta entregado."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> Nuevo pedido</Button></DialogTrigger>
            <NewOrderForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); }} />
          </Dialog>
        }
      />

      <Card className="mt-6 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingCart className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Sin pedidos todavía.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" /> Crear el primero</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell>{(o.customer as { full_name?: string } | null)?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(o.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    ${Number(o.total).toFixed(2)}
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

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const { activeBusiness } = useBusiness();
  const [customerId, setCustomerId] = useState<string>("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-select", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,full_name").eq("business_id", activeBusiness!.id);
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const num = "ORD-" + Date.now().toString().slice(-8);
      const { error } = await supabase.from("orders").insert({
        business_id: activeBusiness.id,
        customer_id: customerId || null,
        order_number: num,
        status: status as "pending",
        subtotal: Number(total),
        total: Number(total),
        currency: activeBusiness.currency,
      });
      if (error) throw error;
      toast.success("Pedido creado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo pedido</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Sin cliente asignado" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="o-total">Total</Label>
            <Input id="o-total" type="number" step="0.01" min="0" value={total} onChange={(e) => setTotal(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending","paid","preparing","shipped","delivered","cancelled","refunded"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button type="submit" disabled={busy}>Crear pedido</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

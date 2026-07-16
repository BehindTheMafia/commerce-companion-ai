import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Check, X, Truck, PackageCheck, ChevronRight, Package, Phone, MapPin, User, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/orders")({
  component: OrdersPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-foreground",
  paid: "bg-primary/10 text-primary",
  preparing: "bg-warning/20 text-warning-foreground",
  shipped: "bg-accent text-accent-foreground",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function sym(c: string) {
  return ({ USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$" }[c] || "$");
}

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  notes: string | null;
  customer: { full_name?: string } | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

const STATUS_ACTIONS: Record<string, { label: string; nextStatus: string; icon: typeof Check; variant?: "default" | "destructive" | "outline" }[]> = {
  pending: [
    { label: "Aceptar", nextStatus: "preparing", icon: Check },
    { label: "Rechazar", nextStatus: "cancelled", icon: X, variant: "destructive" },
  ],
  preparing: [
    { label: "Marcar enviado", nextStatus: "shipped", icon: Truck },
  ],
  shipped: [
    { label: "Marcar entregado", nextStatus: "delivered", icon: PackageCheck },
  ],
};

function getCustomerName(o: Order): string {
  return o.customer_name || (o.customer as { full_name?: string } | null)?.full_name || "—";
}

function OrdersPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,total,currency,created_at,customer_name,customer_phone,customer_address,notes,customer:customers(full_name)")
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["order-items", selectedOrder?.id],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id,product_name,quantity,unit_price,total")
        .eq("order_id", selectedOrder!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
  });

  async function updateStatus(orderId: string, newStatus: string) {
    setActionBusy(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled" | "refunded" })
        .eq("id", orderId);
      if (error) throw error;
      toast.success(`Pedido ${STATUS_LABELS[newStatus]?.toLowerCase() ?? newStatus}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setActionBusy(null);
    }
  }

  const currency = activeBusiness?.currency ?? "USD";
  const $ = sym(currency);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Pedidos"
        description="Revisa, acepta y da seguimiento a los pedidos de tus clientes."
      />

      <Card className="mt-6 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingCart className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Sin pedidos todavía.</p>
            <p className="text-xs text-muted-foreground/60">Los pedidos de WhatsApp aparecerán aquí automáticamente.</p>
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
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const actions = STATUS_ACTIONS[o.status] ?? [];
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell>{getCustomerName(o)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {o.currency === "USD" ? "$" : o.currency} {Number(o.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {actions.map((action) => (
                          <Button
                            key={action.nextStatus}
                            size="sm"
                            variant={action.variant ?? "outline"}
                            className="h-7 text-xs gap-1"
                            disabled={actionBusy === o.id}
                            onClick={() => updateStatus(o.id, action.nextStatus)}
                          >
                            <action.icon className="size-3" />
                            {action.label}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedOrder && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => { setSelectedOrder(null); }}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="size-4" />
                {selectedOrder.order_number}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[selectedOrder.status] ?? ""}`}>
                  {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                </span>
                <span className="text-sm tabular-nums font-medium ml-auto">
                  {selectedOrder.currency === "USD" ? "$" : selectedOrder.currency} {Number(selectedOrder.total).toFixed(2)}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <Package className="size-3" />
                  Productos
                </div>
                <div className="space-y-2">
                  {orderItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : (
                    orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums font-medium">
                          ${Number(item.total).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  <User className="size-3" />
                  Cliente
                </div>
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground" />
                    <span>{getCustomerName(selectedOrder)}</span>
                  </div>
                  {selectedOrder.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span>{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                  {selectedOrder.customer_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      <span>{selectedOrder.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    <FileText className="size-3" />
                    Notas
                  </div>
                  <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Fecha del pedido
                </div>
                <p className="text-sm">
                  {format(new Date(selectedOrder.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
            </div>

            <div className="border-t p-4">
              <div className="flex gap-2">
                {(STATUS_ACTIONS[selectedOrder.status] ?? []).map((action) => (
                  <Button
                    key={action.nextStatus}
                    className="flex-1 gap-2"
                    variant={action.variant ?? "default"}
                    disabled={actionBusy === selectedOrder.id}
                    onClick={() => {
                      updateStatus(selectedOrder.id, action.nextStatus);
                      if (action.nextStatus === "cancelled") setSelectedOrder(null);
                    }}
                  >
                    <action.icon className="size-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

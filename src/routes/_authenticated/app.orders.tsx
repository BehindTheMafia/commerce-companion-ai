import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShoppingCart, Check, X, Truck, PackageCheck, ChevronRight,
  Package, Phone, MapPin, User, FileText, Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const name = getCustomerName(o).toLowerCase();
      const phone = (o.customer_phone ?? "").toLowerCase();
      const orderNum = o.order_number.toLowerCase();
      return name.includes(q) || phone.includes(q) || orderNum.includes(q);
    });
  }, [orders, search]);

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

  if (isMobile) {
    return (
      <MobileOrders
        orders={orders}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        orderItems={orderItems}
        actionBusy={actionBusy}
        updateStatus={updateStatus}
        STATUS_ACTIONS={STATUS_ACTIONS}
        STATUS_COLORS={STATUS_COLORS}
        STATUS_LABELS={STATUS_LABELS}
        getCustomerName={getCustomerName}
        $={$}
      />
    );
  }

  return (
    <div
      className="grid transition-[grid-template-columns] duration-200 ease-in-out"
      style={{
        gridTemplateColumns: selectedOrder ? "minmax(0, 1fr) 420px" : "minmax(0, 1fr) 0px",
      }}
    >
      <div className="min-w-0 overflow-hidden px-6 py-6">
        <PageHeader
          title="Pedidos"
          description="Revisa, acepta y da seguimiento a los pedidos de tus clientes."
        />

        {orders.length > 0 && (
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, teléfono o nº de pedido..."
              className="w-full pl-9"
            />
          </div>
        )}

        <Card className="mt-4 overflow-hidden">
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
                  <TableHead className="text-center">Teléfono</TableHead>
                  <TableHead className="text-center">Fecha</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No se encontraron pedidos para "{search}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const actions = STATUS_ACTIONS[o.status] ?? [];
                    const firstAction = actions[0];
                    return (
                      <TableRow
                        key={o.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedOrder?.id === o.id ? "bg-muted/30" : ""
                        }`}
                        onClick={() => setSelectedOrder(o)}
                      >
                        <TableCell className="py-4 font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="py-4 font-medium">{getCustomerName(o)}</TableCell>
                        <TableCell className="py-4 text-center text-xs text-muted-foreground">
                          {o.customer_phone || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-4 text-center text-xs text-muted-foreground">
                          {format(new Date(o.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-right tabular-nums font-medium">
                          {$}{Number(o.total).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {firstAction && (
                              <Button
                                size="sm"
                                variant={firstAction.variant ?? "outline"}
                                className="h-8 gap-1 px-2.5 text-xs"
                                disabled={actionBusy === o.id}
                                onClick={() => updateStatus(o.id, firstAction.nextStatus)}
                              >
                                <firstAction.icon className="size-3.5" />
                                {firstAction.label}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setSelectedOrder(o)}
                            >
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="overflow-hidden border-l" style={{ overflow: selectedOrder ? undefined : "hidden" }}>
        {selectedOrder && (
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2.5 text-sm font-medium">
                <Package className="size-4 text-muted-foreground" />
                {selectedOrder.order_number}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedOrder.status] ?? ""}`}>
                  {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                </span>
                <span className="ml-auto text-lg tabular-nums font-bold">
                  {$}{Number(selectedOrder.total).toFixed(2)}
                </span>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="size-3" />
                  Productos
                </div>
                <div className="space-y-2">
                  {orderItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : (
                    orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3.5">
                        <div>
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.quantity} x {$}{Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums font-semibold">
                          {$}{Number(item.total).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="size-3" />
                  Cliente
                </div>
                <div className="space-y-3 rounded-lg border p-3.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <User className="size-4 shrink-0 text-muted-foreground" />
                    <span>{getCustomerName(selectedOrder)}</span>
                  </div>
                  {selectedOrder.customer_phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="size-4 shrink-0 text-muted-foreground" />
                      <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                        {selectedOrder.customer_phone}
                      </a>
                    </div>
                  )}
                  {selectedOrder.customer_address && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <span>{selectedOrder.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="size-3" />
                    Notas
                  </div>
                  <p className="leading-relaxed rounded-lg border p-3.5 text-sm text-muted-foreground">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
        )}
      </div>
    </div>
  );
}

function MobileOrders({
  orders, filtered, search, setSearch,
  selectedOrder, setSelectedOrder, orderItems,
  actionBusy, updateStatus,
  STATUS_ACTIONS, STATUS_COLORS, STATUS_LABELS, getCustomerName, $,
}: {
  orders: Order[];
  filtered: Order[];
  search: string;
  setSearch: (v: string) => void;
  selectedOrder: Order | null;
  setSelectedOrder: (v: Order | null) => void;
  orderItems: OrderItem[];
  actionBusy: string | null;
  updateStatus: (id: string, s: string) => void;
  STATUS_ACTIONS: Record<string, { label: string; nextStatus: string; icon: any; variant?: "default" | "destructive" | "outline" }[]>;
  STATUS_COLORS: Record<string, string>;
  STATUS_LABELS: Record<string, string>;
  getCustomerName: (o: Order) => string;
  $: string;
}) {
  return (
    <div className="px-4 py-6">
      <PageHeader
        title="Pedidos"
        description="Revisa, acepta y da seguimiento."
      />
      {orders.length > 0 && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedidos..."
            className="w-full pl-9"
          />
        </div>
      )}
      <Card className="mt-4 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingCart className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Sin pedidos todavía.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No se encontraron pedidos para "{search}"
              </p>
            ) : (
              filtered.map((o) => {
                const actions = STATUS_ACTIONS[o.status] ?? [];
                const firstAction = actions[0];
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{o.order_number}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{getCustomerName(o)}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{o.customer_phone || "—"}</span>
                        <span>{format(new Date(o.created_at), "dd MMM")}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums font-semibold">{$}{Number(o.total).toFixed(2)}</p>
                      {firstAction && (
                        <Button
                          size="sm"
                          variant={firstAction.variant ?? "outline"}
                          className="mt-1 h-7 gap-1 px-2 text-[10px]"
                          disabled={actionBusy === o.id}
                          onClick={(e) => { e.stopPropagation(); updateStatus(o.id, firstAction.nextStatus); }}
                        >
                          <firstAction.icon className="size-3" />
                          {firstAction.label}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <>
        <div
          className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
            selectedOrder ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setSelectedOrder(null)}
        />
        <div
          className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            selectedOrder ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedOrder && (
            <>
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <Package className="size-4 text-muted-foreground" />
                  {selectedOrder.order_number}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedOrder.status] ?? ""}`}>
                    {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </span>
                  <span className="ml-auto text-lg tabular-nums font-bold">
                    {$}{Number(selectedOrder.total).toFixed(2)}
                  </span>
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Package className="size-3" /> Productos
                  </div>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3.5">
                        <div>
                          <p className="text-sm font-medium">{item.product_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.quantity} x {$}{Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums font-semibold">{$}{Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="size-3" /> Cliente
                  </div>
                  <div className="space-y-3 rounded-lg border p-3.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <User className="size-4 shrink-0 text-muted-foreground" />
                      <span>{getCustomerName(selectedOrder)}</span>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="size-4 shrink-0 text-muted-foreground" />
                        <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">{selectedOrder.customer_phone}</a>
                      </div>
                    )}
                    {selectedOrder.customer_address && (
                      <div className="flex items-center gap-2.5">
                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                        <span>{selectedOrder.customer_address}</span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileText className="size-3" /> Notas
                    </div>
                    <p className="leading-relaxed rounded-lg border p-3.5 text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha del pedido</div>
                  <p className="text-sm">{format(new Date(selectedOrder.created_at), "dd MMM yyyy, HH:mm")}</p>
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
                      onClick={() => { updateStatus(selectedOrder.id, action.nextStatus); if (action.nextStatus === "cancelled") setSelectedOrder(null); }}
                    >
                      <action.icon className="size-4" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, Search, Phone, Mail, ShoppingCart, DollarSign,
  TrendingUp, UserPlus, ChevronRight, X, Package, Calendar,
  MapPin, Tag, FileText, Clock, MessageSquare, PhoneCall,
  MoreHorizontal, Trash2, Edit3, CreditCard, ArrowUpRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/app/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  business_id: string;
};

type CustomerStats = {
  customer_id: string;
  order_count: number;
  total_spent: number;
  avg_ticket: number;
  last_purchase: string | null;
};

type CustomerWithStats = Customer & {
  stats?: CustomerStats;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", preparing: "Preparando",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", refunded: "Reembolsado",
};

const TAG_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

function tagColor(i: number) { return TAG_COLORS[i % TAG_COLORS.length]; }

function sym(c: string) {
  return ({ USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$" }[c] || "$");
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function isNewCustomer(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isReturning(stats?: CustomerStats): boolean {
  return (stats?.order_count ?? 0) >= 2;
}

function isInactive(stats?: CustomerStats): boolean {
  if (!stats?.last_purchase) return false;
  const days = (Date.now() - new Date(stats.last_purchase).getTime()) / 86400000;
  return days > 90;
}

function isVip(stats?: CustomerStats): boolean {
  return (stats?.total_spent ?? 0) >= 300;
}

function computeSegments(c: CustomerWithStats): string[] {
  const segments: string[] = [];
  if (isNewCustomer(c.created_at)) segments.push("Nuevo");
  if (isReturning(c.stats)) segments.push("Recurrente");
  if (isVip(c.stats)) segments.push("VIP");
  if (isInactive(c.stats)) segments.push("Inactivo");
  if (!c.stats || c.stats.order_count === 0) segments.push("Sin compras");
  return segments;
}

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "vip", label: "VIP" },
  { value: "returning", label: "Recurrentes" },
  { value: "new", label: "Nuevos" },
  { value: "inactive", label: "Inactivos" },
  { value: "no-orders", label: "Sin compras" },
];

function CustomersPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers").select("*")
        .eq("business_id", activeBusiness!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: statsMap = new Map<string, CustomerStats>() } = useQuery({
    queryKey: ["customer-stats", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_id, total")
        .eq("business_id", activeBusiness!.id)
        .not("customer_id", "is", null);
      if (error) throw error;
      const agg = new Map<string, { count: number; total: number; dates: string[] }>();
      for (const o of data ?? []) {
        const cid = o.customer_id as string;
        if (!agg.has(cid)) agg.set(cid, { count: 0, total: 0, dates: [] });
        const a = agg.get(cid)!;
        a.count++;
        a.total += Number(o.total);
      }
      const map = new Map<string, CustomerStats>();
      const { data: ordersWithDate } = await supabase
        .from("orders")
        .select("customer_id, created_at")
        .eq("business_id", activeBusiness!.id)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false });
      if (ordersWithDate) {
        const lastPurchase = new Map<string, string>();
        for (const o of ordersWithDate) {
          const cid = o.customer_id as string;
          if (!lastPurchase.has(cid)) lastPurchase.set(cid, o.created_at);
        }
        for (const [cid, a] of agg) {
          map.set(cid, {
            customer_id: cid,
            order_count: a.count,
            total_spent: a.total,
            avg_ticket: a.count > 0 ? Math.round(a.total / a.count * 100) / 100 : 0,
            last_purchase: lastPurchase.get(cid) ?? null,
          });
        }
      }
      return map;
    },
    select: (map) => map,
  });

  const enriched: CustomerWithStats[] = useMemo(() => {
    return customers.map((c) => ({
      ...c,
      stats: statsMap.get(c.id),
    }));
  }, [customers, statsMap]);

  const filtered = useMemo(() => {
    let result = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.full_name.toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const notes = (c.notes ?? "").toLowerCase();
        const tags = (c.tags ?? []).join(" ").toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || notes.includes(q) || tags.includes(q);
      });
    }
    if (filter !== "all") {
      result = result.filter((c) => {
        const segs = computeSegments(c);
        switch (filter) {
          case "vip": return segs.includes("VIP");
          case "returning": return segs.includes("Recurrente");
          case "new": return segs.includes("Nuevo");
          case "inactive": return segs.includes("Inactivo");
          case "no-orders": return segs.includes("Sin compras");
          default: return true;
        }
      });
    }
    return result;
  }, [enriched, search, filter]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const newMonth = enriched.filter((c) => isNewCustomer(c.created_at)).length;
    const returning = enriched.filter((c) => isReturning(c.stats)).length;
    const revenue = enriched.reduce((s, c) => s + (c.stats?.total_spent ?? 0), 0);
    const withOrders = enriched.filter((c) => (c.stats?.order_count ?? 0) > 0).length;
    const avgTicket = withOrders > 0
      ? Math.round((revenue / withOrders) * 100) / 100
      : 0;
    const top = [...enriched].sort((a, b) => (b.stats?.total_spent ?? 0) - (a.stats?.total_spent ?? 0))[0];
    return { total, newMonth, returning, revenue, avgTicket, top };
  }, [enriched]);

  const currency = activeBusiness?.currency ?? "USD";
  const $ = sym(currency);

  const { data: customerOrders = [] } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.id],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, currency, created_at")
        .eq("customer_id", selectedCustomer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const updateTags = async (customerId: string, tags: string[]) => {
    const { error } = await supabase.from("customers").update({ tags }).eq("id", customerId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["customers"] });
    toast.success("Tags actualizados");
  };

  if (isMobile) {
    return (
      <MobileCustomers
        customers={enriched}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        FILTERS={FILTERS}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        stats={stats}
        customerOrders={customerOrders}
        currency={currency}
        $={$}
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        computeSegments={computeSegments}
        initials={initials}
        avatarColor={avatarColor}
        tagColor={tagColor}
      />
    );
  }

  return (
    <div
      className="grid transition-[grid-template-columns] duration-200 ease-in-out"
      style={{
        gridTemplateColumns: selectedCustomer ? "minmax(0, 1fr) 420px" : "minmax(0, 1fr) 0px",
      }}
    >
      <div className="min-w-0 overflow-hidden px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stats.total} cliente{stats.total !== 1 ? "s" : ""} registrado{stats.total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewCustomerDialog open={createOpen} onOpenChange={setCreateOpen}>
              <Button className="gap-2"><Plus className="size-4" /> Nuevo cliente</Button>
            </NewCustomerDialog>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-3">
          <StatCard icon={Users} label="Total" value={stats.total} />
          <StatCard icon={UserPlus} label="Nuevos este mes" value={stats.newMonth} />
          <StatCard icon={TrendingUp} label="Recurrentes" value={stats.returning} />
          <StatCard icon={DollarSign} label="Ingreso total" value={`${revenue(currency, stats.revenue)}`} />
          <StatCard icon={ShoppingCart} label="Ticket promedio" value={`${$}${stats.avgTicket.toFixed(2)}`} />
          <StatCard icon={Users} label="Top cliente" value={stats.top?.full_name ?? "—"} truncate />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, email..."
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
          {customers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/5 text-primary">
                <Users className="size-7" />
              </div>
              <h3 className="text-lg font-semibold">Aún no tienes clientes</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Los clientes aparecerán aquí cuando realicen su primer pedido o puedes agregarlos manualmente.
              </p>
              <NewCustomerDialog open={false} onOpenChange={() => {}}>
                <Button className="mt-2 gap-2"><Plus className="size-4" /> Agregar cliente</Button>
              </NewCustomerDialog>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-center">Contacto</th>
                  <th className="px-4 py-3 text-center">Pedidos</th>
                  <th className="px-4 py-3 text-right">Total gastado</th>
                  <th className="px-4 py-3 text-right">Ticket promedio</th>
                  <th className="px-4 py-3 text-center">Última compra</th>
                  <th className="px-4 py-3 text-center">Segmento</th>
                  <th className="px-4 py-3 text-center">Tags</th>
                  <th className="w-12 px-4 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      No se encontraron clientes para "{search}"
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const segs = computeSegments(c);
                    return (
                      <tr
                        key={c.id}
                        className={`cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-0 ${
                          selectedCustomer?.id === c.id ? "bg-muted/30" : ""
                        }`}
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(c.full_name)}`}>
                              {initials(c.full_name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.full_name}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="size-3" />
                              {c.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums">
                          <span className="text-sm font-medium">{c.stats?.order_count ?? 0}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          <span className="text-sm font-medium">{$}{(c.stats?.total_spent ?? 0).toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          <span className="text-sm text-muted-foreground">
                            {$}{(c.stats?.avg_ticket ?? 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {c.stats?.last_purchase ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(c.stats.last_purchase), "dd MMM")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-wrap gap-1">
                            {segs.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  s === "VIP" ? "bg-amber-100 text-amber-700" :
                                  s === "Nuevo" ? "bg-emerald-100 text-emerald-700" :
                                  s === "Recurrente" ? "bg-blue-100 text-blue-700" :
                                  s === "Inactivo" ? "bg-muted text-muted-foreground" :
                                  "bg-muted text-muted-foreground"
                                }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {(c.tags ?? []).slice(0, 2).map((t, i) => (
                              <span key={t} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${tagColor(i)}`}>
                                {t}
                              </span>
                            ))}
                            {(c.tags ?? []).length > 2 && (
                              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                +{c.tags!.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="w-12 px-4 py-3.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedCustomer(c)}
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

      <div className="overflow-hidden border-l" style={{ overflow: selectedCustomer ? undefined : "hidden" }}>
        {selectedCustomer && (
          <CustomerPanel
            customer={selectedCustomer}
            orders={customerOrders}
            onClose={() => setSelectedCustomer(null)}
            currency={currency}
            $={$}
            onUpdateTags={updateTags}
            qc={qc}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, truncate }: { icon: any; label: string; value: string | number; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${truncate ? "truncate" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function revenue(currency: string, amount: number): string {
  const $ = sym(currency);
  return `${amount < 1000 ? `${$}${amount.toFixed(2)}` : `${$}${(amount / 1000).toFixed(1)}k`}`;
}

function CustomerPanel({
  customer, orders, onClose, currency, $, onUpdateTags, qc,
}: {
  customer: CustomerWithStats;
  orders: Order[];
  onClose: () => void;
  currency: string;
  $: string;
  onUpdateTags: (id: string, tags: string[]) => Promise<void>;
  qc: any;
}) {
  const [newTag, setNewTag] = useState("");
  const [editNote, setEditNote] = useState(customer.notes ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const segs = computeSegments(customer);

  async function saveNote() {
    setSavingNote(true);
    const { error } = await supabase.from("customers").update({ notes: editNote || null }).eq("id", customer.id);
    if (error) toast.error(error.message);
    else toast.success("Nota guardada");
    setSavingNote(false);
  }

  async function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    const current = customer.tags ?? [];
    if (current.includes(tag)) { setNewTag(""); return; }
    await onUpdateTags(customer.id, [...current, tag]);
    setNewTag("");
  }

  async function removeTag(tag: string) {
    const current = customer.tags ?? [];
    await onUpdateTags(customer.id, current.filter((t) => t !== tag));
  }

  return (
    <div className="sticky top-0 flex h-screen flex-col">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`grid size-9 place-items-center rounded-full text-xs font-semibold ${avatarColor(customer.full_name)}`}>
            {initials(customer.full_name)}
          </div>
          <div>
            <p className="text-sm font-medium">{customer.full_name}</p>
            <p className="text-xs text-muted-foreground">Cliente desde {format(new Date(customer.created_at), "MMM yyyy")}</p>
          </div>
        </div>
        <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {segs.map((s) => (
            <span key={s} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${
              s === "VIP" ? "bg-amber-100 text-amber-700" :
              s === "Nuevo" ? "bg-emerald-100 text-emerald-700" :
              s === "Recurrente" ? "bg-blue-100 text-blue-700" :
              s === "Inactivo" ? "bg-muted text-muted-foreground" :
              "bg-muted text-muted-foreground"
            }`}>{s}</span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="text-xl font-bold tabular-nums">{customer.stats?.order_count ?? 0}</p>
          </div>
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Total gastado</p>
            <p className="text-xl font-bold tabular-nums">{$}{(customer.stats?.total_spent ?? 0).toFixed(2)}</p>
          </div>
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Ticket promedio</p>
            <p className="text-lg font-semibold tabular-nums">{$}{(customer.stats?.avg_ticket ?? 0).toFixed(2)}</p>
          </div>
          <div className="space-y-0.5 rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Última compra</p>
            <p className="text-sm font-semibold">
              {customer.stats?.last_purchase
                ? format(new Date(customer.stats.last_purchase), "dd MMM")
                : "—"}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Phone className="size-3" /> Contacto
          </div>
          <div className="space-y-2.5 rounded-lg border p-3.5 text-sm">
            {customer.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                <a
                  href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-7 place-items-center rounded-md bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                >
                  <MessageSquare className="size-3.5" />
                </a>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Tag className="size-3" /> Tags
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(customer.tags ?? []).map((t, i) => (
                <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tagColor(i)}`}>
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-foreground/60">×</button>
                </span>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Agregar tag..."
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0">+</Button>
            </form>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3" /> Notas
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={saveNote} disabled={savingNote}>
              Guardar
            </Button>
          </div>
          <Textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Agregar nota interna..."
            rows={3}
            className="text-sm"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="size-3" /> Historial de pedidos ({orders.length})
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {orders.slice(0, 10).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{o.order_number}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(o.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums font-semibold">
                    {$}{Number(o.total).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a href={`tel:${customer.phone}`}><PhoneCall className="size-4" /> Llamar</a>
          </Button>
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a
              href={`https://wa.me/${(customer.phone ?? "").replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="size-4" /> WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MobileCustomers({
  customers, filtered, search, setSearch, filter, setFilter, FILTERS,
  selectedCustomer, setSelectedCustomer, stats, customerOrders, currency, $,
  createOpen, setCreateOpen, computeSegments, initials, avatarColor, tagColor,
}: {
  customers: CustomerWithStats[];
  filtered: CustomerWithStats[];
  search: string;
  setSearch: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  FILTERS: { value: string; label: string }[];
  selectedCustomer: CustomerWithStats | null;
  setSelectedCustomer: (v: CustomerWithStats | null) => void;
  stats: any;
  customerOrders: Order[];
  currency: string;
  $: string;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  computeSegments: (c: CustomerWithStats) => string[];
  initials: (n: string) => string;
  avatarColor: (n: string) => string;
  tagColor: (i: number) => string;
}) {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Clientes</h1>
        <NewCustomerDialog open={false} onOpenChange={() => {}}>
          <Button size="sm" className="gap-2"><Plus className="size-4" /> Nuevo</Button>
        </NewCustomerDialog>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9" />
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sin clientes todavía</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No se encontraron clientes</p>
            ) : (
              filtered.map((c) => {
                const segs = computeSegments(c);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <div className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarColor(c.full_name)}`}>
                      {initials(c.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || c.email || "—"}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {segs.slice(0, 2).map((s) => (
                          <span key={s} className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                            s === "VIP" ? "bg-amber-100 text-amber-700" :
                            s === "Nuevo" ? "bg-emerald-100 text-emerald-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums font-semibold">{$}{(c.stats?.total_spent ?? 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{c.stats?.order_count ?? 0} pedidos</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {selectedCustomer && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out translate-x-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`grid size-9 place-items-center rounded-full text-xs font-semibold ${avatarColor(selectedCustomer.full_name)}`}>
                  {initials(selectedCustomer.full_name)}
                </div>
                <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex flex-wrap gap-1.5">
                {computeSegments(selectedCustomer).map((s) => (
                  <span key={s} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    s === "VIP" ? "bg-amber-100 text-amber-700" :
                    s === "Nuevo" ? "bg-emerald-100 text-emerald-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{s}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Pedidos</p><p className="text-xl font-bold tabular-nums">{selectedCustomer.stats?.order_count ?? 0}</p></div>
                <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold tabular-nums">{$}{(selectedCustomer.stats?.total_spent ?? 0).toFixed(2)}</p></div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto</p>
                <div className="space-y-2 rounded-lg border p-3.5 text-sm">
                  {selectedCustomer.phone && <p>📞 {selectedCustomer.phone}</p>}
                  {selectedCustomer.email && <p>✉️ {selectedCustomer.email}</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NewCustomerDialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("customers").insert({
        business_id: activeBusiness.id,
        full_name: fullName, email: email || null, phone: phone || null, notes: notes || null,
      });
      if (error) throw error;
      toast.success("Cliente agregado");
      setFullName(""); setEmail(""); setPhone(""); setNotes("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5"><Label>Nombre completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <DialogFooter><Button type="submit" disabled={busy}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

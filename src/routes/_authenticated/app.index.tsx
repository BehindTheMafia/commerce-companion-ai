import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bot,
  CalendarDays,
  DollarSign,
  ExternalLink,
  Inbox,
  MessageSquare,
  Package,
  Plus,
  Receipt,
  Settings2,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
  Percent,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import type { LucideIcon } from "lucide-react";

type RecentOrder = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string | null;
  customer_name: string | null;
};

type StatusDistribution = { status: string; value: number };

type ChartPoint = { date: string; revenue: number; orders: number };

type DashboardStats = {
  products: number;
  customers: number;
  orders: number;
  revenue: number;
  todayRevenue: number;
  todayOrders: number;
  conversionRate: number;
  avgOrder: number;
  revenueChange: number;
  ordersChange: number;
  recentOrders: RecentOrder[];
  chartData: ChartPoint[];
  statusDistribution: StatusDistribution[];
};

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { activeBusiness } = useBusiness();
  const businessId = activeBusiness?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const bid = businessId!;
      const [products, customers, orders, recentOrders] = await Promise.all([
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bid),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bid),
        supabase
          .from("orders")
          .select("total,status,created_at")
          .eq("business_id", bid)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id,total,status,created_at,customer_name")
          .eq("business_id", bid)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (products.error) throw products.error;
      if (customers.error) throw customers.error;
      if (orders.error) throw orders.error;
      if (recentOrders.error) throw recentOrders.error;

      const validOrders = (orders.data ?? []).filter(
        (o) => o.status !== "cancelled" && o.status !== "refunded",
      );
      const revenue = validOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = validOrders.filter((o) => o.created_at?.startsWith(today));
      const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);

      const cancelled = (orders.data ?? []).filter((o) => o.status === "cancelled").length;
      const total = (orders.data ?? []).length;
      const conversionRate = total > 0 ? ((total - cancelled) / total) * 100 : 0;

      const now = Date.now();
      const last7 = validOrders.filter(
        (o) => new Date(o.created_at ?? "").getTime() >= now - 7 * 86400000,
      );
      const prev7 = validOrders.filter((o) => {
        const d = new Date(o.created_at ?? "").getTime();
        return d >= now - 14 * 86400000 && d < now - 7 * 86400000;
      });

      const last7Revenue = last7.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const prev7Revenue = prev7.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const revenueChange =
        prev7Revenue > 0
          ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100
          : last7Revenue > 0
            ? 100
            : 0;
      const ordersChange =
        prev7.length > 0
          ? ((last7.length - prev7.length) / prev7.length) * 100
          : last7.length > 0
            ? 100
            : 0;

      const last30 = [];
      const todayDate = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayOrders = validOrders.filter((o) => o.created_at?.startsWith(dateStr));
        last30.push({
          date: dateStr.slice(5),
          revenue: dayOrders.reduce((s, o) => s + Number(o.total ?? 0), 0),
          orders: dayOrders.length,
        });
      }

      const statusCounts: Record<string, number> = {};
      (orders.data ?? []).forEach((o) => {
        const s = o.status ?? "pending";
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      });

      const avgOrder = validOrders.length > 0 ? revenue / validOrders.length : 0;

      return {
        products: products.count ?? 0,
        customers: customers.count ?? 0,
        orders: total,
        revenue,
        todayRevenue,
        todayOrders: todayOrders.length,
        conversionRate,
        avgOrder,
        revenueChange,
        ordersChange,
        recentOrders: recentOrders.data ?? [],
        chartData: last30,
        statusDistribution: Object.entries(statusCounts).map(([status, value]) => ({
          status,
          value,
        })),
      };
    },
  });

  const [greeting, setGreeting] = useState("Buenos días");
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Buenos días");
    else if (h < 18) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");
  }, []);

  const [profile, setProfile] = useState({ name: "", email: "" });
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setProfile({
          name: data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "Usuario",
          email: data.user.email ?? "",
        });
      }
    });
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 pb-16">
      <PageHeader
        greeting={greeting}
        name={profile.name}
        business={activeBusiness?.name}
        storeSlug={activeBusiness?.slug}
      />

      <InsightCard stats={stats} />

      <MetricsGrid stats={stats} />

      <ChartsGrid stats={stats} />

      <BottomSection stats={stats} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

function PageHeader({
  greeting,
  name,
  business,
  storeSlug,
}: {
  greeting: string;
  name: string;
  business?: string;
  storeSlug?: string;
}) {
  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground capitalize">
            <CalendarDays className="size-3.5" />
            {today}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">
            {greeting}, {name}.
          </h1>
          <p className="text-sm text-muted-foreground">
            {business ? `Resumen de ${business}` : "Resumen de tu negocio"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {storeSlug && (
            <Link to="/go/$slug" params={{ slug: storeSlug }}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
                <ExternalLink className="size-3.5" />
                Ver tienda
              </Button>
            </Link>
          )}
          <Link to="/app/products/new">
            <Button size="sm" className="h-9 gap-1.5 text-sm shadow-sm">
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const insights = useMemo(() => {
    const items: { icon: LucideIcon; text: string }[] = [];
    if (!stats) return items;

    if (stats.todayRevenue > 0) {
      items.push({
        icon: DollarSign,
        text: `Hoy ya facturaste $${stats.todayRevenue.toFixed(2)} — ${stats.revenue > 0 ? ((stats.todayRevenue / stats.revenue) * 100).toFixed(0) : 0}% del total acumulado.`,
      });
    }
    if (stats.customers > 0) {
      items.push({
        icon: Users,
        text: `Tienes ${stats.customers} cliente${stats.customers !== 1 ? "s" : ""} registrado${stats.customers !== 1 ? "s" : ""}. ${stats.customers > 5 ? "Excelente base para campañas." : "Suma más contactos para crecer."}`,
      });
    }
    if (stats.avgOrder > 0) {
      items.push({
        icon: Wallet,
        text: `El ticket promedio es $${stats.avgOrder.toFixed(2)}. ${stats.avgOrder > 20 ? "Tus clientes compran con confianza." : "Un upselling podría aumentar el valor."}`,
      });
    }
    if (stats.products > 0 && stats.products < 5) {
      items.push({
        icon: Package,
        text: `Tienes solo ${stats.products} producto${stats.products !== 1 ? "s" : ""}. Un catálogo más amplio puede incrementar las ventas hasta un 30%.`,
      });
    }
    if (stats.orders === 0 && stats.products > 0) {
      items.push({
        icon: ShoppingCart,
        text: "Tu catálogo está listo pero aún no recibes pedidos. Comparte tu tienda en WhatsApp y redes.",
      });
    }
    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        text: "Tu negocio está configurado. Agrega productos y promociona tu tienda para empezar a vender.",
      });
    }
    return items;
  }, [stats]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay: 0.05 }}
    >
      <Card className="relative overflow-hidden border-border/60 bg-card">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Asistente de negocios
              </h2>
              <p className="text-xs text-muted-foreground">
                Insights en tiempo real de tu operación
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {insights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-xs ring-1 ring-border">
                  <item.icon className="size-3.5" />
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = end * eased;
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function TrendChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value).toFixed(1)}%
      <span className="text-[10px] font-normal text-muted-foreground">vs 7 días</span>
    </span>
  );
}

function SparklineChart({
  data,
  color = "var(--color-primary)",
}: {
  data: { value: number }[];
  color?: string;
}) {
  const gradientId = useId();
  const chartData = data.length > 0 ? data : Array.from({ length: 7 }, () => ({ value: 0 }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MetricsGrid({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  if (!stats) return null;

  const metrics: {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    icon: LucideIcon;
    trend?: number;
    spark?: { value: number }[];
  }[] = [
    {
      label: "Ingresos",
      value: stats.revenue,
      prefix: "$",
      decimals: 2,
      icon: DollarSign,
      trend: stats.revenueChange,
      spark: stats.chartData.map((d) => ({ value: d.revenue })),
    },
    {
      label: "Pedidos",
      value: stats.orders,
      icon: ShoppingCart,
      trend: stats.ordersChange,
      spark: stats.chartData.map((d) => ({ value: d.orders })),
    },
    {
      label: "Clientes",
      value: stats.customers,
      icon: Users,
    },
    {
      label: "Productos",
      value: stats.products,
      icon: Package,
    },
    {
      label: "Ticket promedio",
      value: stats.avgOrder,
      prefix: "$",
      decimals: 2,
      icon: Receipt,
    },
    {
      label: "Conversión",
      value: stats.conversionRate,
      suffix: "%",
      decimals: 1,
      icon: Percent,
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Card className="group relative h-full overflow-hidden border-border/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <metric.icon className="size-3.5" />
              </div>
            </div>

            <div className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedCounter
                value={metric.value}
                prefix={metric.prefix ?? ""}
                suffix={metric.suffix ?? ""}
                decimals={metric.decimals ?? 0}
              />
            </div>

            {metric.trend != null ? (
              <div className="mt-2">
                <TrendChip value={metric.trend} />
              </div>
            ) : (
              <div className="mt-2 h-[22px]" />
            )}

            {metric.spark && (
              <div className="mt-2 opacity-40 transition-opacity group-hover:opacity-100">
                <SparklineChart data={metric.spark} />
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

const chartColors = [
  "var(--color-primary)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendientes", color: "var(--color-chart-4)" },
  completed: { label: "Completados", color: "var(--color-chart-2)" },
  paid: { label: "Pagados", color: "var(--color-chart-2)" },
  cancelled: { label: "Cancelados", color: "var(--color-destructive)" },
  refunded: { label: "Reembolsados", color: "var(--color-muted-foreground)" },
};

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  fontSize: "12px",
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
};

function ChartsGrid({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ingresos</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <AnimatedCounter value={stats?.revenue ?? 0} prefix="$" decimals={2} />
                <span className="text-xs text-muted-foreground">· últimos 30 días</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-normal text-muted-foreground ring-1 ring-border"
            >
              {stats && stats.revenueChange > 0 ? "+" : ""}
              {(stats?.revenueChange ?? 0).toFixed(1)}% vs período anterior
            </Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.chartData ?? []}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <ReTooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Ingresos"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pedidos por día</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Últimos 30 días</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.chartData ?? []}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ReTooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="orders"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Distribución</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Estado de pedidos</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            {stats?.statusDistribution?.some((s: StatusDistribution) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={stats.statusDistribution
                      .filter((s: StatusDistribution) => s.value > 0)
                      .map((s: StatusDistribution) => ({
                        name: statusLabels[s.status]?.label ?? s.status,
                        value: s.value,
                        color: statusLabels[s.status]?.color ?? "var(--color-muted-foreground)",
                      }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusDistribution
                      .filter((s: StatusDistribution) => s.value > 0)
                      .map((s: StatusDistribution) => (
                        <Cell
                          key={s.status}
                          fill={statusLabels[s.status]?.color ?? "var(--color-muted-foreground)"}
                        />
                      ))}
                  </Pie>
                  <ReTooltip contentStyle={tooltipStyle} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                  <Package className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">Sin pedidos todavía</p>
              </div>
            )}
          </div>
          {stats?.statusDistribution?.some((s: StatusDistribution) => s.value > 0) && (
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              {stats.statusDistribution
                .filter((s: StatusDistribution) => s.value > 0)
                .map((s: StatusDistribution) => (
                  <span key={s.status} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          statusLabels[s.status]?.color ?? "var(--color-muted-foreground)",
                      }}
                    />
                    {statusLabels[s.status]?.label ?? s.status}
                  </span>
                ))}
            </div>
          )}
        </Card>
      </motion.div>

      <RecentOrders stats={stats} />
    </div>
  );
}

function statusBadgeTone(status?: string | null) {
  if (status === "completed" || status === "paid") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  return "neutral";
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Pagado";
    case "completed":
      return "Completado";
    case "pending":
      return "Pendiente";
    case "cancelled":
      return "Cancelado";
    case "refunded":
      return "Reembolsado";
    default:
      return status ?? "Pendiente";
  }
}

function RecentOrders({ stats }: { stats: DashboardStats | undefined }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="lg:col-span-2"
    >
      <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pedidos recientes</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Últimos 10 pedidos</p>
          </div>
          <Link to="/app/orders">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos <ChevronRight className="size-3" />
            </Button>
          </Link>
        </div>

        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="-mx-2">
            <ul className="divide-y divide-border/30">
              {stats.recentOrders.map((order: RecentOrder, i: number) => (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.03, duration: 0.3 }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShoppingCart className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium text-foreground">
                        {order.customer_name ?? "Cliente"}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        #{order.id?.toString().slice(0, 8) ?? "---"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })
                        : "---"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-transparent text-[10px] font-medium uppercase tracking-wider px-2 py-0.5",
                        statusBadgeTone(order.status) === "success" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        statusBadgeTone(order.status) === "danger" &&
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                        statusBadgeTone(order.status) === "neutral" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {statusLabel(order.status)}
                    </Badge>
                    <span className="w-16 text-right text-xs font-semibold tabular-nums text-foreground">
                      ${Number(order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
              <ShoppingCart className="size-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground/80">Aún no hay pedidos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Comparte tu tienda para recibir tu primer pedido.
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function BottomSection({ stats }: { stats: DashboardStats | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <QuickActions />
      <ModuleStatus stats={stats} />
      <ActivityFeed stats={stats} />
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const actions = [
    {
      label: "Nuevo producto",
      icon: Package,
      desc: "Agregar al catálogo",
      to: "/app/products/new" as const,
    },
    {
      label: "Ver pedidos",
      icon: ShoppingCart,
      desc: "Lista de pedidos",
      to: "/app/orders" as const,
    },
    {
      label: "Ver clientes",
      icon: Users,
      desc: "Tu base de contactos",
      to: "/app/customers" as const,
    },
    { label: "Ver inbox", icon: Inbox, desc: "Mensajes entrantes", to: "/app/inbox" as const },
    {
      label: "Configurar tienda",
      icon: Settings2,
      desc: "Personalizar",
      to: "/app/settings" as const,
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Acciones rápidas</h3>
          <ArrowRight className="size-4 text-muted-foreground/40" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {actions.map((action, i) => (
            <motion.button
              key={action.label}
              type="button"
              onClick={() => navigate({ to: action.to })}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <action.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </motion.button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function ModuleStatus({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const modules = [
    {
      name: "Catálogo",
      icon: Package,
      status: "active",
      usage: `${stats?.products ?? 0} producto${(stats?.products ?? 0) !== 1 ? "s" : ""}`,
    },
    {
      name: "Pedidos",
      icon: ShoppingCart,
      status: "active",
      usage: `${stats?.orders ?? 0} pedido${(stats?.orders ?? 0) !== 1 ? "s" : ""}`,
    },
    { name: "Inbox", icon: MessageSquare, status: "active", usage: "Activo" },
    {
      name: "CRM",
      icon: Users,
      status: "active",
      usage: `${stats?.customers ?? 0} cliente${(stats?.customers ?? 0) !== 1 ? "s" : ""}`,
    },
    { name: "AI", icon: Bot, status: "coming", usage: "Próximamente" },
    { name: "Analytics", icon: Activity, status: "coming", usage: "Próximamente" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Módulos</h3>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
            {modules.filter((m) => m.status === "active").length} activos
          </Badge>
        </div>
        <div className="space-y-1.5">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
              className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  mod.status === "active"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 text-muted-foreground/50",
                )}
              >
                <mod.icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{mod.name}</span>
                  {mod.status === "coming" ? (
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0 font-normal text-muted-foreground/60 uppercase tracking-wider"
                    >
                      Pronto
                    </Badge>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 truncate">{mod.usage}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function timeAgo(iso?: string | null) {
  if (!iso) return "recientemente";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

function ActivityFeed({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const orders = stats?.recentOrders ?? [];
  const activities = orders.map((order: RecentOrder) => ({
    text: "Nuevo pedido recibido",
    detail: `${order.customer_name ?? "Cliente"} · $${Number(order.total ?? 0).toFixed(2)}`,
    time: timeAgo(order.created_at),
    icon: ShoppingCart,
  }));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="h-full overflow-hidden border-border/60 p-5 lg:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Actividad reciente</h3>
        </div>
        {activities.length > 0 ? (
          <div className="space-y-0">
            {activities.map((act, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                className="flex items-start gap-3 border-b border-border/20 py-2.5 last:border-0"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <act.icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{act.text}</p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{act.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/50">{act.time}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
              <Activity className="size-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground/80">Sin actividad todavía</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Los eventos aparecerán aquí en tiempo real.
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

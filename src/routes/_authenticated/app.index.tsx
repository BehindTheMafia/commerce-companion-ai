import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  MessageSquare,
  DollarSign,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bot,
  BarChart3,
  PieChart,
  Activity,
  Settings2,
  ExternalLink,
  Inbox,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback, useId } from "react";
import {
  LineChart,
  Line,
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
    <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 pb-12">
      <GreetingSection greeting={greeting} name={profile.name} business={activeBusiness?.name} />

      <AIHeroSection stats={stats} />

      <KPIRow stats={stats} />

      <MainGrid stats={stats} storeSlug={activeBusiness?.slug} />

      <BottomSection stats={stats} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 pb-12">
      <div className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

function GreetingSection({
  greeting,
  name,
  business,
}: {
  greeting: string;
  name: string;
  business?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
          {greeting}, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {business
            ? `Aquí está todo lo que pasa en ${business} hoy.`
            : "Aquí está todo lo que pasa en tu negocio hoy."}
        </p>
      </div>
    </motion.div>
  );
}

function AIHeroSection({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const insights = useMemo(() => {
    const items: { icon: LucideIcon; color: string; text: string }[] = [];
    if (!stats) return items;

    if (stats.todayRevenue > 0) {
      items.push({
        icon: TrendingUp,
        color: "text-emerald-500",
        text: `Los ingresos de hoy ($${stats.todayRevenue.toFixed(2)}) ya representan el ${stats.revenue > 0 ? ((stats.todayRevenue / stats.revenue) * 100).toFixed(0) : 0}% del total.`,
      });
    }
    if (stats.customers > 0) {
      items.push({
        icon: Users,
        color: "text-blue-500",
        text: `Tienes ${stats.customers} cliente${stats.customers !== 1 ? "s" : ""} registrado${stats.customers !== 1 ? "s" : ""}. ${stats.customers > 5 ? "Excelente base para campañas." : "Intenta importar más contactos."}`,
      });
    }
    if (stats.avgOrder > 0) {
      items.push({
        icon: DollarSign,
        color: "text-amber-500",
        text: `El ticket promedio es $${stats.avgOrder.toFixed(2)}. ${stats.avgOrder > 20 ? "Tus clientes compran con confianza." : "Considera upselling para aumentar el valor."}`,
      });
    }
    if (stats.products > 0 && stats.products < 5) {
      items.push({
        icon: Package,
        color: "text-violet-500",
        text: `Tienes solo ${stats.products} producto${stats.products !== 1 ? "s" : ""}. Un catálogo más amplio podría aumentar las ventas hasta un 30%.`,
      });
    }
    if (stats.orders === 0 && stats.products > 0) {
      items.push({
        icon: ShoppingCart,
        color: "text-rose-500",
        text: "Tus productos están listos pero no has recibido pedidos. Comparte tu enlace de tienda en WhatsApp y redes sociales.",
      });
    }
    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        color: "text-primary",
        text: "Tu negocio está configurado. Sigue agregando productos y promocionando tu tienda para empezar a recibir pedidos.",
      });
    }
    return items;
  }, [stats]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
    >
      <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Commerce AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Resumen inteligente de tu negocio</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {insights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 backdrop-blur-sm"
              >
                <div className={`mt-0.5 shrink-0 ${item.color}`}>
                  <item.icon className="size-4" />
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
    <span ref={ref}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
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
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KPIRow({ stats }: { stats: DashboardStats | undefined }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  if (!stats) return null;

  const kpis = [
    {
      label: "Ingresos",
      value: stats.revenue,
      prefix: "$",
      decimals: 2,
      icon: DollarSign,
      trend: stats.revenueChange,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      sparkColor: "var(--color-chart-2)",
      sparkData: stats.chartData.map((d) => ({ value: d.revenue })),
    },
    {
      label: "Pedidos",
      value: stats.orders,
      icon: ShoppingCart,
      trend: stats.ordersChange,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      sparkColor: "var(--color-chart-3)",
      sparkData: stats.chartData.map((d) => ({ value: d.orders })),
    },
    {
      label: "Clientes",
      value: stats.customers,
      icon: Users,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      label: "Productos",
      value: stats.products,
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Conversión",
      value: stats.conversionRate,
      suffix: "%",
      decimals: 1,
      icon: Percent,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Ticket Promedio",
      value: stats.avgOrder,
      prefix: "$",
      decimals: 2,
      icon: Wallet,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      label: "Hoy",
      value: stats.todayRevenue,
      prefix: "$",
      decimals: 2,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Card className="group relative overflow-hidden border-border/40 p-3 transition-all duration-300 hover:border-border/80 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {kpi.label}
              </span>
              <div className={`flex h-5 w-5 items-center justify-center rounded-md ${kpi.bgColor}`}>
                <kpi.icon className={`size-3 ${kpi.color}`} />
              </div>
            </div>
            <div className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
              <AnimatedCounter
                value={kpi.value}
                prefix={kpi.prefix ?? ""}
                suffix={kpi.suffix ?? ""}
                decimals={kpi.decimals ?? 0}
              />
            </div>
            {kpi.trend != null ? (
              <div className="mt-1 flex items-center gap-1">
                {kpi.trend > 0 ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-rose-500" />
                )}
                <span
                  className={`text-[10px] font-medium ${kpi.trend > 0 ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {Math.abs(kpi.trend).toFixed(1)}%
                </span>
                <span className="text-[9px] text-muted-foreground/50">vs 7 días</span>
              </div>
            ) : (
              <div className="mt-1 h-[18px]" />
            )}
            {kpi.sparkData && (
              <div className="mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <SparklineChart data={kpi.sparkData} color={kpi.sparkColor} />
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

function MainGrid({ stats, storeSlug }: { stats: DashboardStats | undefined; storeSlug?: string }) {
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
        <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ingresos</h3>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {stats && stats.revenueChange > 0 ? "+" : ""}
                {(stats?.revenueChange ?? 0).toFixed(1)}% vs período anterior
              </Badge>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.chartData ?? []}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.15} />
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
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <ReTooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "12px",
                  }}
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
        <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pedidos por día</h3>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
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
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ReTooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    fontSize: "12px",
                  }}
                />
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
        <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Distribución</h3>
              <p className="text-xs text-muted-foreground">Estado de pedidos</p>
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
                    outerRadius={90}
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
                  <ReTooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      fontSize: "12px",
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <PieChart className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Sin pedidos todavía</p>
              </div>
            )}
          </div>
          {stats?.statusDistribution?.some((s: StatusDistribution) => s.value > 0) && (
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
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

      <RecentOrders stats={stats} storeSlug={storeSlug} />
    </div>
  );
}

function RecentOrders({
  stats,
  storeSlug,
}: {
  stats: DashboardStats | undefined;
  storeSlug?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="lg:col-span-2"
    >
      <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pedidos Recientes</h3>
            <p className="text-xs text-muted-foreground">Últimos 10 pedidos</p>
          </div>
          <Link to="/app/orders">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              Ver todos <ChevronRight className="size-3" />
            </Button>
          </Link>
        </div>

        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <ul className="divide-y divide-border/20">
            {stats.recentOrders.map((order: RecentOrder, i: number) => (
              <motion.li
                key={order.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.03, duration: 0.3 }}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingCart className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {order.customer_name ?? "Cliente"} ·{" "}
                    <span className="font-mono text-muted-foreground">
                      #{order.id?.toString().slice(0, 6) ?? "---"}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })
                      : "---"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      order.status === "completed" || order.status === "paid"
                        ? "default"
                        : order.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5"
                  >
                    {order.status ?? "pending"}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    ${Number(order.total ?? 0).toFixed(2)}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <ShoppingCart className="size-5 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground/80">Aún no hay pedidos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Comparte tu tienda para recibir tu primer pedido.
            </p>
            {storeSlug && (
              <Link to="/go/$slug" params={{ slug: storeSlug }}>
                <Button size="sm" variant="outline" className="mt-4 h-8 gap-1.5 text-xs">
                  <ExternalLink className="size-3.5" />
                  Ir a mi tienda
                </Button>
              </Link>
            )}
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
      color: "bg-blue-500/10 text-blue-500",
      desc: "Agregar al catálogo",
      to: "/app/products/new" as const,
    },
    {
      label: "Ver pedidos",
      icon: ShoppingCart,
      color: "bg-emerald-500/10 text-emerald-500",
      desc: "Lista de pedidos",
      to: "/app/orders" as const,
    },
    {
      label: "Ver clientes",
      icon: Users,
      color: "bg-amber-500/10 text-amber-500",
      desc: "Tu base de contactos",
      to: "/app/customers" as const,
    },
    {
      label: "Ver inbox",
      icon: Inbox,
      color: "bg-rose-500/10 text-rose-500",
      desc: "Mensajes entrantes",
      to: "/app/inbox" as const,
    },
    {
      label: "Configurar tienda",
      icon: Settings2,
      color: "bg-cyan-500/10 text-cyan-500",
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
      <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, i) => (
            <motion.button
              key={action.label}
              type="button"
              onClick={() => navigate({ to: action.to })}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/40 bg-background p-3 text-center transition-colors hover:border-border/80 hover:bg-muted/30"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${action.color}`}
              >
                <action.icon className="size-4" />
              </div>
              <span className="text-xs font-medium text-foreground/80">{action.label}</span>
              <span className="text-[9px] text-muted-foreground/60">{action.desc}</span>
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
    { name: "Analytics", icon: BarChart3, status: "coming", usage: "Próximamente" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Módulos</h3>
          <Badge variant="outline" className="text-[9px] font-normal text-muted-foreground">
            {modules.filter((m) => m.status === "active").length} activos
          </Badge>
        </div>
        <div className="space-y-2">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-3 rounded-lg border border-border/30 p-2.5 transition-colors hover:bg-muted/30"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  mod.status === "active"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground/50"
                }`}
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
    color: "text-emerald-500 bg-emerald-500/10",
  }));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="overflow-hidden border-border/40 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Actividad Reciente</h3>
        </div>
        {activities.length > 0 ? (
          <div className="space-y-0">
            {activities.map((act, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                className="flex items-start gap-3 border-b border-border/20 py-2.5 last:border-0"
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${act.color}`}
                >
                  <act.icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{act.text}</p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{act.detail}</p>
                </div>
                <span className="text-[9px] text-muted-foreground/50 shrink-0">{act.time}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
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

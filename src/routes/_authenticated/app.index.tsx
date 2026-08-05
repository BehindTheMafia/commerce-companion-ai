import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ExternalLink,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Sparkles,
  Users,
  Percent,
  Check,
  AlertTriangle,
  Bell,
  Moon,
  Sun,
  Copy,
  CheckCircle2,
  Settings2,
  LogOut,
  TrendingUp,
  CreditCard,
  Truck,
  Globe,
  Share2,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useId, useCallback } from "react";
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
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

type TimeRange = "7d" | "30d" | "90d" | "12m";

type RecentOrder = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string | null;
  customer_name: string | null;
};

type FeaturedProduct = {
  id: string;
  name: string;
  stock: number;
  sales_count: number;
  revenue: number;
  image_url?: string | null;
};

type ChartPoint = { date: string; revenue: number; orders: number };

type RawOrder = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string | null;
  customer_name: string | null;
};

type RawOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type RawProduct = {
  id: string;
  name: string;
  stock: number;
  image_url: string | null;
};

function Dashboard() {
  const { activeBusiness } = useBusiness();
  const businessId = activeBusiness?.id;
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Goals checklist state stored in local storage per business
  const storageKey = `commerce_ai_goals_${businessId || "default"}`;
  const [userGoals, setUserGoals] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined" && businessId) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(userGoals));
      } catch (e) {
        console.error("Could not save goals", e);
      }
    }
  }, [userGoals, storageKey, businessId]);

  const toggleGoal = (id: string) => {
    setUserGoals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["dashboard-raw-data", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const bid = businessId!;
      const [productsRes, customersRes, ordersRes, recentOrdersRes, productsListRes, orderItemsRes] =
        await Promise.all([
          supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", bid),
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", bid),
          supabase
            .from("orders")
            .select("id,total,status,created_at,customer_name")
            .eq("business_id", bid)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id,total,status,created_at,customer_name")
            .eq("business_id", bid)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("products").select("id,name,stock,image_url").eq("business_id", bid).limit(50),
          supabase.from("order_items").select("id,order_id,product_id,product_name,quantity,unit_price,total"),
        ]);

      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (recentOrdersRes.error) throw recentOrdersRes.error;

      return {
        productsCount: productsRes.count ?? 0,
        customersCount: customersRes.count ?? 0,
        orders: (ordersRes.data ?? []) as RawOrder[],
        recentOrders: (recentOrdersRes.data ?? []) as RecentOrder[],
        products: (productsListRes.data ?? []) as RawProduct[],
        orderItems: (orderItemsRes.data ?? []) as RawOrderItem[],
      };
    },
  });

  // Calculate filtered stats based on selected time range
  const stats = useMemo(() => {
    if (!rawData) return null;

    const { productsCount, customersCount, orders, recentOrders, products, orderItems } = rawData;
    const validOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");

    let daysCount = 30;
    if (timeRange === "7d") daysCount = 7;
    if (timeRange === "30d") daysCount = 30;
    if (timeRange === "90d") daysCount = 90;
    if (timeRange === "12m") daysCount = 365;

    const now = Date.now();
    const periodMs = daysCount * 86400000;
    const currentPeriodOrders = validOrders.filter(
      (o) => new Date(o.created_at ?? "").getTime() >= now - periodMs,
    );
    const prevPeriodOrders = validOrders.filter((o) => {
      const t = new Date(o.created_at ?? "").getTime();
      return t >= now - 2 * periodMs && t < now - periodMs;
    });

    const revenue = currentPeriodOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const prevRevenue = prevPeriodOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const totalOrdersCount = currentPeriodOrders.length;
    const prevOrdersCount = prevPeriodOrders.length;

    const revenueChange =
      prevRevenue > 0
        ? ((revenue - prevRevenue) / prevRevenue) * 100
        : revenue > 0
          ? 100
          : 0;

    const ordersChange =
      prevOrdersCount > 0
        ? ((totalOrdersCount - prevOrdersCount) / prevOrdersCount) * 100
        : totalOrdersCount > 0
          ? 100
          : 0;

    const avgOrder = totalOrdersCount > 0 ? revenue / totalOrdersCount : 0;
    const totalOrdersAttempted = orders.filter(
      (o) => new Date(o.created_at ?? "").getTime() >= now - periodMs,
    ).length;
    const cancelledCount = orders.filter(
      (o) => o.status === "cancelled" && new Date(o.created_at ?? "").getTime() >= now - periodMs,
    ).length;
    const conversionRate =
      totalOrdersAttempted > 0 ? ((totalOrdersAttempted - cancelledCount) / totalOrdersAttempted) * 100 : 0;

    // Time-series chart points
    const chartData: ChartPoint[] = [];
    const stepCount = timeRange === "12m" ? 12 : Math.min(daysCount, 30);
    const todayDate = new Date();

    if (timeRange === "12m") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString("es-ES", { month: "short" });
        const yearVal = d.getFullYear();
        const monthVal = d.getMonth();

        const monthOrders = validOrders.filter((o) => {
          const od = new Date(o.created_at ?? "");
          return od.getFullYear() === yearVal && od.getMonth() === monthVal;
        });

        chartData.push({
          date: `${monthLabel}`,
          revenue: monthOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
          orders: monthOrders.length,
        });
      }
    } else {
      for (let i = stepCount - 1; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayOrders = validOrders.filter((o) => o.created_at?.startsWith(dateStr));
        chartData.push({
          date: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          revenue: dayOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
          orders: dayOrders.length,
        });
      }
    }

    // Calculate Featured Products
    const validOrderIds = new Set(validOrders.map((o) => o.id));
    const productStatsMap: Record<string, { name: string; sales: number; revenue: number }> = {};

    orderItems.forEach((item) => {
      if (item.order_id && validOrderIds.has(item.order_id)) {
        const pKey = item.product_id || item.product_name;
        if (!productStatsMap[pKey]) {
          productStatsMap[pKey] = { name: item.product_name, sales: 0, revenue: 0 };
        }
        productStatsMap[pKey].sales += item.quantity || 1;
        productStatsMap[pKey].revenue += Number(item.total || item.unit_price * item.quantity || 0);
      }
    });

    const featuredProducts: FeaturedProduct[] = products
      .map((p) => {
        const stats = productStatsMap[p.id] || productStatsMap[p.name] || { sales: 0, revenue: 0 };
        return {
          id: p.id,
          name: p.name,
          stock: p.stock ?? 0,
          sales_count: stats.sales,
          revenue: stats.revenue,
          image_url: p.image_url,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.sales_count - a.sales_count)
      .slice(0, 5);

    // Business Health calculation
    const hasProfile = !!activeBusiness?.name;
    const hasCatalog = productsCount > 0;
    const hasPayment = !!activeBusiness?.whatsapp_phone || !!userGoals["payment"];
    const hasShipping = !!userGoals["shipping"];
    const hasCustomDomain = !!userGoals["domain"] || activeBusiness?.slug !== "default";

    let healthScore = 0;
    if (hasProfile) healthScore += 20;
    if (hasCatalog) healthScore += 25;
    if (hasPayment) healthScore += 20;
    if (hasShipping) healthScore += 20;
    if (hasCustomDomain) healthScore += 15;

    return {
      revenue,
      revenueChange,
      ordersCount: totalOrdersCount,
      ordersChange,
      customersCount,
      productsCount,
      avgOrder,
      conversionRate,
      chartData,
      recentOrders,
      featuredProducts,
      healthScore,
      healthChecklist: [
        { label: "Perfil completo", ok: hasProfile },
        { label: "Catálogo creado", ok: hasCatalog },
        { label: "Métodos de pago", ok: hasPayment },
        { label: "Envíos", ok: hasShipping },
        { label: "Dominio personalizado", ok: hasCustomDomain },
      ],
    };
  }, [rawData, timeRange, activeBusiness, userGoals]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0B0F17] text-[#111827] dark:text-[#F9FAFB] transition-colors duration-200">
      <DashboardHeader activeBusiness={activeBusiness} />

      <main className="mx-auto w-full max-w-[1400px] space-y-[56px] px-6 lg:px-10 py-10 pb-24">
        {/* PRIMERA SECCIÓN: Business Health */}
        <BusinessHealthCard stats={stats} />

        {/* SEGUNDA SECCIÓN: KPIs */}
        <KPISection stats={stats} />

        {/* TERCERA SECCIÓN: Gráficos */}
        <ChartsSection stats={stats} timeRange={timeRange} setTimeRange={setTimeRange} />

        {/* CUARTA SECCIÓN: Objetivos del negocio */}
        <BusinessGoalsSection
          stats={stats}
          userGoals={userGoals}
          toggleGoal={toggleGoal}
          storeSlug={activeBusiness?.slug}
        />

        {/* QUINTA SECCIÓN: Pedidos recientes */}
        <RecentOrdersSection recentOrders={stats?.recentOrders ?? []} storeSlug={activeBusiness?.slug} />

        {/* SEXTA SECCIÓN: Productos destacados */}
        <FeaturedProductsSection products={stats?.featuredProducts ?? []} navigate={navigate} />

        {/* SÉPTIMA SECCIÓN: Insights automáticos */}
        <AutomaticInsightsSection stats={stats} />
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// HEADER COMPONENT
// ----------------------------------------------------------------------
function DashboardHeader({ activeBusiness }: { activeBusiness: any }) {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [greeting, setGreeting] = useState("Buenos días");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Buenos días");
    else if (h < 18) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setUserName(
          data.user.user_metadata?.full_name ??
            data.user.email?.split("@")[0] ??
            "Usuario",
        );
      }
    });
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("commerce_ai_theme");
    const isDark =
      stored === "dark" ||
      (stored === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("commerce_ai_theme", next ? "dark" : "light");
  }, [dark]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const storeSlug = activeBusiness?.slug;

  return (
    <header className="sticky top-0 z-30 border-b border-[#EEF2F6] dark:border-slate-800 bg-[#FAFBFC]/90 dark:bg-[#0B0F17]/90 backdrop-blur-xl px-6 lg:px-10 py-6 transition-colors">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-[1.75rem] font-semibold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            {greeting}, {userName}
          </h1>
          <p className="text-sm font-medium text-[#6B7280] dark:text-slate-400">
            Aquí tienes el resumen de tu negocio.
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {storeSlug && (
            <Link to="/go/$slug" params={{ slug: storeSlug }}>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] shadow-xs hover:bg-[#FAFBFC] dark:hover:bg-slate-800 transition-all"
              >
                <ExternalLink className="size-3.5 text-[#6B7280] dark:text-slate-400" />
                Ver tienda
              </Button>
            </Link>
          )}

          <Link to="/app/products/new">
            <Button
              size="sm"
              className="h-10 gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] px-4 text-xs font-semibold text-white shadow-xs transition-all hover:scale-[1.01]"
            >
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          </Link>

          <div className="mx-1 h-5 w-px bg-[#EEF2F6] dark:bg-slate-800" />

          {/* Theme Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#FAFBFC] dark:hover:bg-slate-800 transition-all"
                >
                  {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {dark ? "Modo claro" : "Modo oscuro"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#FAFBFC] dark:hover:bg-slate-800 transition-all">
                <Bell className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-[20px] p-4 shadow-xl border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900">
              <DropdownMenuLabel className="font-semibold text-sm text-[#111827] dark:text-slate-100">
                Notificaciones
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-[#EEF2F6] dark:bg-slate-800" />
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAFBFC] dark:bg-slate-800 text-[#6B7280] dark:text-slate-400">
                  <Bell className="size-5" />
                </div>
                <p className="mt-3 text-xs font-medium text-[#6B7280] dark:text-slate-400">
                  No tienes notificaciones pendientes
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 pr-3 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#FAFBFC] dark:hover:bg-slate-800 transition-all">
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline font-semibold">{userName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[20px] p-2 shadow-xl border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900">
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-sm font-semibold text-[#111827] dark:text-slate-100">
                    {userName}
                  </span>
                  <span className="text-xs text-[#6B7280] dark:text-slate-400 truncate">
                    {email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-[#EEF2F6] dark:bg-slate-800" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/app/settings" })}
                  className="rounded-xl cursor-pointer p-2.5 text-xs font-medium"
                >
                  <Settings2 className="mr-2 size-4 text-[#6B7280]" />
                  <span>Configuración</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-1 bg-[#EEF2F6] dark:bg-slate-800" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl cursor-pointer p-2.5 text-xs font-medium text-rose-600 focus:text-rose-600"
              >
                <LogOut className="mr-2 size-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------------
// PRIMERA SECCIÓN: Business Health
// ----------------------------------------------------------------------
function BusinessHealthCard({ stats }: { stats: any }) {
  const score = stats?.healthScore ?? 0;
  const checklist = stats?.healthChecklist ?? [];

  const scrollToGoals = () => {
    const el = document.getElementById("business-goals-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2563EB]/[0.03] blur-3xl" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                Estado del negocio
              </span>
              <span className="inline-flex items-center rounded-full bg-[#2563EB]/10 px-3 py-1 text-xs font-bold text-[#2563EB]">
                {score} / 100
              </span>
            </div>

            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              {score >= 80
                ? "Tu tienda está casi lista para comenzar a vender."
                : score >= 50
                  ? "Vas por buen camino, completa algunos pasos clave."
                  : "Comienza a configurar tu tienda para recibir clientes."}
            </h2>

            {/* Checklist Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {checklist.map((item: { label: string; ok: boolean }, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                    item.ok
                      ? "border-[#16A34A]/20 bg-[#16A34A]/5 text-[#16A34A]"
                      : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {item.ok ? (
                    <Check className="size-3.5 stroke-[2.5]" />
                  ) : (
                    <AlertTriangle className="size-3.5 stroke-[2.5]" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 pt-2 lg:pt-0">
            <Button
              onClick={scrollToGoals}
              size="lg"
              className="h-11 rounded-xl bg-[#111827] hover:bg-[#1F2937] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#111827] px-6 text-xs font-bold shadow-xs transition-all hover:scale-[1.01]"
            >
              Completar configuración
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// SEGUNDA SECCIÓN: KPIs
// ----------------------------------------------------------------------
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
    const duration = 1000;
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-tight",
        up
          ? "bg-[#16A34A]/10 text-[#16A34A]"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {up ? <ArrowUpRight className="size-3 stroke-[2.5]" /> : <ArrowDownRight className="size-3 stroke-[2.5]" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MiniSparkline({ data, color = "#2563EB" }: { data: { value: number }[]; color?: string }) {
  const gradientId = useId();
  const chartData = data && data.length > 0 ? data : Array.from({ length: 7 }, () => ({ value: 0 }));

  return (
    <div className="h-9 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
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
    </div>
  );
}

function KPISection({ stats }: { stats: any }) {
  if (!stats) return null;

  const kpis: {
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
      spark: stats.chartData.map((d: any) => ({ value: d.revenue })),
    },
    {
      label: "Pedidos",
      value: stats.ordersCount,
      icon: ShoppingCart,
      trend: stats.ordersChange,
      spark: stats.chartData.map((d: any) => ({ value: d.orders })),
    },
    {
      label: "Clientes",
      value: stats.customersCount,
      icon: Users,
    },
    {
      label: "Productos",
      value: stats.productsCount,
      icon: Package,
    },
    {
      label: "Conversión",
      value: stats.conversionRate,
      suffix: "%",
      decimals: 1,
      icon: Percent,
    },
    {
      label: "Ticket promedio",
      value: stats.avgOrder,
      prefix: "$",
      decimals: 2,
      icon: Receipt,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.04 * i, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="group relative flex flex-col justify-between rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] transition-all duration-180 hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)]">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                    {kpi.label}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAFBFC] dark:bg-slate-800 text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-200">
                    <kpi.icon className="size-4 stroke-[2]" />
                  </div>
                </div>

                <div className="mt-3 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
                  <AnimatedCounter
                    value={kpi.value}
                    prefix={kpi.prefix}
                    suffix={kpi.suffix}
                    decimals={kpi.decimals}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EEF2F6]/60 dark:border-slate-800/60">
                {kpi.trend != null ? (
                  <div className="flex items-center justify-between">
                    <TrendChip value={kpi.trend} />
                    <span className="text-[11px] font-medium text-[#6B7280] dark:text-slate-500">
                      vs anterior
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] font-medium text-[#6B7280] dark:text-slate-500">
                    Acumulado total
                  </div>
                )}

                {kpi.spark && (
                  <div className="mt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <MiniSparkline data={kpi.spark} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// TERCERA SECCIÓN: Gráficos
// ----------------------------------------------------------------------
function ChartsSection({
  stats,
  timeRange,
  setTimeRange,
}: {
  stats: any;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
}) {
  const chartData = stats?.chartData ?? [];

  const ranges: { label: string; value: TimeRange }[] = [
    { label: "7 días", value: "7d" },
    { label: "30 días", value: "30d" },
    { label: "90 días", value: "90d" },
    { label: "12 meses", value: "12m" },
  ];

  const tooltipStyle = {
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "12px",
    color: "#FFFFFF",
    fontSize: "12px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
    padding: "10px 14px",
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Rendimiento del negocio
          </h2>
          <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400">
            Comparativa de ventas y volumen de pedidos
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center rounded-xl border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xs">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                timeRange === r.value
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-200",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ingresos AreaChart */}
        <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                Ingresos
              </span>
              <div className="mt-1 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
                ${(stats?.revenue ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <TrendChip value={stats?.revenueChange ?? 0} />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="stripeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" opacity={0.6} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <ReTooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: number) => [`$${val.toFixed(2)}`, "Ingresos"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#stripeRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pedidos BarChart */}
        <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-slate-400">
                Pedidos
              </span>
              <div className="mt-1 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
                {stats?.ordersCount ?? 0} pedidos
              </div>
            </div>
            <TrendChip value={stats?.ordersChange ?? 0} />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" opacity={0.6} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ReTooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: number) => [val, "Pedidos"]}
                />
                <Bar
                  dataKey="orders"
                  fill="#16A34A"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// CUARTA SECCIÓN: Objetivos del negocio
// ----------------------------------------------------------------------
function BusinessGoalsSection({
  stats,
  userGoals,
  toggleGoal,
  storeSlug,
}: {
  stats: any;
  userGoals: Record<string, boolean>;
  toggleGoal: (id: string) => void;
  storeSlug?: string;
}) {
  const productsCount = stats?.productsCount ?? 0;

  const tasks = [
    {
      id: "products",
      label: "Agrega 10 productos",
      auto: productsCount >= 10,
      link: "/app/products/new",
      linkText: "Agregar producto",
    },
    {
      id: "payment",
      label: "Configura métodos de pago",
      auto: false,
      link: "/app/settings",
      linkText: "Configurar pagos",
    },
    {
      id: "shipping",
      label: "Configura envíos",
      auto: false,
      link: "/app/settings",
      linkText: "Configurar envíos",
    },
    {
      id: "customize",
      label: "Personaliza tu tienda",
      auto: false,
      link: "/app/settings",
      linkText: "Personalizar",
    },
    {
      id: "share",
      label: "Comparte tu tienda",
      auto: false,
      action: () => {
        const url = storeSlug
          ? `${window.location.origin}/go/${storeSlug}`
          : window.location.origin;
        navigator.clipboard.writeText(url);
        toast.success("Enlace de tienda copiado al portapapeles");
      },
      actionText: "Copiar enlace",
    },
  ];

  const completedCount = tasks.filter((t) => t.auto || userGoals[t.id]).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <motion.section
      id="business-goals-section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#EEF2F6] dark:border-slate-800 pb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              Objetivos del negocio
            </h2>
            <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mt-1">
              Completa estos pasos para comenzar a vender.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-36 lg:w-48 bg-[#FAFBFC] dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-[#EEF2F6] dark:border-slate-700">
              <div
                className="bg-[#2563EB] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-[#2563EB]">{progressPercent}%</span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {tasks.map((task) => {
            const isChecked = task.auto || !!userGoals[task.id];

            return (
              <div
                key={task.id}
                onClick={() => !task.auto && toggleGoal(task.id)}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all duration-150 cursor-pointer",
                  isChecked
                    ? "border-[#16A34A]/20 bg-[#16A34A]/5 dark:bg-[#16A34A]/10"
                    : "border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#2563EB]/40",
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      isChecked
                        ? "border-[#16A34A] bg-[#16A34A] text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-transparent",
                    )}
                  >
                    <Check className="size-4 stroke-[3]" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-all",
                      isChecked
                        ? "line-through text-[#6B7280] dark:text-slate-400"
                        : "text-[#111827] dark:text-slate-100",
                    )}
                  >
                    {task.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                  {task.link && (
                    <Link to={task.link as any}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#2563EB]/10"
                      >
                        {task.linkText} <ChevronRight className="size-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                  {task.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={task.action}
                      className="h-8 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#2563EB]/10"
                    >
                      {task.actionText} <Copy className="size-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// QUINTA SECCIÓN: Pedidos recientes
// ----------------------------------------------------------------------
function RecentOrdersSection({
  recentOrders,
  storeSlug,
}: {
  recentOrders: RecentOrder[];
  storeSlug?: string;
}) {
  const handleShare = () => {
    const url = storeSlug
      ? `${window.location.origin}/go/${storeSlug}`
      : window.location.origin;
    navigator.clipboard.writeText(url);
    toast.success("Enlace de la tienda copiado");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#EEF2F6] dark:border-slate-800 pb-6 mb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              Pedidos recientes
            </h2>
            <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mt-1">
              Últimas transacciones realizadas en tu tienda
            </p>
          </div>

          <Link to="/app/orders">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#EEF2F6] dark:border-slate-800 text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Ver todos <ChevronRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[#6B7280] dark:text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">Pedido</th>
                  <th className="pb-3 px-3">Cliente</th>
                  <th className="pb-3 px-3">Fecha</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F6]/60 dark:divide-slate-800/60">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#FAFBFC] dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-4 px-3 font-mono font-semibold text-[#111827] dark:text-slate-100">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-3 font-semibold text-[#111827] dark:text-slate-200">
                      {order.customer_name ?? "Cliente"}
                    </td>
                    <td className="py-4 px-3 text-[#6B7280] dark:text-slate-400">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "---"}
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight",
                          order.status === "completed" || order.status === "paid"
                            ? "bg-[#16A34A]/10 text-[#16A34A]"
                            : order.status === "cancelled"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {order.status === "paid"
                          ? "Pagado"
                          : order.status === "completed"
                            ? "Completado"
                            : order.status === "cancelled"
                              ? "Cancelado"
                              : "Pendiente"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right font-bold text-[#111827] dark:text-slate-100 tabular-nums">
                      ${Number(order.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State Elegante */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="size-20 text-[#6B7280]/30 dark:text-slate-600/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Todavía no tienes pedidos
            </h3>
            <p className="mt-1 max-w-sm text-xs font-medium text-[#6B7280] dark:text-slate-400">
              Comparte tu tienda en redes sociales y WhatsApp para recibir el primero.
            </p>
            <Button
              onClick={handleShare}
              size="sm"
              className="mt-5 gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 text-xs font-semibold shadow-xs"
            >
              <Share2 className="size-4" />
              Compartir tienda
            </Button>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// SEXTA SECCIÓN: Productos destacados
// ----------------------------------------------------------------------
function FeaturedProductsSection({
  products,
  navigate,
}: {
  products: FeaturedProduct[];
  navigate: any;
}) {
  const hasSales = products.some((p) => p.sales_count > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-[#EEF2F6] dark:border-slate-800 pb-6 mb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              Productos destacados
            </h2>
            <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400 mt-1">
              Top productos con mayor facturación y ventas
            </p>
          </div>

          <Link to="/app/products">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#EEF2F6] dark:border-slate-800 text-xs font-semibold text-[#111827] dark:text-slate-200"
            >
              Ver productos <ChevronRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {hasSales ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[#6B7280] dark:text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 px-3">Producto</th>
                  <th className="pb-3 px-3 text-center">Stock</th>
                  <th className="pb-3 px-3 text-center">Ventas</th>
                  <th className="pb-3 px-3 text-right">Ingresos generados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F6]/60 dark:divide-slate-800/60">
                {products
                  .filter((p) => p.sales_count > 0)
                  .map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-[#FAFBFC] dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAFBFC] dark:bg-slate-800 border border-[#EEF2F6] dark:border-slate-700 overflow-hidden">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="size-5 text-[#6B7280]" />
                            )}
                          </div>
                          <span className="font-semibold text-[#111827] dark:text-slate-100">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            product.stock > 5
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              : "bg-rose-500/10 text-rose-600",
                          )}
                        >
                          {product.stock} un.
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center font-bold text-[#111827] dark:text-slate-200">
                        {product.sales_count}
                      </td>
                      <td className="py-4 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                        ${product.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State Elegante */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="size-20 text-[#6B7280]/30 dark:text-slate-600/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Tus productos más vendidos aparecerán aquí
            </h3>
            <p className="mt-1 max-w-sm text-xs font-medium text-[#6B7280] dark:text-slate-400">
              Registra tu catálogo y concreta tus primeras ventas para visualizar los productos estrella.
            </p>
            <Button
              onClick={() => navigate({ to: "/app/products/new" })}
              size="sm"
              className="mt-5 gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 text-xs font-semibold shadow-xs"
            >
              <Plus className="size-4" />
              Agregar producto
            </Button>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// SÉPTIMA SECCIÓN: Insights automáticos
// ----------------------------------------------------------------------
function AutomaticInsightsSection({ stats }: { stats: any }) {
  const insights = useMemo(() => {
    const items: { text: string; category: string }[] = [];
    if (!stats) return items;

    if (stats.revenueChange !== 0) {
      items.push({
        text: `Los ingresos ${stats.revenueChange > 0 ? "crecieron" : "disminuyeron"} un ${Math.abs(stats.revenueChange).toFixed(1)}% en este período.`,
        category: "Facturación",
      });
    }

    if (stats.conversionRate > 0) {
      items.push({
        text: `Tu tasa de conversión actual es del ${stats.conversionRate.toFixed(1)}%.`,
        category: "Conversión",
      });
    }

    if (stats.avgOrder > 0) {
      items.push({
        text: `El ticket promedio es de $${stats.avgOrder.toFixed(2)}.`,
        category: "Ventas",
      });
    }

    if (stats.customersCount > 0) {
      items.push({
        text: `Tienes ${stats.customersCount} cliente${stats.customersCount > 1 ? "s" : ""} registrado${stats.customersCount > 1 ? "s" : ""}.`,
        category: "Retención",
      });
    }

    return items;
  }, [stats]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="rounded-[20px] border border-[#EEF2F6] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 border-b border-[#EEF2F6] dark:border-slate-800 pb-6 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
              Insights automáticos
            </h2>
            <p className="text-xs font-medium text-[#6B7280] dark:text-slate-400">
              Observaciones inteligentes sobre el comportamiento de tu negocio
            </p>
          </div>
        </div>

        {insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-2xl border border-[#EEF2F6] dark:border-slate-800 bg-[#FAFBFC] dark:bg-slate-800/40 p-4 transition-all"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[#2563EB] shadow-xs border border-[#EEF2F6] dark:border-slate-700">
                  <TrendingUp className="size-3.5 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    {item.category}
                  </span>
                  <p className="text-xs font-medium text-[#111827] dark:text-slate-200 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAFBFC] dark:bg-slate-800 text-[#6B7280]">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
              Aún no tenemos suficientes datos
            </h3>
            <p className="mt-1 max-w-sm text-xs font-medium text-[#6B7280] dark:text-slate-400">
              Continúa vendiendo para generar análisis inteligentes en tiempo real.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ----------------------------------------------------------------------
// SKELETON LOADING COMPONENT
// ----------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0B0F17] p-6 lg:p-10 space-y-[56px]">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-44 w-full rounded-[20px]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[20px]" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
      </div>
    </div>
  );
}

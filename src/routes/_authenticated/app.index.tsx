import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { activeBusiness } = useBusiness();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const bid = activeBusiness!.id;
      const [products, customers, orders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", bid),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", bid),
        supabase.from("orders").select("total,status").eq("business_id", bid),
      ]);
      const revenue = (orders.data ?? [])
        .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
        .reduce((s, o) => s + Number(o.total ?? 0), 0);
      return {
        products: products.count ?? 0,
        customers: customers.count ?? 0,
        orders: orders.data?.length ?? 0,
        revenue,
      };
    },
  });

  const cards = [
    { label: "Ingresos", value: `$${(stats?.revenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: "text-success" },
    { label: "Pedidos", value: stats?.orders ?? 0, icon: ShoppingCart, color: "text-primary" },
    { label: "Productos", value: stats?.products ?? 0, icon: Package, color: "text-accent-foreground" },
    { label: "Clientes", value: stats?.customers ?? 0, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title={activeBusiness ? `Hola, ${activeBusiness.name}` : "Dashboard"}
        description="Resumen de tu operación en tiempo real."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`size-4 ${c.color}`} />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base font-semibold">Próximos pasos</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <Step done={(stats?.products ?? 0) > 0} label="Agrega tus primeros productos" />
            <Step done={(stats?.customers ?? 0) > 0} label="Registra clientes o importa tu base" />
            <Step done={(stats?.orders ?? 0) > 0} label="Crea un pedido de prueba" />
            <Step done={false} label="Conecta Twilio WhatsApp (próximamente)" />
            <Step done={false} label="Configura tu primer agente IA (próximamente)" />
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="text-base font-semibold">Módulos activos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Estás en la Fase 1: Ecommerce + CRM. Las fases 2-5 (Inbox, IA, Automatizaciones) llegan en las próximas iteraciones.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${
          done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : "•"}
      </span>
      <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
    </li>
  );
}

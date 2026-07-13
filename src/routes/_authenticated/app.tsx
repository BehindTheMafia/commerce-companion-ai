import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BusinessProvider, useBusiness } from "@/lib/business-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Tag,
  Users,
  Zap,
  LogOut,
  Check,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <BusinessProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BusinessProvider>
  );
}

const nav = [
  { section: "Principal", items: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/orders", label: "Pedidos", icon: ShoppingCart },
    { to: "/app/customers", label: "Clientes", icon: Users },
  ] },
  { section: "Catálogo", items: [
    { to: "/app/products", label: "Productos", icon: Package },
    { to: "/app/categories", label: "Categorías", icon: Tag },
    { to: "/app/inventory", label: "Inventario", icon: Boxes },
  ] },
  { section: "Próximamente", items: [
    { to: "/app/inbox", label: "Inbox", icon: MessageSquare, soon: true },
    { to: "/app/agents", label: "Agentes IA", icon: Sparkles, soon: true },
    { to: "/app/automations", label: "Automatizaciones", icon: Zap, soon: true },
    { to: "/app/analytics", label: "Analytics", icon: BarChart3, soon: true },
  ] },
  { section: "Configuración", items: [
    { to: "/app/settings", label: "Ajustes", icon: Settings },
  ] },
] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/app" className="flex items-center gap-2 px-1 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Commerce AI</span>
              <span className="text-[10px] text-muted-foreground">Panel administrativo</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.section}>
            {!collapsed && <SidebarGroupLabel>{group.section}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to, "end" in item ? item.end : false)}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        {!collapsed && (
                          <span className="flex-1">
                            {item.label}
                            {"soon" in item && item.soon && (
                              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                                soon
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (collapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={signOut} tooltip="Cerrar sesión">
            <LogOut className="size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
      <div className="min-w-0 flex-1 truncate text-xs">
        <div className="truncate font-medium">{email || "Cargando..."}</div>
      </div>
      <Button size="icon" variant="ghost" className="size-7" onClick={signOut} aria-label="Salir">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
      <SidebarTrigger />
      <BusinessSwitcher />
      <div className="ml-auto" />
    </header>
  );
}

function BusinessSwitcher() {
  const { businesses, activeBusiness, setActiveBusinessId, loading, refetch } = useBusiness();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/-+/g, "-").slice(0, 30);
      let slug = base;
      for (let attempt = 0; attempt < 10; attempt++) {
        const testSlug = attempt === 0 ? base : `${base}-${attempt}`;
        const { data: existing } = await supabase.from("businesses").select("id").eq("slug", testSlug).maybeSingle();
        if (!existing) { slug = testSlug; break; }
      }
      const { data, error } = await supabase
        .from("businesses")
        .insert({ name, slug, created_by: userData.user.id })
        .select("id")
        .single();
      if (error) throw error;
      await refetch();
      setActiveBusinessId(data.id);
      toast.success("Empresa creada");
      setName("");
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creando empresa");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-xs text-muted-foreground">Cargando...</div>;

  if (!businesses.length) {
    return (
      <Dialog open={creating || !businesses.length} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea tu primera empresa</DialogTitle>
            <DialogDescription>
              Toda tu operación (productos, pedidos, clientes) vive dentro de una empresa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createBusiness} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Nombre</Label>
              <Input
                id="biz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Mi Tienda"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>Crear empresa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <div className="grid size-5 place-items-center rounded bg-primary/10 text-primary">
              <Sparkles className="size-3" />
            </div>
            {activeBusiness?.name ?? "Seleccionar empresa"}
            <ChevronsUpDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {businesses.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => {
                setActiveBusinessId(b.id);
                setOpen(false);
              }}
            >
              <div className="flex-1 truncate">{b.name}</div>
              {activeBusiness?.id === b.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus className="mr-2 size-4" /> Nueva empresa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={createBusiness} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="biz-name-2">Nombre</Label>
              <Input
                id="biz-name-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>Crear</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

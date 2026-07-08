import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">Commerce AI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Producto</a>
            <a href="#modules" className="hover:text-foreground">Módulos</a>
            <a href="#pricing" className="hover:text-foreground">Precios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Ingresar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Empezar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Ecommerce + CRM + IA Conversacional
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
          Vende, conversa y automatiza.{" "}
          <span className="text-muted-foreground">Todo en un solo lugar.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          La plataforma que unifica tu tienda online, WhatsApp, CRM y agentes de IA.
          Reemplaza Shopify + Intercom + Twilio Console con una experiencia nativa.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Crear cuenta gratis <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">Ver demo</Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShoppingBag,
              title: "Ecommerce moderno",
              desc: "Catálogo, inventario, pedidos y checkout listos desde el día uno.",
            },
            {
              icon: MessageSquare,
              title: "Inbox omnicanal",
              desc: "WhatsApp, Instagram, Messenger y email en una sola bandeja.",
            },
            {
              icon: Sparkles,
              title: "Agentes IA",
              desc: "Responde ventas y soporte automáticamente con IA entrenada en tu negocio.",
            },
            {
              icon: Users,
              title: "CRM inteligente",
              desc: "Perfil 360° del cliente con historial, valor estimado y sentimiento.",
            },
            {
              icon: Zap,
              title: "Automatizaciones",
              desc: "Constructor visual estilo n8n. Carrito abandonado, seguimientos y más.",
            },
            {
              icon: BarChart3,
              title: "Analytics en tiempo real",
              desc: "Métricas de ventas, conversión y desempeño de IA vs humanos.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-border bg-gradient-to-b from-secondary/40 to-transparent p-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Empieza a vender en minutos
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Crea tu cuenta, configura tu tienda y comienza a atender clientes con IA.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Empezar ahora <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Commerce AI Platform · Ecommerce + CRM + IA
      </footer>
    </div>
  );
}

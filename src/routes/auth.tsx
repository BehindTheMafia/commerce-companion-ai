import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTab,
  TabsPanels,
  TabsPanel,
} from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.session.user.id)
        .maybeSingle();
      window.location.href = profile?.onboarding_completed ? "/app" : "/onboarding";
    });
  }, []);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu email si es necesario.");
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.href = "/onboarding";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google");
      if (result.error) throw result.error;
      if (result.redirected) return;
      window.location.href = "/onboarding";
    } catch (err) {
      console.error("Google OAuth error:", err);
      toast.error(err instanceof Error ? err.message : "Error con Google");
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary/5 via-background to-accent/40 p-12 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">Commerce AI</span>
        </Link>
        <div>
          <blockquote className="text-2xl font-medium leading-snug tracking-tight text-foreground">
            "Reemplazamos 4 herramientas por una. Nuestro tiempo de respuesta bajó de horas a segundos con la IA."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Beta customer</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Ecommerce · CRM · Inbox · Agentes IA · Automatizaciones
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 shadow-sm overflow-hidden">
          <div className="p-6 pb-0 md:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </div>
              <span className="text-base font-semibold tracking-tight">Commerce AI</span>
            </Link>
          </div>

          <Tabs
            defaultValue="signin"
            onValueChange={(v) => setMode(v as "signin" | "signup")}
          >
            <div className="px-6 pt-4">
              <TabsList className="w-full">
                <TabsTab value="signin" className="flex-1">Ingresar</TabsTab>
                <TabsTab value="signup" className="flex-1">Registrarse</TabsTab>
              </TabsList>
            </div>

            <TabsPanels>
              <TabsPanel value="signin">
                <div className="p-6 pt-4">
                  <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ingresa a tu panel de Commerce AI.
                  </p>

                  <Button
                    onClick={handleGoogle}
                    variant="outline"
                    className="mt-6 w-full gap-2"
                    disabled={loading}
                  >
                    <GoogleIcon />
                    Continuar con Google
                  </Button>

                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={handleEmail} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="si-email">Email</Label>
                      <Input
                        id="si-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="tu@empresa.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="si-password">Contraseña</Label>
                      <Input
                        id="si-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Ingresar
                    </Button>
                  </form>
                </div>
              </TabsPanel>

              <TabsPanel value="signup">
                <div className="p-6 pt-4">
                  <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Empieza gratis en menos de un minuto.
                  </p>

                  <Button
                    onClick={handleGoogle}
                    variant="outline"
                    className="mt-6 w-full gap-2"
                    disabled={loading}
                  >
                    <GoogleIcon />
                    Continuar con Google
                  </Button>

                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={handleEmail} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Nombre completo</Label>
                      <Input
                        id="su-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Ana Martínez"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">Email</Label>
                      <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="tu@empresa.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-password">Contraseña</Label>
                      <Input
                        id="su-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Crear cuenta
                    </Button>
                  </form>
                </div>
              </TabsPanel>
            </TabsPanels>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Sparkles,
  Check,
  ChevronsUpDown,
  Globe,
  MapPin,
  Clock,
  DollarSign,
  Upload,
  LayoutDashboard,
  Package,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  X,
  BarChart3,
  Network,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { countries, detectCountry, detectTimezone, type Country } from "@/lib/countries";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";

const timezones: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Argentina/Buenos_Aires",
      "America/Bogota",
      "America/Caracas",
      "America/Costa_Rica",
      "America/El_Salvador",
      "America/Guatemala",
      "America/Havana",
      "America/La_Paz",
      "America/Lima",
      "America/Managua",
      "America/Mexico_City",
      "America/Montevideo",
      "America/Panama",
      "America/Santiago",
      "America/Sao_Paulo",
      "America/Tegucigalpa",
      "America/Toronto",
      "America/Vancouver",
      "Europe/London",
      "Europe/Madrid",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Africa/Cairo",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Pacific/Auckland",
      "UTC",
    ];
  }
})();

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

type OnboardingData = {
  fullName: string;
  email: string;
  businessName: string;
  slug: string;
  description: string;
  logoUrl: string;
  country: Country | null;
  currency: string;
  timezone: string;
  language: string;
  catalogOption: "manual" | "later" | null;
};

const emptyData: OnboardingData = {
  fullName: "",
  email: "",
  businessName: "",
  slug: "",
  description: "",
  logoUrl: "",
  country: null,
  currency: "USD",
  timezone: "",
  language: "es",
  catalogOption: null,
};

const HEADLINES = [
  {
    title: "Crea tu tienda online en minutos",
    desc: "Commerce AI te ayuda a vender en múltiples canales sin complicaciones técnicas.",
  },
  {
    title: "Tu negocio, tu identidad",
    desc: "Personaliza tu espacio con tu marca, colores y dominio propio.",
  },
  {
    title: "Vende donde tus clientes están",
    desc: "Configura moneda, idioma y región para una experiencia local auténtica.",
  },
  {
    title: "Productos que venden solos",
    desc: "Catálogos profesionales con fotos, variantes y descripciones que convierten.",
  },
];

const TIPS = [
  "Tu nombre se usará para personalizar tu experiencia en Commerce AI.",
  "Puedes cambiar el nombre del negocio en cualquier momento desde la configuración.",
  "Estos ajustes afectan cómo se muestran los precios, fechas y monedas en tu tienda.",
  "Puedes agregar productos más tarde desde el panel de administración.",
];

const ILLUSTRATIONS = [Sparkles, Globe, BarChart3, Network];

const CATALOG_OPTIONS = [
  {
    id: "manual" as const,
    label: "Agregar productos manualmente",
    icon: Package,
    desc: "Crea productos uno por uno con toda la información.",
  },
  {
    id: "later" as const,
    label: "Lo haré después",
    icon: X,
    desc: "Configura tu catálogo más tarde.",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(emptyData);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkAnim, setCheckAnim] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("onboarding-data");
      const savedStep = localStorage.getItem("onboarding-step");
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingData;
        setData({ ...emptyData, ...parsed });
      }
      if (savedStep) setStep(Number(savedStep));
    } catch {
      // local data corrupt or unavailable: start clean
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("onboarding-data", JSON.stringify(data));
      localStorage.setItem("onboarding-step", String(step));
    } catch {
      // storage full or unavailable: session persistence is best-effort
    }
  }, [data, step]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!sessionData.session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const user = sessionData.session.user;
      setData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.user_metadata?.full_name || "",
        email: user.email || "",
      }));
    });
  }, [navigate]);

  useEffect(() => {
    if (!data.country) {
      const detected = detectCountry();
      if (detected)
        setData((prev) => ({ ...prev, country: detected, currency: detected.currency }));
    }
    if (!data.timezone) setData((prev) => ({ ...prev, timezone: detectTimezone() }));
  }, []);

  useEffect(() => {
    if (step === 4) {
      setCheckAnim(true);
      setTimeout(() => setShowConfetti(true), 300);
    }
  }, [step]);

  async function checkSlug(s: string) {
    setSlugChecking(true);
    for (let attempt = 0; attempt < 10; attempt++) {
      const testSlug = attempt === 0 ? s : `${s}-${attempt}`;
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", testSlug)
        .maybeSingle();
      if (!existing) {
        setData((prev) => ({ ...prev, slug: testSlug }));
        setSlugAvailable(true);
        setSlugChecking(false);
        return;
      }
    }
    setSlugAvailable(false);
    setSlugChecking(false);
  }

  useEffect(() => {
    if (!data.businessName.trim()) {
      setData((prev) => ({ ...prev, slug: "" }));
      setSlugAvailable(null);
      return;
    }
    const base = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/-+/g, "-")
      .slice(0, 30);
    if (base.length < 3) {
      setData((prev) => ({ ...prev, slug: base }));
      setSlugAvailable(null);
      return;
    }
    setData((prev) => ({ ...prev, slug: base }));
    checkSlug(base);
  }, [data.businessName]);

  function canContinue() {
    switch (step) {
      case 0:
        return data.fullName.trim().length > 0;
      case 1:
        return (
          data.businessName.trim().length >= 2 && data.slug.length >= 3 && slugAvailable === true
        );
      case 2:
        return data.country !== null && data.currency.length > 0;
      case 3:
        return data.catalogOption !== null;
      case 4:
        return true;
      default:
        return false;
    }
  }

  const canGoBack = step > 0 && step < 4;

  function updateField<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  const domainPreview = useMemo(() => (data.slug ? `${data.slug}.commerce.ai` : ""), [data.slug]);

  async function finalizeAndNavigate(to: "/app" | "/app/products/new") {
    setBusy(true);
    try {
      const { data: uData, error: uError } = await supabase.auth.getUser();
      if (uError || !uData.user) throw new Error("No autenticado");
      const userId = uData.user.id;
      const { error: bizError } = await supabase
        .from("businesses")
        .insert({
          name: data.businessName.trim(),
          slug: data.slug,
          currency: data.currency,
          timezone: data.timezone || undefined,
          created_by: userId,
        })
        .select("id")
        .single();
      if (bizError) throw bizError;
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: data.fullName.trim(),
        email: data.email,
        onboarding_completed: true,
      } as never);
      localStorage.removeItem("onboarding-data");
      localStorage.removeItem("onboarding-step");
      toast.success("¡Tu espacio de trabajo está listo!");
      navigate({ to });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el espacio de trabajo");
      setBusy(false);
    }
  }

  if (step === 4) {
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center bg-background px-6 py-12 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/10 mix-blend-multiply filter blur-3xl opacity-60" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-accent/20 mix-blend-multiply filter blur-3xl opacity-60" />

        {showConfetti && (
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  backgroundColor: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"][i % 5],
                  animation: `confetti ${2 + Math.random() * 3}s ${Math.random() * 2}s both`,
                  width: `${4 + Math.random() * 6}px`,
                  height: `${4 + Math.random() * 6}px`,
                }}
              />
            ))}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(16px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex flex-col items-center text-center relative z-10"
        >
          <div className="mb-6 grid size-20 place-items-center rounded-full bg-success/10 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0, filter: "blur(8px)" }}
              animate={checkAnim ? { scale: 1, filter: "blur(0px)", rotate: [0, -10, 5, 0] } : {}}
              transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              className="grid size-14 place-items-center rounded-full bg-success shadow-lg shadow-success/20"
            >
              <Check className="size-7 text-white" />
            </motion.div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">¡Todo listo!</h1>
          <p className="text-base text-muted-foreground/80 mb-10 max-w-md">
            Tu espacio de trabajo ya está preparado. ¿Qué quieres hacer primero?
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 min-w-48 rounded-xl gap-2 text-base font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
              disabled={busy}
              onClick={() => finalizeAndNavigate("/app")}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LayoutDashboard className="size-4" />
              )}
              {busy ? "Creando..." : "Ir al Dashboard"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 min-w-48 rounded-xl gap-2 text-base font-medium transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              disabled={busy}
              onClick={() => finalizeAndNavigate("/app/products/new")}
            >
              <Package className="size-4" /> Agregar mi primer producto
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <VisualPanel
        step={step}
        data={data}
        domainPreview={domainPreview}
        slugAvailable={slugAvailable}
        slugChecking={slugChecking}
      />

      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 px-6 py-4 backdrop-blur-md lg:hidden">
        <MobileHeader step={step} />
      </div>

      <main className="relative flex flex-1 flex-col items-center justify-start pt-6 pb-12 px-6 lg:justify-center lg:py-12 overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/5 filter blur-3xl opacity-60" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-accent/10 filter blur-3xl opacity-60" />

        <div className="w-full max-w-[560px] relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {step === 0 && <WelcomeStep data={data} updateField={updateField} />}
              {step === 1 && (
                <BusinessStep
                  data={data}
                  updateField={updateField}
                  slugAvailable={slugAvailable}
                  slugChecking={slugChecking}
                  domainPreview={domainPreview}
                />
              )}
              {step === 2 && (
                <RegionalStep
                  data={data}
                  updateField={updateField}
                  countryOpen={countryOpen}
                  setCountryOpen={setCountryOpen}
                  tzOpen={tzOpen}
                  setTzOpen={setTzOpen}
                />
              )}
              {step === 3 && <CatalogStep data={data} updateField={updateField} />}
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-10 flex items-center justify-between"
          >
            <div>
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => s - 1)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" /> Atrás
                </Button>
              )}
            </div>
            <Button
              onClick={() => {
                if (canContinue() && step < 4) setStep((s) => s + 1);
              }}
              disabled={!canContinue()}
              className="h-12 min-w-36 rounded-xl gap-2 text-base font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
              style={{ transitionTimingFunction: "cubic-bezier(.22,.61,.36,1)" }}
            >
              Continuar <ArrowRight className="size-4" />
            </Button>
          </motion.div>

          <div className="hidden">
            <MobileTip tip={TIPS[step]} />
          </div>
        </div>
      </main>
    </div>
  );
}

function VisualPanel({
  step,
  data,
  domainPreview,
  slugAvailable,
  slugChecking,
}: {
  step: number;
  data: OnboardingData;
  domainPreview: string;
  slugAvailable: boolean | null;
  slugChecking: boolean;
}) {
  const circlesRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (circlesRef.current) {
        gsap.to(circlesRef.current.children, {
          y: -20,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
          stagger: 0.4,
        });
      }
      if (heroRef.current) {
        gsap.to(heroRef.current, {
          y: -6,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  const IllustrationIcon = ILLUSTRATIONS[step];

  return (
    <aside className="relative hidden w-full flex-col overflow-hidden bg-gradient-to-br from-[#0f1b3d] via-[#162a5e] to-[#1a3370] lg:flex lg:w-1/2 lg:min-h-dvh">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_20%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_80%,rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9InJnYigyNTUsMjU1LDI1NSkiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] bg-repeat" />

      <div ref={circlesRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 size-72 rounded-full bg-blue-500/10 blur-[80px]" />
        <div className="absolute -right-10 top-1/3 size-56 rounded-full bg-indigo-500/10 blur-[70px]" />
        <div className="absolute bottom-1/4 left-1/3 size-48 rounded-full bg-blue-400/8 blur-[60px]" />
        <div className="absolute -bottom-10 -right-10 size-64 rounded-full bg-indigo-400/10 blur-[90px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col p-8 lg:p-12">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-white/10 text-white shadow-sm backdrop-blur-sm">
            <Sparkles className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white/90">Commerce AI</span>
        </div>

        <div className="mt-2 hidden lg:block">
          <ProgressDots step={step} />
        </div>

        <div className="mt-auto flex flex-col gap-6 lg:gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="space-y-3"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl leading-tight">
                {HEADLINES[step].title}
              </h2>
              <p className="text-sm leading-relaxed text-blue-200/70 lg:text-base max-w-md">
                {HEADLINES[step].desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
              ref={heroRef}
              className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl overflow-hidden"
            >
              {step === 1 && data.businessName ? (
                <div className="p-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/50">
                    Vista previa del espacio
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-white/10 text-white font-bold text-sm shrink-0 shadow-inner">
                      {data.businessName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate">
                        {data.businessName}
                      </p>
                      {data.country && (
                        <p className="text-sm text-blue-200/60">
                          {data.country.flag} {data.country.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {domainPreview && (
                    <div className="flex items-center gap-2 text-sm text-blue-200/50">
                      <Globe className="size-3.5" />
                      <span className="truncate">{domainPreview}</span>
                      {slugChecking ? (
                        <Loader2 className="size-3.5 animate-spin shrink-0" />
                      ) : slugAvailable === true ? (
                        <Check className="size-3.5 text-green-400 shrink-0" />
                      ) : slugAvailable === false ? (
                        <span className="text-red-400 shrink-0 text-[10px]">No disponible</span>
                      ) : null}
                    </div>
                  )}
                  {data.currency && (
                    <div className="flex items-center gap-2 text-sm text-blue-200/50">
                      <DollarSign className="size-3.5" />
                      <span>{data.currency}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center lg:h-56">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="grid size-16 place-items-center rounded-2xl bg-white/5 text-blue-300/40">
                      <IllustrationIcon className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white/40">Vista previa</p>
                      <p className="text-xs text-blue-200/30 max-w-[220px]">
                        Esta área mostrará una ilustración de {HEADLINES[step].title.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="hidden lg:block">
            {TIPS[step] && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(6px)" }}
                  transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/40 mb-1">
                    Consejo
                  </p>
                  <p className="text-sm text-blue-200/60 leading-relaxed">{TIPS[step]}</p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="mt-8 hidden lg:block">
          <p className="text-xs text-blue-300/40">Paso {step + 1} de 4</p>
        </div>
      </div>
    </aside>
  );
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-0">
          <div
            className={cn(
              "rounded-full transition-all duration-500",
              i <= step ? "bg-white" : "bg-white/15",
              i === step ? "size-2.5 ring-2 ring-white/30" : "size-2",
            )}
            style={{ transitionTimingFunction: "cubic-bezier(.22,.61,.36,1)" }}
          />
        </div>
      ))}
    </div>
  );
}

function MobileHeader({ step }: { step: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Commerce AI</span>
        <span className="ml-auto text-xs text-muted-foreground">{step + 1} / 4</span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i <= step ? "var(--color-primary)" : "var(--color-border)",
              transitionTimingFunction: "cubic-bezier(.22,.61,.36,1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MobileTip({ tip }: { tip: string }) {
  if (!tip) return null;
  return (
    <div className="rounded-xl bg-muted/50 border px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
        Consejo
      </p>
      <p className="text-sm text-muted-foreground/80 leading-relaxed">{tip}</p>
    </div>
  );
}

function WelcomeStep({
  data,
  updateField,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Bienvenido</h1>
        <p className="hidden lg:block text-base text-muted-foreground/80 leading-relaxed">
          Comencemos configurando tu espacio de trabajo.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Nombre completo
          </Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            placeholder="Tu nombre"
            required
            autoFocus
            className="h-12 text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Correo electrónico
          </Label>
          <Input
            id="email"
            value={data.email}
            readOnly
            className="h-12 text-base bg-muted/30 text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Correo asociado a tu cuenta.</p>
        </div>
      </div>
    </div>
  );
}

function BusinessStep({
  data,
  updateField,
  slugAvailable,
  slugChecking,
  domainPreview,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void;
  slugAvailable: boolean | null;
  slugChecking: boolean;
  domainPreview: string;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          Información del negocio
        </h1>
        <p className="hidden lg:block text-base text-muted-foreground/80 leading-relaxed">
          Cuéntanos sobre tu negocio.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-sm font-medium">
            Nombre del negocio
          </Label>
          <Input
            id="businessName"
            value={data.businessName}
            onChange={(e) => updateField("businessName", e.target.value)}
            placeholder="Ej: Benclaus Store"
            required
            autoFocus
            className="h-12 text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug" className="text-sm font-medium">
            Subdominio
          </Label>
          <div className="relative">
            <Input
              id="slug"
              value={data.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              required
              minLength={3}
              className={cn(
                "h-12 text-base pr-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20",
                slugAvailable === true && "border-success/60",
                slugAvailable === false && "border-destructive/60",
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugChecking ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : slugAvailable === true ? (
                <Check className="size-5 text-success" />
              ) : slugAvailable === false ? (
                <span className="text-[11px] font-medium text-destructive">Ocupado</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {domainPreview || "commerce.ai/tu-tienda"}
            </p>
            {slugAvailable === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                <Check className="size-2.5" /> Disponible
              </span>
            )}
            {slugAvailable === false && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                No disponible
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc" className="text-sm font-medium">
            Descripción corta <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="desc"
            value={data.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe tu negocio en una línea..."
            rows={2}
            className="resize-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Logo <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              <div className="relative">
                <img
                  src={data.logoUrl}
                  alt="logo"
                  className="size-16 rounded-xl object-cover border"
                />
                <button
                  type="button"
                  onClick={() => updateField("logoUrl", "")}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border bg-background shadow-sm hover:text-destructive transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <div className="grid size-16 place-items-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground">
                <ImageIcon className="size-6" />
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-2 text-xs" asChild>
              <label>
                <Upload className="size-3.5" /> Subir logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = (ev) => {
                        if (typeof ev.target?.result === "string")
                          updateField("logoUrl", ev.target.result);
                      };
                      r.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionalStep({
  data,
  updateField,
  countryOpen,
  setCountryOpen,
  tzOpen,
  setTzOpen,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void;
  countryOpen: boolean;
  setCountryOpen: (v: boolean) => void;
  tzOpen: boolean;
  setTzOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          Configuración regional
        </h1>
        <p className="hidden lg:block text-base text-muted-foreground/80 leading-relaxed">
          Personaliza tu configuración regional.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">País</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={countryOpen}
                className="h-12 w-full justify-between text-left font-normal text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                {data.country ? (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{data.country.flag}</span>
                    <span>{data.country.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Selecciona un país</span>
                )}
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar país..." />
                <CommandList>
                  <CommandEmpty>No se encontró el país</CommandEmpty>
                  <CommandGroup>
                    {countries.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={c.name}
                        onSelect={() => {
                          updateField("country", c);
                          updateField("currency", c.currency);
                          setCountryOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                        <Check
                          className={cn(
                            "ml-auto size-4",
                            data.country?.code === c.code ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-currency" className="text-sm font-medium">
            Moneda
          </Label>
          <Select value={data.currency} onValueChange={(v) => updateField("currency", v)}>
            <SelectTrigger
              id="p-currency"
              className="h-12 text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <SelectValue placeholder="Selecciona una moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NIO">
                <span className="flex items-center gap-2">
                  <span>Córdoba (NIO) — C$</span>
                </span>
              </SelectItem>
              <SelectItem value="USD">
                <span className="flex items-center gap-2">
                  <span>Dólar USD ($)</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tus productos pueden mostrar precios en ambas monedas.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-tz" className="text-sm font-medium">
            Zona horaria
          </Label>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tzOpen}
                id="p-tz"
                className="h-12 w-full justify-between text-left font-normal text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <span className={cn(!data.timezone && "text-muted-foreground")}>
                  {data.timezone || "Selecciona una zona horaria"}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar zona horaria..." />
                <CommandList>
                  <CommandEmpty>No se encontró la zona horaria</CommandEmpty>
                  <CommandGroup>
                    {timezones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        onSelect={(v) => {
                          updateField("timezone", v);
                          setTzOpen(false);
                        }}
                      >
                        <span>{tz}</span>
                        <Check
                          className={cn(
                            "ml-auto size-4",
                            data.timezone === tz ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-lang" className="text-sm font-medium">
            Idioma
          </Label>
          <Select value={data.language} onValueChange={(v) => updateField("language", v)}>
            <SelectTrigger
              id="p-lang"
              className="h-12 text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function CatalogStep({
  data,
  updateField,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Catálogo</h1>
        <p className="hidden lg:block text-base text-muted-foreground/80 leading-relaxed">
          ¿Cómo quieres empezar?
        </p>
      </div>
      <div className="space-y-3">
        {CATALOG_OPTIONS.map((opt) => {
          const selected = data.catalogOption === opt.id;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              onClick={() => updateField("catalogOption", opt.id)}
              className={cn(
                "group relative flex w-full items-start gap-4 rounded-xl border p-5 text-left backdrop-blur-sm transition-all duration-300",
                selected
                  ? "border-primary/60 bg-primary/[0.04] shadow-md shadow-primary/10 ring-1 ring-primary/20"
                  : "border-border/60 bg-card hover:border-border hover:shadow-sm",
              )}
            >
              <div
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl transition-all duration-300",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors duration-200",
                      selected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </p>
                  {selected && <Check className="size-4 text-primary shrink-0" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground/70">{opt.desc}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

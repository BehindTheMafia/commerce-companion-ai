import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, ChevronsUpDown, Globe, Building2, MapPin, Clock, DollarSign, Hash, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  countries,
  detectCountry,
  detectTimezone,
  type Country,
} from "@/lib/countries";
import gsap from "gsap";

const timezones: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "America/Argentina/Buenos_Aires", "America/Bogota", "America/Caracas",
      "America/Costa_Rica", "America/El_Salvador", "America/Guatemala",
      "America/Havana", "America/La_Paz", "America/Lima", "America/Managua",
      "America/Mexico_City", "America/Montevideo", "America/Panama",
      "America/Santiago", "America/Sao_Paulo", "America/Tegucigalpa",
      "America/Toronto", "America/Vancouver", "Europe/London", "Europe/Madrid",
      "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Africa/Cairo",
      "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Asia/Kolkata",
      "Australia/Sydney", "Pacific/Auckland", "UTC",
    ];
  }
})();

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [country, setCountry] = useState<Country | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("");
  const [referral, setReferral] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement[]>([]);
  const buttonRef = useRef<HTMLDivElement>(null);
  const bgGlowRef = useRef<HTMLDivElement>(null);
  const bgAccentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ease = "cubic-bezier(.22,.61,.36,1)";
    const ctx = gsap.context(() => {
      gsap.to(bgGlowRef.current, {
        scale: 1.15,
        opacity: 0.6,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
      gsap.to(bgAccentRef.current, {
        scale: 1.2,
        opacity: 0.5,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        delay: 1,
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const user = data.session.user;
      const metaName = user.user_metadata?.full_name;
      if (metaName) setFullName(metaName);
    });
  }, [navigate]);

  useEffect(() => {
    const detected = detectCountry();
    if (detected) {
      setCountry(detected);
      setCurrency(detected.currency);
    }
    setTimezone(detectTimezone());
  }, []);

  useEffect(() => {
    const ease = "cubic-bezier(.22,.61,.36,1)";

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease } });

      tl.fromTo(iconRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5 })
        .fromTo(stepRef.current, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.2")
        .fromTo(cardRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.15")
        .fromTo(headerRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.3")
        .fromTo(
          fieldsRef.current.filter(Boolean),
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.07 },
          "-=0.2",
        )
        .fromTo(buttonRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, "-=0.15");
    });

    return () => ctx.revert();
  }, []);

  async function checkSlug(s: string) {
    setSlugChecking(true);
    let candidate = s;
    for (let attempt = 0; attempt < 10; attempt++) {
      const testSlug = attempt === 0 ? candidate : `${candidate}-${attempt}`;
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", testSlug)
        .maybeSingle();
      if (!data) {
        setSlug(testSlug);
        setSlugAvailable(true);
        setSlugChecking(false);
        return;
      }
    }
    setSlugAvailable(false);
    setSlugChecking(false);
  }

  useEffect(() => {
    if (!businessName.trim()) {
      setSlug("");
      setSlugAvailable(null);
      return;
    }
    const base = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/-+/g, "-")
      .slice(0, 30);
    if (base.length < 3) {
      setSlug(base);
      setSlugAvailable(null);
      return;
    }
    setSlug(base);
    checkSlug(base);
  }, [businessName]);

  function canContinue(): boolean {
    return (
      fullName.trim().length > 0 &&
      businessName.trim().length > 0 &&
      slug.length >= 3 &&
      slugAvailable === true &&
      country !== null
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue()) return;
    setBusy(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("No autenticado");

      const userId = userData.user.id;

      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .insert({
          name: businessName.trim(),
          slug,
          currency,
          timezone,
          created_by: userId,
        })
        .select("id, slug")
        .single();
      if (bizError) throw bizError;

      await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        email: userData.user.email,
        onboarding_completed: true,
      } as never);

      toast.success("¡Tu espacio de trabajo está listo!");
      window.location.href = "/app";
    } catch (err) {
      console.error("Onboarding error:", err);
      toast.error(err instanceof Error ? err.message : "Error al crear el espacio de trabajo");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.08,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,var(--color-accent)/0.06,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_20%_50%,var(--color-primary)/0.04,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_50%,var(--color-accent)/0.03,transparent_50%)]" />
      <div
        ref={bgGlowRef}
        className="absolute left-1/2 top-1/3 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        ref={bgAccentRef}
        className="absolute right-0 top-2/3 size-[400px] translate-x-1/3 rounded-full bg-accent/5 blur-[100px]"
      />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9InZhcigtLWNvbG9yLXByaW1hcnkpIiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] bg-repeat opacity-50" />

      <div className="relative w-full max-w-lg">
        <div ref={iconRef} className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/10">
            <Sparkles className="size-6" />
          </div>
        </div>

        <div ref={stepRef} className="mb-8">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm">
                <Check className="size-4" />
              </div>
              <div className="h-px w-10 bg-border" />
            </div>
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm">
                2
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-center text-xs text-muted-foreground/70 font-medium tracking-wide uppercase">Paso 2 de 2</p>
        </div>

        <div
          ref={cardRef}
          className="rounded-2xl border border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/5"
        >
          <div ref={headerRef} className="space-y-1.5 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Cuéntanos sobre tu negocio
            </h1>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              Configura tu espacio de trabajo para personalizar tu experiencia.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div ref={(el) => { if (el) fieldsRef.current[0] = el; }}>
              <FloatingInput
                id="fullName"
                label="Nombre completo"
                icon={<Building2 className="size-3.5" />}
                value={fullName}
                onChange={setFullName}
                required
                autoFocus
              />
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[1] = el; }}>
              <FloatingInput
                id="businessName"
                label="Nombre del negocio"
                icon={<Globe className="size-3.5" />}
                value={businessName}
                onChange={setBusinessName}
                required
              />
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[2] = el; }}>
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                  <Hash className="size-3.5" />
                  URL del espacio
                </Label>
                <div className="relative">
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    minLength={3}
                    className={cn(
                      "h-10 pr-8 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
                      slugAvailable === true && "border-success/60",
                      slugAvailable === false && "border-destructive/60",
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugChecking ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : slugAvailable === true ? (
                      <Check className="size-4 text-success" />
                    ) : slugAvailable === false ? (
                      <span className="text-[10px] font-medium text-destructive">Ocupado</span>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  {slug ? `tudominio.com/go/${slug}` : "Se genera automáticamente del nombre"}
                </p>
                {slugAvailable === false && (
                  <p className="text-xs text-destructive">Esta URL ya está en uso</p>
                )}
              </div>
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[3] = el; }}>
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                  <MapPin className="size-3.5" />
                  País
                </Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="h-10 w-full justify-between text-left font-normal transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
                    >
                      {country ? (
                        <span className="flex items-center gap-2">
                          <span className="text-base">{country.flag}</span>
                          <span>{country.name}</span>
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
                                setCountry(c);
                                setCurrency(c.currency);
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
                                  country?.code === c.code ? "opacity-100" : "opacity-0",
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
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[4] = el; }}>
              <div className="space-y-1.5">
                <Label htmlFor="p-currency" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                  <DollarSign className="size-3.5" />
                  Moneda
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="p-currency" className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50">
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
                <p className="text-xs text-muted-foreground/60">
                  Tus productos pueden mostrar precios en ambas monedas
                </p>
              </div>
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[5] = el; }}>
              <div className="space-y-1.5">
                <Label htmlFor="p-tz" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                  <Clock className="size-3.5" />
                  Zona horaria
                </Label>
                <Popover open={tzOpen} onOpenChange={setTzOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tzOpen}
                      id="p-tz"
                      className="h-10 w-full justify-between text-left font-normal transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
                    >
                      <span className={cn(!timezone && "text-muted-foreground")}>
                        {timezone || "Selecciona una zona horaria"}
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
                                setTimezone(v);
                                setTzOpen(false);
                              }}
                            >
                              <span>{tz}</span>
                              <Check
                                className={cn(
                                  "ml-auto size-4",
                                  timezone === tz ? "opacity-100" : "opacity-0",
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
            </div>

            <div ref={(el) => { if (el) fieldsRef.current[6] = el; }}>
              <FloatingInput
                id="referral"
                label="Código de referido (opcional)"
                icon={<Gift className="size-3.5" />}
                value={referral}
                onChange={setReferral}
              />
            </div>

            <div ref={buttonRef}>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97] ease-[cubic-bezier(.22,.61,.36,1)]"
                disabled={!canContinue() || busy}
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {busy ? "Creando..." : "Crear espacio de trabajo"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FloatingInput({
  id,
  label,
  icon,
  value,
  onChange,
  required,
  autoFocus,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
        {icon}
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
      />
    </div>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  countries,
  detectCountry,
  detectTimezone,
  type Country,
} from "@/lib/countries";
import { getSubdomainUrl } from "@/lib/subdomain";

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
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("");
  const [referral, setReferral] = useState("");

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/[0.03] via-background to-accent/30 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="size-6" />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm font-medium transition-all duration-500",
                    s === 1
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {s}
                </div>
                {s < 2 && <div className="h-px w-12 bg-border" />}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Step 2 of 2</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
          <div className="space-y-1.5 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              Tell us about your business
            </h1>
            <p className="text-sm text-muted-foreground">
              Let's finish setting up your workspace. This helps us personalize your experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FloatingInput
              id="fullName"
              label="Full Name"
              value={fullName}
              onChange={setFullName}
              required
              autoFocus
            />

            <FloatingInput
              id="businessName"
              label="Business Name"
              value={businessName}
              onChange={setBusinessName}
              required
            />

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs font-medium text-muted-foreground">
                Workspace URL
              </Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  minLength={3}
                  className={cn(
                    "pr-8",
                    slugAvailable === true && "border-success",
                    slugAvailable === false && "border-destructive",
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugChecking ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : slugAvailable === true ? (
                    <Check className="size-4 text-success" />
                  ) : slugAvailable === false ? (
                    <span className="text-[10px] font-medium text-destructive">Taken</span>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {slug ? getSubdomainUrl(slug) : "Auto-generated from business name"}
              </p>
              {slugAvailable === false && (
                <p className="text-xs text-destructive">This URL is already taken</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Country</Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="w-full justify-between text-left font-normal"
                  >
                    {country ? (
                      <span className="flex items-center gap-2">
                        <span className="text-base">{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select a country</span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found</CommandEmpty>
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

            <FloatingInput
              id="currency"
              label="Currency"
              value={currency}
              onChange={setCurrency}
              required
            />

            <FloatingInput
              id="timezone"
              label="Time Zone"
              value={timezone}
              onChange={setTimezone}
              required
            />

            <FloatingInput
              id="referral"
              label="Referral Code (optional)"
              value={referral}
              onChange={setReferral}
            />

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-medium"
              disabled={!canContinue() || busy}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  required,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
      />
    </div>
  );
}
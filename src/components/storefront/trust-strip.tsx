import { Truck, Headphones, Lock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { getWhatsAppLink } from "@/lib/whatsapp";
import type { Business } from "@/types/storefront";

const BENEFIT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  shield: Lock,
  truck: Truck,
  headset: Headphones,
  refresh: Lock,
  lock: Lock,
  gift: Gift,
};

const TONES: Record<string, { bg: string; text: string }> = {
  shipping: { bg: "bg-blue-50", text: "text-blue-600" },
  whatsapp: { bg: "bg-[#25D366]/10", text: "text-[#128C7E]" },
  shield: { bg: "bg-green-50", text: "text-green-600" },
  truck: { bg: "bg-blue-50", text: "text-blue-600" },
  headset: { bg: "bg-[#25D366]/10", text: "text-[#128C7E]" },
  lock: { bg: "bg-foreground/[0.06]", text: "text-foreground" },
  gift: { bg: "bg-foreground/[0.06]", text: "text-foreground" },
};

const DEFAULT_TONE = { bg: "bg-foreground/[0.06]", text: "text-foreground" };

type TrustStripProps = {
  business: Business | null | undefined;
  currencySymbol?: string;
};

export function TrustStrip({ business, currencySymbol = "$" }: TrustStripProps) {
  const settings = useStoreSettings(business);
  const shippingEnabled = settings.shipping.enabled || Boolean(settings.shipping.banner_text);
  const freeThreshold = settings.shipping.free_threshold;
  const waPhone = business?.whatsapp_phone ?? null;
  const configuredBenefits = settings.benefits.filter((b) => b.enabled).slice(0, 2);

  const items: {
    key: string;
    tone: { bg: string; text: string };
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    subtitle?: string;
    href?: string;
  }[] = [];

  if (shippingEnabled) {
    items.push({
      key: "shipping",
      tone: TONES.shipping,
      icon: Truck,
      label: "Envío",
      subtitle: freeThreshold
        ? `Gratis desde ${currencySymbol}${freeThreshold.toFixed(2)}`
        : "A todo el país",
    });
  }

  if (waPhone) {
    items.push({
      key: "whatsapp",
      tone: TONES.whatsapp,
      icon: Headphones,
      label: "Atención personalizada",
      subtitle: "Soporte directo",
      href: getWhatsAppLink(waPhone, "Hola, quisiera más información sobre sus productos."),
    });
  }

  for (const benefit of configuredBenefits) {
    const Icon = BENEFIT_ICONS[benefit.icon] ?? Gift;
    items.push({
      key: benefit.label,
      tone: TONES[benefit.icon] ?? DEFAULT_TONE,
      icon: Icon,
      label: benefit.label,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="border-y border-border/40 bg-white py-12">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-4 gap-y-10 px-5 md:grid-cols-4 md:px-8 lg:px-12">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="flex w-full flex-col items-center px-2 text-center">
              <span
                className={cn(
                  "grid size-12 place-items-center rounded-full",
                  item.tone.bg,
                  item.tone.text,
                )}
              >
                <Icon className="size-6" strokeWidth={2} />
              </span>
              <h4 className="mt-4 font-semibold text-foreground">{item.label}</h4>
              {item.subtitle && (
                <p className="mt-0.5 text-sm text-muted-foreground">{item.subtitle}</p>
              )}
            </div>
          );
          return item.href ? (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center transition-transform hover:-translate-y-0.5"
            >
              {content}
            </a>
          ) : (
            <div key={item.key} className="flex justify-center">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

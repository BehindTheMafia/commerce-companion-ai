import { Truck, Headphones, Lock, Gift } from "lucide-react";
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
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    href?: string;
  }[] = [];

  if (shippingEnabled) {
    items.push({
      key: "shipping",
      icon: Truck,
      label: freeThreshold
        ? `Envío gratis desde ${currencySymbol}${freeThreshold.toFixed(2)}`
        : "Envíos disponibles",
    });
  }

  if (waPhone) {
    items.push({
      key: "whatsapp",
      icon: Headphones,
      label: "Soporte por WhatsApp",
      href: getWhatsAppLink(waPhone, "Hola, quisiera más información sobre sus productos."),
    });
  }

  for (const benefit of configuredBenefits) {
    const Icon = BENEFIT_ICONS[benefit.icon] ?? Gift;
    items.push({ key: benefit.label, icon: Icon, label: benefit.label });
  }

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/40 bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-4 lg:px-8">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="grid size-8 place-items-center rounded-full bg-background text-primary ring-1 ring-border/60">
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              {item.label}
            </span>
          );
          return item.href ? (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {content}
            </a>
          ) : (
            <span key={item.key} className="transition-colors">
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}

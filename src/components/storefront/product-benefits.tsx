import type { ProductBenefit } from "@/types/storefront";
import { ShieldCheck, Truck, Headphones, RefreshCw, Lock, Gift } from "lucide-react";

const BENEFIT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  shield: ShieldCheck,
  truck: Truck,
  headset: Headphones,
  refresh: RefreshCw,
  lock: Lock,
  gift: Gift,
};

type ProductBenefitsProps = {
  benefits: ProductBenefit[];
};

export function ProductBenefits({ benefits }: ProductBenefitsProps) {
  const enabled = benefits.filter((b) => b.enabled);
  if (enabled.length === 0) return null;

  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {enabled.map((benefit, i) => {
        const Icon = BENEFIT_ICONS[benefit.icon];
        return (
          <div
            key={i}
            className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-4 py-2 text-xs text-muted-foreground"
          >
            {Icon && <Icon className="size-3.5" strokeWidth={1.5} />}
            <span>{benefit.label}</span>
          </div>
        );
      })}
    </div>
  );
}

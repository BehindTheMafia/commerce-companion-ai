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
    <div className="grid grid-cols-2 gap-4 mt-8">
      {enabled.map((benefit, i) => {
        const Icon = BENEFIT_ICONS[benefit.icon];
        return (
          <div
            key={i}
            className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-[16px] p-4 flex gap-4 items-start group hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
          >
            <div className="bg-white border border-[#E5E7EB] w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
              {Icon && <Icon className="text-[#111827] size-[18px]" strokeWidth={1.5} />}
            </div>
            <div>
              <h4 className="font-bold text-[#111827] text-sm mb-1">{benefit.label}</h4>
            </div>
          </div>
        );
      })}
    </div>
  );
}

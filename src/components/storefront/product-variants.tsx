import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/storefront";

type ProductVariantsProps = {
  variants: ProductVariant[];
  selected: Record<string, string>;
  onChange: (type: string, valueId: string) => void;
};

export function ProductVariants({ variants, selected, onChange }: ProductVariantsProps) {
  const enabled = useMemo(
    () => variants.filter((v) => v.values.some((val) => val.available)),
    [variants],
  );

  if (enabled.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {enabled.map((variant) => {
        const currentVal = variant.values.find((v) => v.id === selected[variant.type]);
        return (
          <div key={variant.id} className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-bold uppercase tracking-wider text-[#111827]">
                {variant.name}
              </label>
              <span className="text-[13px] font-semibold text-[#6B7280]">
                {currentVal?.label ?? ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {variant.values.map((val) => {
                const isSelected = selected[variant.type] === val.id;
                return (
                  <button
                    key={val.id}
                    onClick={() => onChange(variant.type, val.id)}
                    disabled={!val.available}
                    className={cn(
                      "py-2.5 px-6 rounded-[12px] text-sm font-semibold transition-all duration-300 ease-out border",
                      isSelected
                        ? "border-[#111827] bg-[#111827] text-white shadow-md"
                        : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#111827] hover:text-[#111827]",
                      !val.available && "opacity-30 cursor-not-allowed line-through",
                    )}
                    aria-pressed={isSelected}
                    aria-label={`${variant.name}: ${val.label}`}
                  >
                    {val.image_url && (
                      <img
                        src={val.image_url}
                        alt=""
                        className="inline-block size-5 rounded-[6px] object-cover mr-2 -ml-1"
                      />
                    )}
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

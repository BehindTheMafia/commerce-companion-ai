import { cn } from "@/lib/utils";
import type { ProductVariant, ProductVariantValue } from "@/types/storefront";

type ProductVariantsProps = {
  variants: ProductVariant[];
  selected: Record<string, string>;
  onChange: (type: string, valueId: string) => void;
};

export function ProductVariants({ variants, selected, onChange }: ProductVariantsProps) {
  const enabled = variants.filter((v) => v.values.some((val) => val.available));

  if (enabled.length === 0) return null;

  return (
    <div className="mt-6 space-y-5">
      {enabled.map((variant) => (
        <div key={variant.id}>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground mb-3 block">
            {variant.name}
          </span>
          <div className="flex flex-wrap gap-2">
            {variant.values.map((val) => {
              const isSelected = selected[variant.type] === val.id;
              return (
                <button
                  key={val.id}
                  onClick={() => onChange(variant.type, val.id)}
                  disabled={!val.available}
                  className={cn(
                    "min-h-[44px] px-5 rounded-full text-sm font-medium transition-all duration-200 border-2",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    !val.available && "opacity-30 cursor-not-allowed line-through",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${variant.name}: ${val.label}`}
                >
                  {val.image_url && (
                    <img
                      src={val.image_url}
                      alt=""
                      className="inline-block size-5 rounded-md object-cover mr-2 -ml-1"
                    />
                  )}
                  {val.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

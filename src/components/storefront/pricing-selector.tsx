import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PricingMode } from "@/types/storefront";

type PricingSelectorProps = {
  modes: PricingMode[];
  selectedId: string | null;
  onChange: (mode: PricingMode) => void;
};

export function PricingSelector({ modes, selectedId, onChange }: PricingSelectorProps) {
  const enabled = useMemo(
    () => modes.filter((m) => m.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [modes],
  );

  if (enabled.length <= 1) return null;

  return (
    <div className="mt-6">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground mb-3 block">
        Pricing
      </span>
      <div className="flex flex-wrap gap-2">
        {enabled.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode)}
            className={cn(
              "min-h-[52px] px-6 rounded-full text-sm font-medium transition-all duration-200 border-2",
              selectedId === mode.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
            aria-pressed={selectedId === mode.id}
          >
            <span>{mode.name}</span>
            {mode.badge && <span className="ml-1.5 text-[10px] opacity-60">({mode.badge})</span>}
          </button>
        ))}
      </div>
      {enabled.find((m) => m.id === selectedId)?.description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {enabled.find((m) => m.id === selectedId)?.description}
        </p>
      )}
    </div>
  );
}

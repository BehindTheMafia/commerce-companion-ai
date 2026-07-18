import { useMemo } from "react";
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
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-bold uppercase tracking-wider text-[#111827]">
          Purchase Type
        </span>
        <span className="text-[13px] font-semibold text-[#6B7280]">
          {enabled.find((m) => m.id === selectedId)?.name ?? ""}
        </span>
      </div>
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] p-1.5 rounded-[14px] flex w-full shadow-inner relative">
        {enabled.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode)}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-[10px] text-sm font-semibold transition-all duration-300 ease-out relative z-10",
              selectedId === mode.id
                ? "text-[#111827] shadow-[0_2px_10px_rgb(0,0,0,0.08)] bg-white"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/50",
            )}
            aria-pressed={selectedId === mode.id}
          >
            <span>{mode.name}</span>
            {mode.badge && (
              <span className="ml-1 text-[10px] opacity-60">({mode.badge})</span>
            )}
          </button>
        ))}
      </div>
      {enabled.find((m) => m.id === selectedId)?.description && (
        <p className="text-xs text-[#6B7280]">
          {enabled.find((m) => m.id === selectedId)?.description}
        </p>
      )}
    </div>
  );
}

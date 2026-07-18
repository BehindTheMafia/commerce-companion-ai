import { useState, useMemo } from "react";
import type { PricingMode } from "@/types/storefront";

export function usePricingMode(modes: PricingMode[] | null | undefined) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const enabled = useMemo(
    () => (modes ?? []).filter((m) => m.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [modes],
  );

  const selected = useMemo(() => {
    if (enabled.length === 0) return null;
    const found = enabled.find((m) => m.id === selectedId);
    return found ?? enabled[0];
  }, [enabled, selectedId]);

  return {
    selected,
    selectedId,
    setSelectedId: (mode: PricingMode) => setSelectedId(mode.id),
    enabled,
    effectivePrice: selected?.price ?? null,
    minimumQuantity: selected?.minimumQuantity ?? 1,
    showSelector: enabled.length > 1,
  };
}

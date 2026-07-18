import type { ProductVariant } from "@/types/storefront";

export function useVariants(variants: ProductVariant[] | null | undefined) {
  const enabled = variants?.filter((v) => v.values.some((val) => val.available)) ?? [];

  return {
    enabled,
    hasVariants: enabled.length > 0,
    defaultSelection: Object.fromEntries(
      enabled.map((v) => {
        const firstAvailable = v.values.find((val) => val.available);
        return [v.type, firstAvailable?.id ?? v.values[0]?.id ?? ""];
      }),
    ),
  };
}

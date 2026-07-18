import { useMemo } from "react";
import type { StoreSettings } from "@/types/storefront";
import { DEFAULT_STORE_SETTINGS } from "@/types/storefront";
import type { Business } from "@/types/storefront";

export function useStoreSettings(business: Business | null | undefined): StoreSettings {
  return useMemo(() => {
    if (!business?.settings) return DEFAULT_STORE_SETTINGS;
    return { ...DEFAULT_STORE_SETTINGS, ...business.settings };
  }, [business?.settings]);
}

export const APP_NAME = "Commerce AI";
export const COMPANY_NAME = "HyperBee";

const LEGACY_CART_STORAGE_KEY = "hyperbee-cart";
export const CART_STORAGE_KEY = "commerce_ai_cart";

export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.VITE_PUBLIC_URL ?? "";
}

export function getStoreUrl(slug: string): string {
  return `${getAppBaseUrl()}/go/${slug}`;
}

export function migrateCartStorageKey(): string {
  if (typeof window === "undefined") return CART_STORAGE_KEY;
  try {
    const legacy = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    if (legacy && !window.localStorage.getItem(CART_STORAGE_KEY)) {
      window.localStorage.setItem(CART_STORAGE_KEY, legacy);
    }
    if (legacy) window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
  } catch {
    // localStorage unavailable — ignore
  }
  return CART_STORAGE_KEY;
}

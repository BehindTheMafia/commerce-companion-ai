import { getAppBaseUrl } from "@/lib/config";

const SW_PATH = "/sw.js";
const REGISTER_URL = "/api/push/register";
const UNREGISTER_URL = "/api/push/unregister";
const SEND_URL = "/api/push/send";

const MANIFEST_PATH = "/manifest.webmanifest";
const ICON_PATH = "/icons/icon-192.png";
const BADGE_PATH = "/icons/badge-96.png";

let cachedVapidKey: string | null = null;

/**
 * Resolves the VAPID application-server public key:
 * prefer `VITE_VAPID_PUBLIC_KEY`, fall back to `GET /api/push/vapid`.
 */
export async function getVapidPublicKey(): Promise<string> {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (fromEnv) {
    cachedVapidKey = fromEnv;
    return fromEnv;
  }
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const res = await fetch(`${getAppBaseUrl()}/api/push/vapid`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { publicKey?: string };
      if (data.publicKey) {
        cachedVapidKey = data.publicKey;
        return data.publicKey;
      }
    }
  } catch {
    // Fall through — caller decides what to do when there is no key.
  }
  return "";
}

export const pushEndpoints = {
  sw: SW_PATH,
  register: REGISTER_URL,
  unregister: UNREGISTER_URL,
  send: SEND_URL,
  manifest: MANIFEST_PATH,
  icon: ICON_PATH,
  badge: BADGE_PATH,
};

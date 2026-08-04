import { pushEndpoints, getVapidPublicKey } from "./config";
import { urlBase64ToUint8Array } from "./url-b64";
import { getDeviceInfo } from "./device";
import { registerPushSubscription } from "./client-api";
import type { DeviceInfo, PushSubscriptionPayload } from "./types";

export type PushManagerState = {
  supported: boolean;
  swRegistered: boolean;
  subscription: PushSubscription | null;
  error: string | null;
};

const REGISTERED_KEY = "hyperbee_push_registered";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Registers the service worker. Safe to call multiple times.
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.register(pushEndpoints.sw, {
      scope: "/",
    });
    await reg.update();
    return true;
  } catch (err) {
    console.error("[push] service worker registration failed", err);
    return false;
  }
}

async function getServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg ?? null;
}

/**
 * Subscribes the current browser to the push service using the application
 * server VAPID key. Returns null when the browser blocks subscription.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const reg = await getServiceWorker();
  if (!reg) return null;

  const key = await getVapidPublicKey();
  if (!key) {
    console.error("[push] no VAPID public key available");
    return null;
  }

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  } catch (err) {
    console.error("[push] subscribe failed", err);
    return null;
  }
}

/**
 * Serializes a PushSubscription for storage/transport.
 */
export async function subscriptionToPayload(
  sub: PushSubscription,
  businessId: string,
  device: DeviceInfo = getDeviceInfo(),
): Promise<PushSubscriptionPayload> {
  const raw = sub.getKey ? await sub.getKey("p256dh") : null;
  const auth = sub.getKey ? await sub.getKey("auth") : null;
  return {
    business_id: businessId,
    endpoint: sub.endpoint,
    p256dh: raw ? btoa(String.fromCharCode(...new Uint8Array(raw))) : "",
    auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
    device_name: device.deviceName,
    browser: device.browser,
    platform: device.platform,
  };
}

/**
 * Registers the device for a business (idempotent per session).
 * Returns true when the browser is now subscribed & registered.
 */
export async function ensureDeviceRegistered(businessId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await getNotificationPermission();
  if (permission !== "granted") return false;

  const registeredKey = `${REGISTERED_KEY}:${businessId}`;
  const already = sessionStorage.getItem(registeredKey);
  if (already === "1") return true;

  const sub = await subscribeToPush();
  if (!sub) return false;

  const payload = await subscriptionToPayload(sub, businessId);
  const ok = await registerPushSubscription(payload);
  if (ok) sessionStorage.setItem(registeredKey, "1");
  return ok;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

/**
 * Requests notification permission from the browser.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

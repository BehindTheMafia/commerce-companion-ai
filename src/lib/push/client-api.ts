import { supabase } from "@/integrations/supabase/client";
import { pushEndpoints } from "./config";
import type { PushSubscriptionPayload } from "./types";

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function jsonFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** Register (or refresh) the current device for a business. */
export async function registerPushSubscription(payload: PushSubscriptionPayload): Promise<boolean> {
  try {
    const res = await jsonFetch(pushEndpoints.register, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[push] register request failed", err);
    return false;
  }
}

/** Remove the current device from every business (used on sign-out / permission revoked). */
export async function unregisterPushSubscription(endpoint: string): Promise<boolean> {
  try {
    const res = await jsonFetch(pushEndpoints.unregister, {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
    return res.ok;
  } catch (err) {
    console.error("[push] unregister request failed", err);
    return false;
  }
}

/**
 * Fire-and-forget: notify the backend that an order was created so it can push
 * to all admin devices. Uses `keepalive` so the request survives navigation.
 */
export async function sendPushForOrder(orderId: string): Promise<void> {
  try {
    const payload = JSON.stringify({ order_id: orderId });
    // keepalive: true lets the request finish even if the page navigates away
    // (the checkout redirects the customer to WhatsApp immediately after).
    await fetch(pushEndpoints.send, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch (err) {
    console.error("[push] send request failed", err);
  }
}

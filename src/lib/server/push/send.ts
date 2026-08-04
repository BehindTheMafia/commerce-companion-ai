import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { getWebPush } from "@/lib/server/push/vapid";
import { formatMoney } from "@/lib/server/push/currency";
import { logSend, logSendFailure } from "@/lib/server/push/log";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;

const APP_ORIGIN = process.env.APP_URL || process.env.VITE_PUBLIC_URL || "https://commerce.ai";

type OrderRow = {
  id: string;
  order_number: string;
  total: number | null;
  currency: string | null;
  customer_name: string | null;
  business_id: string;
  created_at: string;
  business_name: string;
  business_logo: string | null;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type SendResult = {
  total: number;
  sent: number;
  failed: number;
  revoked: number;
  orderId: string;
  businessId: string | null;
};

export function notificationPayload(order: OrderRow): Record<string, unknown> {
  const icon = `${APP_ORIGIN}/icons/icon-192.png`;
  const badge = `${APP_ORIGIN}/icons/badge-96.png`;
  const body = [
    `Pedido ${order.order_number}`,
    `Cliente: ${order.customer_name || "—"}`,
    `Total: ${formatMoney(Number(order.total ?? 0), order.currency || "USD")}`,
  ].join("\n");

  return {
    title: "🛒 Nuevo pedido recibido",
    body,
    icon,
    badge,
    image: order.business_logo || icon,
    vibrate: [200, 100, 200],
    tag: `hyperbee-order-${order.id}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: `/app/orders?order=${order.id}`,
      orderId: order.id,
      businessId: order.business_id,
    },
    actions: [
      { action: "view", title: "Ver pedido" },
      { action: "close", title: "Cerrar" },
    ],
  };
}

async function fetchOrder(orderId: string): Promise<OrderRow | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("orders")
    .select(
      `id, order_number, total, currency, customer_name, business_id, created_at,
       business:businesses(name, logo_url)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!data) return null;

  const raw = data as unknown as {
    id: string;
    order_number: string;
    total: number | null;
    currency: string | null;
    customer_name: string | null;
    business_id: string;
    created_at: string;
    business:
      { name: string; logo_url: string | null } | Array<{ name: string; logo_url: string | null }>;
  };

  const business = Array.isArray(raw.business) ? raw.business[0] : raw.business;
  return {
    id: raw.id,
    order_number: raw.order_number,
    total: raw.total,
    currency: raw.currency,
    customer_name: raw.customer_name,
    business_id: raw.business_id,
    created_at: raw.created_at,
    business_name: business?.name ?? "",
    business_logo: business?.logo_url ?? null,
  };
}

async function fetchSubscriptions(businessId: string): Promise<SubscriptionRow[]> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("last_used_at", { ascending: false });

  if (error) throw error;
  // Dedupe devices registered against more than one row of the same business.
  const seen = new Set<string>();
  const out: SubscriptionRow[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.endpoint)) continue;
    seen.add(row.endpoint);
    out.push(row);
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markSubscription(
  subscriptionId: string,
  status: "expired" | "revoked",
): Promise<void> {
  const admin = supabaseAdmin();
  await admin.from("push_subscriptions").update({ status }).eq("id", subscriptionId);
}

async function sendToSubscription(
  subscription: SubscriptionRow,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; revoke?: boolean; error?: string }> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await getWebPush().sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        { TTL: 24 * 60 * 60, urgency: "high" },
      );
      return { ok: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      lastError = status ? `HTTP ${status}` : err instanceof Error ? err.message : "Unknown error";

      // Gone / Not Found: the endpoint is dead — revoke and stop retrying.
      if (status === 410 || status === 404) {
        return { ok: false, revoke: true, error: lastError };
      }
      // 429 / 5xx are transient: back off and retry.
      if (attempt < MAX_ATTEMPTS && (status === undefined || status === 429 || status >= 500)) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      break;
    }
  }
  return { ok: false, error: lastError };
}

/**
 * Send push notifications for a newly created order to every active device of
 * the order's business. Idempotent and safe to call more than once.
 */
export async function sendOrderNotification(orderId: string): Promise<SendResult> {
  const order = await fetchOrder(orderId);
  if (!order) {
    return { total: 0, sent: 0, failed: 0, revoked: 0, orderId, businessId: null };
  }

  const subscriptions = await fetchSubscriptions(order.business_id);
  const payload = notificationPayload(order);

  let sent = 0;
  let failed = 0;
  let revoked = 0;

  for (const sub of subscriptions) {
    const result = await sendToSubscription(sub, payload);
    if (result.ok) {
      sent += 1;
      await logSend({ subscriptionId: sub.id, orderId, businessId: order.business_id });
      const admin = supabaseAdmin();
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } else if (result.revoke) {
      revoked += 1;
      await markSubscription(sub.id, "revoked");
      await logSendFailure({
        subscriptionId: sub.id,
        orderId,
        businessId: order.business_id,
        error: result.error ?? "revoked",
      });
    } else {
      failed += 1;
      await logSendFailure({
        subscriptionId: sub.id,
        orderId,
        businessId: order.business_id,
        error: result.error ?? "failed",
      });
    }
  }

  return {
    total: subscriptions.length,
    sent,
    failed,
    revoked,
    orderId,
    businessId: order.business_id,
  };
}

import { supabaseAdmin } from "@/lib/server/supabase-admin";

type LogBase = {
  businessId: string;
  orderId: string;
  subscriptionId: string;
};

/** Record a successful delivery. */
export async function logSend(args: LogBase): Promise<void> {
  try {
    const admin = supabaseAdmin();
    await admin.from("notification_logs").insert({
      business_id: args.businessId,
      order_id: args.orderId,
      subscription_id: args.subscriptionId,
      status: "sent",
      attempts: 1,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    // Logging must never break delivery.
    console.error("[push] failed to write sent log", err);
  }
}

/** Record a failed delivery (after retries). */
export async function logSendFailure(
  args: LogBase & { error: string; attempts?: number },
): Promise<void> {
  try {
    const admin = supabaseAdmin();
    await admin.from("notification_logs").insert({
      business_id: args.businessId,
      order_id: args.orderId,
      subscription_id: args.subscriptionId,
      status: "failed",
      error: args.error.slice(0, 500),
      attempts: args.attempts ?? 3,
    });
  } catch (err) {
    console.error("[push] failed to write failure log", err);
  }
}

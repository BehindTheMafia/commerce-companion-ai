import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { sendOrderNotification } from "@/lib/server/push/send";

const MAX_ORDER_AGE_MS = 30 * 60 * 1000; // unauthenticated calls only

type SendBody = { order_id: string };

/**
 * POST /api/push/send
 *
 * Sends a push notification for a new order to every active device subscribed
 * to the order's business.
 *
 * Auth rules:
 *  - With a valid admin session: allowed for any order of a business the user
 *    belongs to (owner/admin/staff).
 *  - Without a session (storefront checkout): allowed only for very recent
 *    orders, so the endpoint can't be abused to spam notifications.
 */
export const Route = createFileRoute("/api/push/send")({
  component: () => null,
  ssr: true,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let body: SendBody;
          try {
            body = (await request.json()) as SendBody;
          } catch {
            return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
          }

          if (!body.order_id) {
            return Response.json({ error: "Falta order_id" }, { status: 400 });
          }

          const admin = supabaseAdmin();
          const { data: order } = await admin
            .from("orders")
            .select("id, business_id, created_at")
            .eq("id", body.order_id)
            .maybeSingle();

          if (!order) {
            return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
          }

          // Optional authorization check for authenticated callers.
          const header = request.headers.get("authorization") ?? "";
          const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
          if (token) {
            const { data: userData, error: authError } = await admin.auth.getUser(token);
            if (authError || !userData.user) {
              return Response.json({ error: "Sesión inválida" }, { status: 401 });
            }
            const { data: membership } = await admin
              .from("memberships")
              .select("id")
              .eq("business_id", order.business_id)
              .eq("user_id", userData.user.id)
              .in("role", ["owner", "admin", "staff"])
              .maybeSingle();
            if (!membership) {
              return Response.json({ error: "Sin permisos sobre este negocio" }, { status: 403 });
            }
          } else if (Date.now() - new Date(order.created_at).getTime() > MAX_ORDER_AGE_MS) {
            return Response.json(
              { error: "El pedido ya no es elegible para notificación" },
              { status: 422 },
            );
          }

          const result = await sendOrderNotification(body.order_id);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("[push] send error", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});

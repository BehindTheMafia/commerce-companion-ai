import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type RegisterBody = {
  business_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name?: string;
  browser?: string;
  platform?: string;
};

async function getBearerToken(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function isAuthorizedAdmin(userId: string, businessId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("memberships")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .maybeSingle();
  return !!data;
}

/**
 * POST /api/push/register
 *
 * Registers (or updates) a device push subscription for an authenticated user
 * on a given business. Requires a valid Supabase session token and membership
 * with owner/admin/staff role on the business.
 */
export const Route = createFileRoute("/api/push/register")({
  component: () => null,
  ssr: true,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = await getBearerToken(request);
          if (!token) {
            return Response.json({ error: "No autenticado" }, { status: 401 });
          }

          const admin = supabaseAdmin();
          const { data: userData, error: authError } = await admin.auth.getUser(token);
          if (authError || !userData.user) {
            return Response.json({ error: "Sesión inválida" }, { status: 401 });
          }
          const userId = userData.user.id;

          let body: RegisterBody;
          try {
            body = (await request.json()) as RegisterBody;
          } catch {
            return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
          }

          const { business_id, endpoint, p256dh, auth } = body;
          if (!business_id || !endpoint || !p256dh || !auth) {
            return Response.json(
              { error: "Faltan campos requeridos (business_id, endpoint, p256dh, auth)" },
              { status: 400 },
            );
          }

          if (!(await isAuthorizedAdmin(userId, business_id))) {
            return Response.json({ error: "Sin permisos sobre este negocio" }, { status: 403 });
          }

          const { data, error } = await admin
            .from("push_subscriptions")
            .upsert(
              {
                user_id: userId,
                business_id,
                endpoint,
                p256dh,
                auth,
                device_name: body.device_name ?? null,
                browser: body.browser ?? null,
                platform: body.platform ?? null,
                status: "active",
                last_used_at: new Date().toISOString(),
              },
              { onConflict: "business_id,endpoint" },
            )
            .select("id")
            .single();

          if (error) {
            console.error("[push] register failed", error);
            return Response.json({ error: "No se pudo registrar el dispositivo" }, { status: 500 });
          }

          return Response.json({ ok: true, id: data.id });
        } catch (err) {
          console.error("[push] register error", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});

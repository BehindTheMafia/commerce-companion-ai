import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type UnregisterBody = { endpoint: string };

/**
 * POST /api/push/unregister
 *
 * Deletes every push subscription row for the authenticated user that matches
 * the given browser endpoint (same device across multiple businesses).
 */
export const Route = createFileRoute("/api/push/unregister")({
  component: () => null,
  ssr: true,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const header = request.headers.get("authorization") ?? "";
          const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
          if (!token) {
            return Response.json({ error: "No autenticado" }, { status: 401 });
          }

          const admin = supabaseAdmin();
          const { data: userData, error: authError } = await admin.auth.getUser(token);
          if (authError || !userData.user) {
            return Response.json({ error: "Sesión inválida" }, { status: 401 });
          }

          let body: UnregisterBody;
          try {
            body = (await request.json()) as UnregisterBody;
          } catch {
            return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
          }

          if (!body.endpoint) {
            return Response.json({ error: "Falta endpoint" }, { status: 400 });
          }

          const { error, count } = await admin
            .from("push_subscriptions")
            .delete({ count: "exact" })
            .eq("endpoint", body.endpoint)
            .eq("user_id", userData.user.id);

          if (error) {
            console.error("[push] unregister failed", error);
            return Response.json({ error: "No se pudo eliminar el dispositivo" }, { status: 500 });
          }

          return Response.json({ ok: true, deleted: count ?? 0 });
        } catch (err) {
          console.error("[push] unregister error", err);
          return Response.json({ error: "Error interno" }, { status: 500 });
        }
      },
    },
  },
});

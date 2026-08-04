import { createFileRoute } from "@tanstack/react-router";
import { getVapidPublicKey } from "@/lib/server/push/vapid";

/**
 * GET /api/push/vapid
 * Public: returns the application server public key used by the browser
 * `pushManager.subscribe()`. The public key is safe to expose.
 */
export const Route = createFileRoute("/api/push/vapid")({
  component: () => null,
  ssr: true,
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json({ publicKey: getVapidPublicKey() });
        } catch (err) {
          console.error("[push] vapid public key unavailable", err);
          return Response.json({ publicKey: "" }, { status: 500 });
        }
      },
    },
  },
});

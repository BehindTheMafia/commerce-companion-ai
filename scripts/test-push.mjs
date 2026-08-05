import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const parsed = JSON.parse(
  process.env.SUB_JSON ??
    '{"endpoint":"","p256dh":"","auth":""}'
);
const subs = Array.isArray(parsed) ? parsed : [parsed];

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@yourdomain.com",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

const payload = JSON.stringify({
  title: "🔔 ¡Pedido nuevo! (prueba)",
  body: "Esto confirma que el push funciona. ¡Buenas noticias!",
  data: { url: "/app/orders" },
});

let ok = 0;
for (const sub of subs) {
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 60 }
    );
    console.log("SENT", res.statusCode, sub.device_name ?? "");
    ok++;
  } catch (e) {
    console.error("FAILED", sub.device_name ?? "", { statusCode: e?.statusCode, body: e?.body, message: e?.message });
  }
}
if (ok === 0) process.exit(1);

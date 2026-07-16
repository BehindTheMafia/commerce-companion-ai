import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/twilio/webhook")({
  component: () => null,
  ssr: true,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const text = await request.text();
        const params = new URLSearchParams(text);

        const from = params.get("From") || "";
        const messageBody = params.get("Body") || "";
        const messageSid = params.get("MessageSid") || "";
        const profileName = params.get("ProfileName") || "";
        const mediaUrl = params.get("MediaUrl0") || "";
        const mediaContentType = params.get("MediaContentType0") || "";
        const numMedia = parseInt(params.get("NumMedia") || "0", 10);
        const phone = from.replace("whatsapp:", "");

        if (!from || !messageBody) {
          return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            { headers: { "Content-Type": "text/xml" } },
          );
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            { headers: { "Content-Type": "text/xml" } },
          );
        }

        const sb = createClient(supabaseUrl, supabaseKey);

        try {
          const { data: business } = await sb
            .from("businesses")
            .select("id")
            .not("whatsapp_phone", "is", null)
            .limit(1)
            .single();

          if (!business) {
            return new Response(
              '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
              { headers: { "Content-Type": "text/xml" } },
            );
          }

          const messageType = numMedia > 0 && mediaUrl ? "image" : "text";

          const { error } = await sb.rpc("webhook_handle_incoming_message", {
            p_business_id: business.id,
            p_phone: phone,
            p_customer_name: profileName || null,
            p_content: messageBody,
            p_message_type: messageType,
            p_media_url: mediaUrl || null,
            p_media_type: mediaContentType || null,
            p_external_id: messageSid || null,
          });

          if (error) {
            console.error("RPC error:", error);
          }
        } catch (err) {
          console.error("Twilio webhook error:", err);
        }

        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { "Content-Type": "text/xml" } },
        );
      },
    },
  },
});

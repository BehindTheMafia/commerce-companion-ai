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
        const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

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

          let customerId: string | null = null;
          const { data: existingCustomer } = await sb
            .from("customers")
            .select("id")
            .eq("phone", phone)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer } = await sb
              .from("customers")
              .insert({
                business_id: business.id,
                full_name: profileName || phone,
                phone,
              })
              .select("id")
              .single();
            customerId = newCustomer?.id ?? null;
          }

          let conversationId: string | null = null;
          const { data: existingConv } = await sb
            .from("inbox_conversations")
            .select("id, status")
            .eq("customer_phone", phone)
            .eq("business_id", business.id)
            .in("status", ["open", "resolved"])
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          if (existingConv) {
            conversationId = existingConv.id;
            if (existingConv.status !== "open") {
              await sb.from("inbox_conversations").update({ status: "open" }).eq("id", conversationId);
            }
          } else {
            const { data: newConv } = await sb
              .from("inbox_conversations")
              .insert({
                business_id: business.id,
                customer_id: customerId,
                channel: "whatsapp",
                status: "open",
                customer_phone: phone,
                customer_name: profileName || phone,
              })
              .select("id")
              .single();
            conversationId = newConv?.id ?? null;
          }

          if (conversationId) {
            const messageType = numMedia > 0 && mediaUrl ? "image" : "text";
            await sb.from("inbox_messages").insert({
              conversation_id: conversationId,
              sender_type: "customer",
              content: messageBody,
              message_type: messageType,
              media_url: mediaUrl || null,
              media_type: mediaContentType || null,
              external_id: messageSid || null,
              status: "delivered",
            });
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

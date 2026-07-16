import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const body = await readBody(event);
  if (!body) return { error: "No body" };

  if (!supabaseUrl || !supabaseKey) {
    return { error: "Supabase not configured" };
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  const from = body.From || body.from;
  const messageBody = body.Body || body.body;
  const messageSid = body.MessageSid || body.MessageSid;
  const profileName = body.ProfileName || body.profileName;
  const mediaUrl = body.MediaUrl0 || body.MediaUrl0;
  const mediaContentType = body.MediaContentType0 || body.MediaContentType0;
  const numMedia = parseInt(body.NumMedia || "0", 10);

  if (!from || !messageBody) {
    return { error: "Missing required fields" };
  }

  const phone = from.replace("whatsapp:", "");

  try {
    const { data: business, error: bizErr } = await sb
      .from("businesses")
      .select("id, name")
      .not("whatsapp_phone", "is", null)
      .limit(1)
      .single();

    if (bizErr || !business) {
      return { error: "No business configured for WhatsApp" };
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
      .select("id")
      .eq("customer_phone", phone)
      .eq("business_id", business.id)
      .in("status", ["open", "resolved"])
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
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

    if (!conversationId) {
      return { error: "Could not create conversation" };
    }

    const messageType = numMedia > 0 && mediaUrl ? "image" : "text";

    const { error: msgError } = await sb
      .from("inbox_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "customer",
        content: messageBody,
        message_type: messageType,
        media_url: mediaUrl || null,
        media_type: mediaContentType || null,
        external_id: messageSid || null,
        status: "delivered",
      });

    if (msgError) throw msgError;

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } },
    );
  } catch (err) {
    console.error("Twilio webhook error:", err);
    return { error: "Internal error" };
  }
});

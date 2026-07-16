import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;

export type InboxConversation = {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  status: "open" | "resolved" | "archived";
  assigned_to: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_text: string | null;
  last_message_sender: "customer" | "agent" | "system" | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    tags: string[] | null;
    notes: string | null;
    created_at: string;
  } | null;
  tags?: { tag: string }[];
  ai?: InboxAI | null;
};

export type InboxMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: "customer" | "agent" | "system" | "ai";
  content: string | null;
  message_type: "text" | "image" | "audio" | "video" | "document" | "location" | "contact" | "template";
  media_url: string | null;
  media_type: string | null;
  external_id: string | null;
  metadata: Record<string, any>;
  status: "sent" | "delivered" | "read" | "failed";
  created_at: string;
};

export type InboxTag = {
  tag: string;
};

export type InboxNote = {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type InboxAI = {
  summary: string | null;
  sentiment: string | null;
  intent: string | null;
  urgency: "low" | "medium" | "high" | "critical" | null;
  suggested_reply: string | null;
  suggested_products: any[];
  recommended_discount: number | null;
  conversion_probability: number | null;
};

export const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "unread", label: "No leídos" },
  { value: "mine", label: "Mis conversaciones" },
  { value: "open", label: "Abiertos" },
  { value: "resolved", label: "Resueltos" },
  { value: "vip", label: "VIP" },
  { value: "needs_reply", label: "Requiere respuesta" },
  { value: "archived", label: "Archivados" },
] as const;

export type FilterValue = (typeof FILTERS)[number]["value"];

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) return "Ayer";
  if (days < 7) {
    return date.toLocaleDateString("es", { weekday: "short" });
  }
  return date.toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

export const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700",
  Wholesale: "bg-purple-100 text-purple-700",
  Retail: "bg-blue-100 text-blue-700",
  "Pending Payment": "bg-orange-100 text-orange-700",
  "Frequent Buyer": "bg-emerald-100 text-emerald-700",
  Instagram: "bg-pink-100 text-pink-700",
  WhatsApp: "bg-green-100 text-green-700",
  Support: "bg-cyan-100 text-cyan-700",
  Complaint: "bg-red-100 text-red-700",
};

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-muted text-muted-foreground";
}

export async function fetchConversations(businessId: string, filter: FilterValue, search: string) {
  let query = sb
    .from("inbox_conversations")
    .select(`
      *,
      customer:customers(id, full_name, email, phone, tags, notes, created_at),
      tags:inbox_conversation_tags(tag),
      ai:inbox_conversation_ai(summary, sentiment, intent, urgency, suggested_reply, suggested_products, recommended_discount, conversion_probability)
    `)
    .eq("business_id", businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (filter === "unread") query = query.gt("unread_count", 0);
  else if (filter === "open") query = query.eq("status", "open");
  else if (filter === "resolved") query = query.eq("status", "resolved");
  else if (filter === "archived") query = query.eq("status", "archived");
  else if (filter === "vip") query = query.contains("metadata", { tag: "VIP" });
  else if (filter === "needs_reply") query = query.eq("last_message_sender", "customer").eq("status", "open");

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as InboxConversation[];
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await sb
    .rpc("get_conversation_messages", {
      p_conversation_id: conversationId,
      p_limit: 100,
      p_offset: 0,
    });

  if (error) throw error;
  return (data ?? []) as InboxMessage[];
}

export async function fetchNotes(conversationId: string) {
  const { data, error } = await sb
    .from("inbox_conversation_notes")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as InboxNote[];
}

export async function sendMessage(conversationId: string, content: string) {
  const { data, error } = await sb.rpc("send_message", {
    p_conversation_id: conversationId,
    p_sender_type: "agent",
    p_content: content,
    p_message_type: "text",
  });

  if (error) throw error;
  return data;
}

export async function resolveConversation(conversationId: string) {
  const { error } = await sb.rpc("resolve_conversation", {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function assignConversation(conversationId: string, membershipId: string) {
  const { error } = await sb.rpc("assign_conversation", {
    p_conversation_id: conversationId,
    p_membership_id: membershipId,
  });
  if (error) throw error;
}

export async function addNote(conversationId: string, content: string) {
  const { data, error } = await sb.rpc("add_conversation_note", {
    p_conversation_id: conversationId,
    p_content: content,
  });
  if (error) throw error;
  return data;
}

export async function addTag(conversationId: string, tag: string) {
  const { error } = await sb
    .from("inbox_conversation_tags")
    .insert({ conversation_id: conversationId, tag });
  if (error) throw error;
}

export async function removeTag(conversationId: string, tag: string) {
  const { error } = await sb
    .from("inbox_conversation_tags")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("tag", tag);
  if (error) throw error;
}

export type NotificationPromptStatus = "never_asked" | "accepted" | "denied" | "blocked";

export type NotificationPreferences = {
  id: string;
  user_id: string;
  business_id: string;
  new_orders_enabled: boolean;
  sound_enabled: boolean;
  prompt_status: NotificationPromptStatus;
  prompted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionPayload = {
  business_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name?: string;
  browser?: string;
  platform?: string;
};

export type DeviceInfo = {
  deviceName: string;
  browser: string;
  platform: string;
};

/** The shape of an order row broadcast over Supabase Realtime. */
export type RealtimeOrder = {
  id: string;
  order_number: string | null;
  total: number | null;
  currency: string | null;
  customer_name: string | null;
  status: string | null;
  created_at: string;
};

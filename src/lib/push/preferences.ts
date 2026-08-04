import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences, NotificationPromptStatus } from "./types";

/**
 * Minimal typed schema for the new push tables.
 *
 * The auto-generated `Database` type in `src/integrations/supabase/types.ts`
 * hasn't been regenerated yet, so we augment the shared client with just the
 * tables this module touches. Regenerate types (`supabase gen types`) to
 * remove this cast once the migration is applied.
 */
export type PushDb = {
  public: {
    Tables: {
      notification_preferences: {
        Row: NotificationPreferences;
        Insert: {
          user_id: string;
          business_id: string;
          new_orders_enabled?: boolean;
          sound_enabled?: boolean;
          prompt_status?: NotificationPromptStatus;
          prompted_at?: string | null;
        };
        Update: Partial<{
          new_orders_enabled: boolean;
          sound_enabled: boolean;
          prompt_status: NotificationPromptStatus;
          prompted_at: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const pushDb = supabase as unknown as SupabaseClient<PushDb>;

export async function getNotificationPreferences(
  userId: string,
  businessId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await pushDb
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) {
    console.error("[push] getPreferences error", error);
    return null;
  }
  return data;
}

export async function upsertNotificationPreferences(
  userId: string,
  businessId: string,
  patch: {
    new_orders_enabled?: boolean;
    sound_enabled?: boolean;
    prompt_status?: NotificationPromptStatus;
  },
): Promise<void> {
  const { error } = await pushDb.from("notification_preferences").upsert(
    {
      user_id: userId,
      business_id: businessId,
      ...patch,
      prompted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,business_id" },
  );
  if (error) {
    console.error("[push] upsertPreferences error", error);
  }
}

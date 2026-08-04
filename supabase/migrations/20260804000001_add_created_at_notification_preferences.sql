-- Add created_at to notification_preferences for consistency with the
-- project convention (all main tables have created_at + updated_at).
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

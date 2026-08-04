-- =============================================================================
-- Push notifications for new orders (HyperBee / Commerce AI)
--
-- Three tables:
--   1. push_subscriptions        — one row per (business, device endpoint)
--   2. notification_preferences  — per (user, business) opt-in + prompt state
--   3. notification_logs         — audit trail for every send attempt
--
-- Realtime: orders table is added to the supabase_realtime publication so the
-- admin panel receives new orders instantly (Postgres Changes).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'push_subscription_status') THEN
    CREATE TYPE public.push_subscription_status AS ENUM ('active', 'expired', 'revoked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_prompt_status') THEN
    CREATE TYPE public.notification_prompt_status AS ENUM ('never_asked', 'accepted', 'denied', 'blocked');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- push_subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT,
  browser TEXT,
  platform TEXT,
  status public.push_subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_business_idx ON public.push_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON public.push_subscriptions(status) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user manages their own devices on any business they belong to.
DROP POLICY IF EXISTS "push_subscriptions own select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own select" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_business_member(business_id));

DROP POLICY IF EXISTS "push_subscriptions own insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own insert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_business_role(business_id, ARRAY['owner','admin','staff']::public.membership_role[])
  );

DROP POLICY IF EXISTS "push_subscriptions own update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own update" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions own delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions own delete" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- notification_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  new_orders_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  prompt_status public.notification_prompt_status NOT NULL DEFAULT 'never_asked',
  prompted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS notification_preferences_user_business_idx ON public.notification_preferences(user_id, business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences own all" ON public.notification_preferences;
CREATE POLICY "notification_preferences own all" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- notification_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error TEXT,
  attempts INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_logs_business_created_idx ON public.notification_logs(business_id, created_at DESC);

GRANT SELECT ON public.notification_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_logs TO service_role;
GRANT USAGE ON SEQUENCE public.notification_logs_id_seq TO service_role;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_logs member read" ON public.notification_logs;
CREATE POLICY "notification_logs member read" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

-- -----------------------------------------------------------------------------
-- Realtime: broadcast new orders to the admin panel
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$$;

-- Inbox Module — Conversational CRM
-- Twilio-based messaging with multi-channel support

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','archived')),
  assigned_to UUID REFERENCES memberships(id) ON DELETE SET NULL,
  customer_phone TEXT,
  customer_name TEXT,
  unread_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_sender TEXT CHECK (last_message_sender IN ('customer','agent','system')),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','agent','system','ai')),
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','audio','video','document','location','contact','template')),
  media_url TEXT,
  media_type TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, tag)
);

CREATE TABLE IF NOT EXISTS inbox_conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_conversation_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  sentiment TEXT,
  intent TEXT,
  urgency TEXT CHECK (urgency IN ('low','medium','high','critical')),
  suggested_reply TEXT,
  suggested_products JSONB DEFAULT '[]'::JSONB,
  recommended_discount NUMERIC,
  conversion_probability NUMERIC CHECK (conversion_probability >= 0 AND conversion_probability <= 1),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS inbox_conversations_business_id_idx ON inbox_conversations(business_id);
CREATE INDEX IF NOT EXISTS inbox_conversations_status_idx ON inbox_conversations(status);
CREATE INDEX IF NOT EXISTS inbox_conversations_assigned_to_idx ON inbox_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS inbox_conversations_last_message_at_idx ON inbox_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS inbox_conversations_customer_id_idx ON inbox_conversations(customer_id);
CREATE INDEX IF NOT EXISTS inbox_messages_conversation_id_idx ON inbox_messages(conversation_id);
CREATE INDEX IF NOT EXISTS inbox_messages_created_at_idx ON inbox_messages(created_at);
CREATE INDEX IF NOT EXISTS inbox_conversation_notes_conversation_id_idx ON inbox_conversation_notes(conversation_id);
CREATE INDEX IF NOT EXISTS inbox_conversation_ai_conversation_id_idx ON inbox_conversation_ai(conversation_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_conversation_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can select conversations in their businesses"
  ON inbox_conversations FOR SELECT
  USING (business_id IN (SELECT business_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "users can update conversations in their businesses"
  ON inbox_conversations FOR UPDATE
  USING (business_id IN (SELECT business_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "users can insert conversations in their businesses"
  ON inbox_conversations FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "users can select messages in their conversations"
  ON inbox_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can insert messages in their conversations"
  ON inbox_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can select tags in their conversations"
  ON inbox_conversation_tags FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can manage tags in their conversations"
  ON inbox_conversation_tags FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can delete tags in their conversations"
  ON inbox_conversation_tags FOR DELETE
  USING (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can select notes in their conversations"
  ON inbox_conversation_notes FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can manage notes in their conversations"
  ON inbox_conversation_notes FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "users can update their own notes"
  ON inbox_conversation_notes FOR UPDATE
  USING (author_id IN (SELECT id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "users can select ai data in their conversations"
  ON inbox_conversation_ai FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM inbox_conversations WHERE business_id IN (
      SELECT business_id FROM memberships WHERE user_id = auth.uid()
    )
  ));

-- ============================================================
-- TRIGGER: update updated_at on conversations
-- ============================================================

CREATE OR REPLACE FUNCTION update_inbox_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inbox_conversation_timestamp ON inbox_conversations;
CREATE TRIGGER update_inbox_conversation_timestamp
  BEFORE UPDATE ON inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION update_inbox_conversation_timestamp();

-- ============================================================
-- TRIGGER: update conversation last_message on new message
-- ============================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inbox_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_text = CASE WHEN NEW.message_type = 'text' THEN NEW.content ELSE '[' || NEW.message_type || ']' END,
    last_message_sender = NEW.sender_type,
    unread_count = CASE WHEN NEW.sender_type = 'customer' THEN unread_count + 1 ELSE unread_count END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON inbox_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON inbox_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- RPC: get_conversation_messages (paginated)
-- ============================================================

CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS SETOF inbox_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM inbox_messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================================
-- RPC: send_message (atomic insert + status)
-- ============================================================

CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_sender_type TEXT,
  p_content TEXT DEFAULT NULL,
  p_message_type TEXT DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id UUID;
  v_membership_id UUID;
BEGIN
  SELECT id INTO v_membership_id
  FROM memberships
  WHERE user_id = auth.uid()
    AND business_id IN (SELECT business_id FROM inbox_conversations WHERE id = p_conversation_id)
  LIMIT 1;

  INSERT INTO inbox_messages (
    conversation_id, sender_id, sender_type,
    content, message_type, media_url, media_type, status
  ) VALUES (
    p_conversation_id, v_membership_id, p_sender_type,
    p_content, p_message_type, p_media_url, p_media_type, 'sent'
  ) RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- ============================================================
-- RPC: resolve_conversation
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE inbox_conversations
  SET status = 'resolved', updated_at = NOW()
  WHERE id = p_conversation_id
    AND business_id IN (SELECT business_id FROM memberships WHERE user_id = auth.uid());
$$;

-- ============================================================
-- RPC: assign_conversation
-- ============================================================

CREATE OR REPLACE FUNCTION assign_conversation(
  p_conversation_id UUID,
  p_membership_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE inbox_conversations
  SET assigned_to = p_membership_id, updated_at = NOW()
  WHERE id = p_conversation_id
    AND business_id IN (SELECT business_id FROM memberships WHERE user_id = auth.uid());
$$;

-- ============================================================
-- RPC: add_conversation_note
-- ============================================================

CREATE OR REPLACE FUNCTION add_conversation_note(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_membership_id UUID;
BEGIN
  SELECT id INTO v_membership_id
  FROM memberships
  WHERE user_id = auth.uid()
    AND business_id IN (SELECT business_id FROM inbox_conversations WHERE id = p_conversation_id)
  LIMIT 1;

  INSERT INTO inbox_conversation_notes (conversation_id, author_id, content)
  VALUES (p_conversation_id, v_membership_id, p_content)
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;

-- ============================================================
-- Enable realtime for inbox tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE inbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE inbox_conversations;

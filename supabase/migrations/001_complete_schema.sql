-- ============================================================================
-- VITALIS COMPLETE SCHEMA v2.0.2
-- Production-Ready Migration
--
-- Run this in Supabase SQL Editor
-- This migration is IDEMPOTENT (safe to run multiple times)
-- ============================================================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Service role detection
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  ) = 'service_role';
$$;

-- Authorization guard
CREATE OR REPLACE FUNCTION public.assert_self_or_service(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles extensions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_paths TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

-- User Consents
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  UNIQUE(user_id, consent_type, version)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);

-- Push Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = TRUE;

-- Notification Outbox (with processing_started_at for reclaim)
CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'expired')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  processing_started_at TIMESTAMPTZ
);

ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
ON notification_outbox(next_retry_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_outbox_processing_started
ON notification_outbox(processing_started_at)
WHERE status = 'processing';

-- ============================================
-- CHAT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  media_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ============================================
-- VERIFICATION & MODERATION TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  document_hash TEXT,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_user ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON verification_documents(status);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID,
  content_ref TEXT,
  content_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_text TEXT,
  content_path TEXT,
  auto_flag_reason TEXT,
  auto_flag_score FLOAT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  decision_reason TEXT,
  CONSTRAINT moderation_queue_content_check CHECK (content_id IS NOT NULL OR content_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_pending
ON moderation_queue(created_at)
WHERE status = 'pending';

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT
USING (
  id = auth.uid()
  OR (
    is_active = TRUE
    AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid())
    AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- User Consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_select" ON user_consents;
CREATE POLICY "user_consents_select" ON user_consents FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_consents_insert" ON user_consents;
CREATE POLICY "user_consents_insert" ON user_consents FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Push Tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_select" ON push_tokens;
CREATE POLICY "push_tokens_select" ON push_tokens FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_insert" ON push_tokens;
CREATE POLICY "push_tokens_insert" ON push_tokens FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_update" ON push_tokens;
CREATE POLICY "push_tokens_update" ON push_tokens FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_delete" ON push_tokens;
CREATE POLICY "push_tokens_delete" ON push_tokens FOR DELETE
USING (user_id = auth.uid());

-- Conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid() AND is_deleted = FALSE
  )
);

-- Conversation Participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "participants_update" ON conversation_participants;
CREATE POLICY "participants_update" ON conversation_participants FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid() AND is_deleted = FALSE
  )
);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_deleted = FALSE
  )
);

-- Verification Documents
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_docs_select" ON verification_documents;
CREATE POLICY "verification_docs_select" ON verification_documents FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "verification_docs_insert" ON verification_documents;
CREATE POLICY "verification_docs_insert" ON verification_documents FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Service-only tables
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STORAGE BUCKETS & POLICIES
-- ============================================

-- Profile Photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos', 'profile-photos', FALSE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 5242880;

DROP POLICY IF EXISTS "profile_photos_insert" ON storage.objects;
CREATE POLICY "profile_photos_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "profile_photos_select" ON storage.objects;
CREATE POLICY "profile_photos_select" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profile_photos_delete" ON storage.objects;
CREATE POLICY "profile_photos_delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verification Docs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents', 'verification-documents', FALSE, 10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 10485760;

DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
CREATE POLICY "verification_docs_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Chat Media (conversation participant check)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', FALSE, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
      AND cp.user_id = auth.uid()
      AND cp.is_deleted = FALSE
  )
);

DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
      AND cp.user_id = auth.uid()
      AND cp.is_deleted = FALSE
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preview TEXT;
BEGIN
  preview := CASE
    WHEN NEW.message_type = 'text' THEN LEFT(COALESCE(NEW.content, ''), 100)
    WHEN NEW.message_type = 'image' THEN '📷 Fotoğraf'
    WHEN NEW.message_type = 'system' THEN '🔔 Bildirim'
    ELSE '💬 Mesaj'
  END;

  UPDATE conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = preview,
    last_message_sender_id = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Queue notification on new match
CREATE OR REPLACE FUNCTION public.queue_match_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_outbox (recipient_user_id, notification_type, title, body, data)
  VALUES
    (NEW.profile_1_id, 'match', 'Yeni Eşleşme! 💕', 'Biriyle eşleştin!',
     jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.profile_2_id)),
    (NEW.profile_2_id, 'match', 'Yeni Eşleşme! 💕', 'Biriyle eşleştin!',
     jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.profile_1_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_created ON matches;
CREATE TRIGGER on_match_created
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION queue_match_notification();

-- Queue notification on new message
CREATE OR REPLACE FUNCTION public.queue_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  preview TEXT;
BEGIN
  SELECT user_id INTO recipient
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
    AND is_muted = FALSE
    AND is_deleted = FALSE
  LIMIT 1;

  IF recipient IS NOT NULL THEN
    preview := CASE
      WHEN NEW.message_type = 'text' THEN LEFT(COALESCE(NEW.content, ''), 50)
      WHEN NEW.message_type = 'image' THEN '📷 Fotoğraf gönderdi'
      ELSE 'Yeni mesaj'
    END;

    INSERT INTO notification_outbox (recipient_user_id, notification_type, title, body, data)
    VALUES (
      recipient, 'message', 'Yeni Mesaj', preview,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION queue_message_notification();

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Create conversation (MATCH-GATED)
CREATE OR REPLACE FUNCTION public.create_conversation(
  p_profile_1_id UUID,
  p_profile_2_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
BEGIN
  -- Security check
  PERFORM public.assert_self_or_service(p_profile_1_id);

  -- No self-conversation
  IF p_profile_1_id = p_profile_2_id THEN
    RAISE EXCEPTION 'cannot create conversation with self';
  END IF;

  -- MATCH GATE (Critical for Trust & Safety)
  IF NOT EXISTS (
    SELECT 1 FROM matches
    WHERE (profile_1_id = p_profile_1_id AND profile_2_id = p_profile_2_id)
       OR (profile_1_id = p_profile_2_id AND profile_2_id = p_profile_1_id)
  ) THEN
    RAISE EXCEPTION 'users are not matched';
  END IF;

  -- Check existing
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = p_profile_1_id
    AND cp2.user_id = p_profile_2_id
    AND cp1.is_deleted = FALSE
    AND cp2.is_deleted = FALSE
  LIMIT 1;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Create new
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (new_conv_id, p_profile_1_id), (new_conv_id, p_profile_2_id);

  RETURN new_conv_id;
END;
$$;

-- Find conversation
CREATE OR REPLACE FUNCTION public.find_conversation(
  p_user1 UUID,
  p_user2 UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
BEGIN
  PERFORM public.assert_self_or_service(p_user1);

  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = p_user1
    AND cp2.user_id = p_user2
    AND cp1.is_deleted = FALSE
    AND cp2.is_deleted = FALSE
  LIMIT 1;

  RETURN conv_id;
END;
$$;

-- Delete user data (GDPR)
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_self_or_service(p_user_id);

  -- Soft delete messages
  UPDATE messages
  SET content = '[silindi]', is_deleted = TRUE, media_path = NULL
  WHERE sender_id = p_user_id;

  -- Soft delete participations
  UPDATE conversation_participants
  SET is_deleted = TRUE
  WHERE user_id = p_user_id;

  -- Hard deletes
  DELETE FROM swipes WHERE swiper_id = p_user_id OR swiped_id = p_user_id;
  DELETE FROM matches WHERE profile_1_id = p_user_id OR profile_2_id = p_user_id;
  DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM reports WHERE reporter_id = p_user_id;
  DELETE FROM push_tokens WHERE user_id = p_user_id;
  DELETE FROM user_consents WHERE user_id = p_user_id;
  DELETE FROM notification_outbox WHERE recipient_user_id = p_user_id;
  DELETE FROM verification_documents WHERE user_id = p_user_id;
  DELETE FROM moderation_queue WHERE content_user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

-- Claim notifications (idempotent)
CREATE OR REPLACE FUNCTION public.claim_notifications(p_batch_size INT)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role only';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM notification_outbox
    WHERE status = 'pending'
      AND next_retry_at <= NOW()
      AND attempts < max_attempts
    ORDER BY next_retry_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notification_outbox n
  SET
    status = 'processing',
    attempts = n.attempts + 1,
    processing_started_at = NOW()
  FROM claimed
  WHERE n.id = claimed.id
  RETURNING n.*;
END;
$$;

-- Mark notification sent
CREATE OR REPLACE FUNCTION public.mark_notification_sent(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role only';
  END IF;

  UPDATE notification_outbox
  SET
    status = 'sent',
    sent_at = NOW(),
    processing_started_at = NULL
  WHERE id = p_notification_id;
END;
$$;

-- Mark notification failed
CREATE OR REPLACE FUNCTION public.mark_notification_failed(
  p_notification_id UUID,
  p_error_message TEXT,
  p_retry BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INT;
  max_att INT;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role only';
  END IF;

  SELECT attempts, max_attempts INTO current_attempts, max_att
  FROM notification_outbox
  WHERE id = p_notification_id;

  IF p_retry AND current_attempts < max_att THEN
    UPDATE notification_outbox
    SET
      status = 'pending',
      error_message = p_error_message,
      processing_started_at = NULL,
      next_retry_at = NOW() + (POWER(2, current_attempts) || ' minutes')::INTERVAL
    WHERE id = p_notification_id;
  ELSE
    UPDATE notification_outbox
    SET
      status = 'failed',
      error_message = p_error_message,
      processing_started_at = NULL
    WHERE id = p_notification_id;
  END IF;
END;
$$;

-- Reclaim stale processing
CREATE OR REPLACE FUNCTION public.reclaim_stale_notifications(p_stale_minutes INT DEFAULT 5)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reclaimed_count INT;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role only';
  END IF;

  UPDATE notification_outbox
  SET
    status = 'pending',
    processing_started_at = NULL,
    next_retry_at = NOW(),
    error_message = COALESCE(error_message, '') || ' | reclaimed'
  WHERE status = 'processing'
    AND processing_started_at IS NOT NULL
    AND processing_started_at < NOW() - make_interval(mins => p_stale_minutes);

  GET DIAGNOSTICS reclaimed_count = ROW_COUNT;
  RETURN reclaimed_count;
END;
$$;

-- Disable push token
CREATE OR REPLACE FUNCTION public.disable_push_token(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'service role only';
  END IF;

  UPDATE push_tokens
  SET is_active = FALSE, updated_at = NOW()
  WHERE token = p_token;
END;
$$;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Idempotent realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.pubname = 'supabase_realtime'
        AND n.nspname = 'public'
        AND c.relname = 'conversation_participants'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    END IF;
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run verification:
-- SELECT * FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_proc WHERE proname LIKE '%conversation%';

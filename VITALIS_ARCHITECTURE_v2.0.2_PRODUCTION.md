# ��️ VITALIS ARCHITECTURE v2.0.2 - PRODUCTION-READY

> **Version:** 2.0.2 Final
> **Status:** Production-Ready
> **Last Updated:** 2024

---

## TABLE OF CONTENTS

1. [Naming Conventions](#1-naming-conventions)
2. [Branch Strategy](#2-branch-strategy)
3. [Database Migration](#3-database-migration)
4. [Edge Functions](#4-edge-functions)
5. [Client Services](#5-client-services)
6. [Swipe Component](#6-swipe-component)
7. [Execution Order](#7-execution-order)
8. [Verification Checklist](#8-verification-checklist)

---

## 1. NAMING CONVENTIONS

### 1.1 Storage Buckets (Kebab-case, Immutable)

| Bucket | Purpose | Path Format |
|--------|---------|-------------|
| `profile-photos` | Profil fotoğrafları | `{userId}/{timestamp}_{index}.jpg` |
| `verification-docs` | Diploma/lisans | `{userId}/{timestamp}_{type}.pdf` |
| `chat-media` | Chat görselleri | `{conversationId}/{userId}_{timestamp}.jpg` |

### 1.2 Database Tables (Snake_case)
```
CORE:         profiles, matches, likes, blocks, reports
CHAT:         conversations, conversation_participants, messages
AUTH:         user_consents, push_tokens, notification_outbox
VERIFICATION: verification_documents
MODERATION:   moderation_queue
```

### 1.3 Storage Convention
```typescript
// DB'de PATH sakla (URL değil)
photo_paths: ["userId/1704067200_0.jpg"]

// Görüntülemede signed URL kullan
const { data } = await supabase.storage
  .from('profile-photos')
  .createSignedUrl(path, 3600); // 1 hour TTL
```

---

## 2. BRANCH STRATEGY
```
main
├── develop
│   ├── fix/phase1-db-schema        ← DB Captain
│   ├── fix/phase1-edge-functions   ← DB Captain
│   ├── fix/01-security
│   ├── fix/02-state-persistence
│   ├── fix/03-chat
│   └── ...
```

**Merge Order:**
1. Database schema + RLS + triggers + RPCs
2. Edge functions
3. Client services
4. UI components

---

## 3. DATABASE MIGRATION
```sql
-- ============================================================================
-- VITALIS COMPLETE SCHEMA v2.0.2
-- Production-Ready Migration
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
    AND id NOT IN (SELECT blocked_user_id FROM blocks WHERE blocker_id = auth.uid())
    AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_user_id = auth.uid())
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
  'verification-docs', 'verification-docs', FALSE, 10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 10485760;

DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
CREATE POLICY "verification_docs_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs'
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
    (NEW.user1_id, 'match', 'Yeni Eşleşme! 💕', 'Biriyle eşleştin!', 
     jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id)),
    (NEW.user2_id, 'match', 'Yeni Eşleşme! 💕', 'Biriyle eşleştin!', 
     jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id));
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
  p_user1_id UUID,
  p_user2_id UUID
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
  PERFORM public.assert_self_or_service(p_user1_id);
  
  -- No self-conversation
  IF p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'cannot create conversation with self';
  END IF;
  
  -- MATCH GATE (Critical for Trust & Safety)
  IF NOT EXISTS (
    SELECT 1 FROM matches
    WHERE (user1_id = p_user1_id AND user2_id = p_user2_id)
       OR (user1_id = p_user2_id AND user2_id = p_user1_id)
  ) THEN
    RAISE EXCEPTION 'users are not matched';
  END IF;
  
  -- Check existing
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = p_user1_id 
    AND cp2.user_id = p_user2_id
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
  VALUES (new_conv_id, p_user1_id), (new_conv_id, p_user2_id);
  
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
  DELETE FROM likes WHERE liker_id = p_user_id OR liked_id = p_user_id;
  DELETE FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id;
  DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_user_id = p_user_id;
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
```

---

## 4. EDGE FUNCTIONS

### 4.1 Push Worker
```typescript
// supabase/functions/push-worker/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 50;

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error: string };
}

serve(async (req) => {
  // Auth: CRON_SECRET only
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  const provided =
    req.headers.get('x-cron-secret') ??
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (!cronSecret || provided !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Reclaim stale first
  const { data: reclaimedCount } = await supabase
    .rpc('reclaim_stale_notifications', { p_stale_minutes: 5 });
  
  if (reclaimedCount && reclaimedCount > 0) {
    console.log(`Reclaimed ${reclaimedCount} stale notifications`);
  }
  
  // Claim notifications
  const { data: notifications, error: claimError } = await supabase
    .rpc('claim_notifications', { p_batch_size: BATCH_SIZE });
  
  if (claimError) {
    console.error('Claim error:', claimError);
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
  }
  
  if (!notifications?.length) {
    return new Response(JSON.stringify({ processed: 0, reclaimed: reclaimedCount || 0 }), { status: 200 });
  }
  
  // Get push tokens
  const userIds = [...new Set(notifications.map((n: any) => n.recipient_user_id))];
  
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);
  
  const tokenMap = new Map<string, string[]>();
  tokens?.forEach((t: any) => {
    const existing = tokenMap.get(t.user_id) || [];
    existing.push(t.token);
    tokenMap.set(t.user_id, existing);
  });
  
  const results: { id: string; success: boolean; error?: string }[] = [];
  
  for (const notif of notifications) {
    const userTokens = tokenMap.get(notif.recipient_user_id);
    
    if (!userTokens?.length) {
      await supabase.rpc('mark_notification_failed', {
        p_notification_id: notif.id,
        p_error_message: 'No active push tokens',
        p_retry: false,
      });
      results.push({ id: notif.id, success: false, error: 'No tokens' });
      continue;
    }
    
    const messages = userTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: { ...notif.data, notificationId: notif.id },
    }));
    
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      
      const tickets: ExpoPushTicket[] = await response.json();
      
      let anySuccess = false;
      
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = userTokens[i];
        
        if (ticket.status === 'ok') {
          anySuccess = true;
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          await supabase.rpc('disable_push_token', { p_token: token });
        }
      }
      
      if (anySuccess) {
        await supabase.rpc('mark_notification_sent', { p_notification_id: notif.id });
        results.push({ id: notif.id, success: true });
      } else {
        await supabase.rpc('mark_notification_failed', {
          p_notification_id: notif.id,
          p_error_message: 'All tokens failed',
          p_retry: true,
        });
        results.push({ id: notif.id, success: false, error: 'All tokens failed' });
      }
    } catch (err) {
      await supabase.rpc('mark_notification_failed', {
        p_notification_id: notif.id,
        p_error_message: err.message,
        p_retry: true,
      });
      results.push({ id: notif.id, success: false, error: err.message });
    }
  }
  
  return new Response(
    JSON.stringify({ processed: notifications.length, reclaimed: reclaimedCount || 0, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

### 4.2 Account Deletion
```typescript
// supabase/functions/delete-account/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  try {
    // Delete storage files with pagination
    for (const bucket of ['profile-photos', 'verification-docs']) {
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const { data: files } = await supabaseAdmin.storage
          .from(bucket)
          .list(user.id, { limit, offset });
        
        if (!files?.length) break;
        
        const paths = files.map(f => `${user.id}/${f.name}`);
        await supabaseAdmin.storage.from(bucket).remove(paths);
        
        if (files.length < limit) break;
        offset += limit;
      }
    }
    
    // Delete chat media
    const { data: participations } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);
    
    if (participations) {
      for (const p of participations) {
        let offset = 0;
        const limit = 100;
        
        while (true) {
          const { data: files } = await supabaseAdmin.storage
            .from('chat-media')
            .list(p.conversation_id, { limit, offset });
          
          if (!files?.length) break;
          
          const userFiles = files.filter(f => f.name.includes(user.id));
          if (userFiles.length) {
            const paths = userFiles.map(f => `${p.conversation_id}/${f.name}`);
            await supabaseAdmin.storage.from('chat-media').remove(paths);
          }
          
          if (files.length < limit) break;
          offset += limit;
        }
      }
    }
    
    // Delete user data
    await supabaseAdmin.rpc('delete_user_data', { p_user_id: user.id });
    
    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    return new Response(
      JSON.stringify({ error: 'Deletion failed', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.3 Image Moderation
```typescript
// supabase/functions/moderate-image/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as encodeBase64 } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

serve(async (req) => {
  const { imagePath, bucket } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get signed URL
  const { data: signedUrlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(imagePath, 300);
  
  if (!signedUrlData?.signedUrl) {
    return new Response(JSON.stringify({ error: 'Image not found' }), { status: 404 });
  }
  
  // Download and encode
  const imageResponse = await fetch(signedUrlData.signedUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = encodeBase64(new Uint8Array(imageBuffer));
  
  // Call Vision API
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  
  const visionResponse = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'SAFE_SEARCH_DETECTION' }],
      }],
    }),
  });
  
  const visionResult = await visionResponse.json();
  const safeSearch = visionResult.responses?.[0]?.safeSearchAnnotation;
  
  if (!safeSearch) {
    return new Response(JSON.stringify({ error: 'Vision API error' }), { status: 500 });
  }
  
  const isAdult = ['LIKELY', 'VERY_LIKELY'].includes(safeSearch.adult);
  const isViolent = ['LIKELY', 'VERY_LIKELY'].includes(safeSearch.violence);
  const isNsfw = isAdult || isViolent;
  
  // Queue if unsafe
  if (isNsfw) {
    const userId = imagePath.split('/')[0];
    
    await supabase.from('moderation_queue').insert({
      content_type: 'photo',
      content_ref: imagePath,
      content_id: null,
      content_user_id: userId,
      content_path: imagePath,
      auto_flag_reason: isAdult ? 'nsfw_adult' : 'nsfw_violence',
      auto_flag_score: 0.9,
    });
  }
  
  return new Response(JSON.stringify({
    safe: !isNsfw,
    scores: {
      adult: safeSearch.adult,
      violence: safeSearch.violence,
      racy: safeSearch.racy,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 5. CLIENT SERVICES

### 5.1 Photo Service
```typescript
// services/photoService.ts

import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const BUCKET = 'profile-photos';
const MAX_PHOTOS = 6;
const COMPRESSION_QUALITY = 0.8;

export const photoService = {
  async pickAndUpload(userId: string, index: number): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 1,
    });
    
    if (result.canceled) return null;
    
    const processed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1080 } }],
      { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    const timestamp = Date.now();
    const path = `${userId}/${timestamp}_${index}.jpg`;
    
    const response = await fetch(processed.uri);
    const blob = await response.blob();
    
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg' });
    
    if (error) throw error;
    
    // Moderate async
    supabase.functions.invoke('moderate-image', {
      body: { imagePath: path, bucket: BUCKET },
    }).catch(console.error);
    
    return path;
  },
  
  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Failed to create signed URL');
    return data.signedUrl;
  },
  
  async getSignedUrls(paths: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    await Promise.all(
      paths.map(async (path) => {
        try {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) results[path] = data.signedUrl;
        } catch (e) {
          console.error(`Failed to get signed URL for ${path}:`, e);
        }
      })
    );
    
    return results;
  },
  
  async deletePath(userId: string, path: string): Promise<void> {
    if (!path.startsWith(userId)) {
      throw new Error('Cannot delete others photos');
    }
    
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  },
  
  async updateProfilePhotos(userId: string, paths: string[]): Promise<void> {
    if (paths.length > MAX_PHOTOS) {
      throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ photo_paths: paths })
      .eq('id', userId);
    
    if (error) throw error;
  },
};
```

### 5.2 Chat Service
```typescript
// services/chatService.ts

import { supabase } from '@/lib/supabase';
import type { Message, Conversation } from '@/types';

export const chatService = {
  async createConversation(otherUserId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase.rpc('create_conversation', {
      p_user1_id: user.id,
      p_user2_id: otherUserId,
    });
    
    if (error) throw error;
    return data;
  },
  
  async sendMessage(
    conversationId: string, 
    content: string,
    messageType: 'text' | 'image' = 'text',
    mediaPath?: string
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        media_path: mediaPath,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async uploadChatMedia(conversationId: string, uri: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const timestamp = Date.now();
    const path = `${conversationId}/${user.id}_${timestamp}.jpg`;
    
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, blob, { contentType: 'image/jpeg' });
    
    if (error) throw error;
    return path;
  },
  
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (before) {
      query = query.lt('created_at', before);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  
  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversations (
          id,
          last_message_at,
          last_message_preview,
          last_message_sender_id
        )
      `)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('conversations(last_message_at)', { ascending: false });
    
    if (error) throw error;
    return data?.map(d => d.conversations).filter(Boolean) || [];
  },
  
  subscribeToMessages(conversationId: string, onMessage: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage(payload.new as Message)
      )
      .subscribe();
  },
  
  async markAsRead(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  },
};
```

### 5.3 Push Service
```typescript
// services/pushService.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export const pushService = {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require physical device');
      return null;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }
    
    // Get projectId from Constants
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.error('Missing EAS projectId');
      return null;
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    
    await this.saveToken(token);
    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    return token;
  },
  
  async saveToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token,
        platform: Platform.OS,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });
    
    if (error) console.error('Failed to save push token:', error);
  },
  
  async removeToken(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('push_tokens').delete().eq('user_id', user.id);
  },
};
```

### 5.4 Account Service
```typescript
// services/accountService.ts

import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const accountService = {
  async deleteAccount(): Promise<void> {
    const { error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    
    if (error) throw error;
    
    await AsyncStorage.clear();
    await supabase.auth.signOut();
  },
  
  async exportData(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const [profile, messages, matches, consents] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('messages').select('*').eq('sender_id', user.id),
      supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from('user_consents').select('*').eq('user_id', user.id),
    ]);
    
    return {
      exportDate: new Date().toISOString(),
      profile: profile.data,
      messages: messages.data,
      matches: matches.data,
      consents: consents.data,
    };
  },
};
```

---

## 6. SWIPE COMPONENT
```typescript
// components/SwipeableCard.tsx

import { useCallback } from 'react';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ROTATION_ANGLE = 15;

interface Props {
  profile: Profile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSuperLike?: () => void;
  isFirst: boolean;
}

export function SwipeableCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onSuperLike,
  isFirst,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isFirst ? 1 : 0.95);
  
  const handleSwipeComplete = useCallback((direction: 'left' | 'right' | 'up') => {
    if (direction === 'right') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSwipeRight();
    } else if (direction === 'left') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSwipeLeft();
    } else if (direction === 'up' && onSuperLike) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onSuperLike();
    }
  }, [onSwipeLeft, onSwipeRight, onSuperLike]);
  
  const gesture = Gesture.Pan()
    .enabled(isFirst)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const velocityX = event.velocityX;
      const velocityY = event.velocityY;
      
      // Swipe right
      if (translateX.value > SWIPE_THRESHOLD || velocityX > 500) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, (finished) => {
          if (finished) runOnJS(handleSwipeComplete)('right');
        });
        return;
      }
      
      // Swipe left
      if (translateX.value < -SWIPE_THRESHOLD || velocityX < -500) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, (finished) => {
          if (finished) runOnJS(handleSwipeComplete)('left');
        });
        return;
      }
      
      // Swipe up
      if ((translateY.value < -SWIPE_THRESHOLD * 1.5 || velocityY < -500) && onSuperLike) {
        translateY.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, (finished) => {
          if (finished) runOnJS(handleSwipeComplete)('up');
        });
        return;
      }
      
      // Snap back
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });
  
  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP
    );
    
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });
  
  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  
  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));
  
  const superLikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD * 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        <ProfileCardContent profile={profile} />
        
        <Animated.View style={[styles.stamp, styles.likeStamp, likeOpacity]}>
          <Text style={[styles.stampText, { color: '#4CAF50' }]}>LIKE</Text>
        </Animated.View>
        
        <Animated.View style={[styles.stamp, styles.nopeStamp, nopeOpacity]}>
          <Text style={[styles.stampText, { color: '#F44336' }]}>NOPE</Text>
        </Animated.View>
        
        {onSuperLike && (
          <Animated.View style={[styles.stamp, styles.superLikeStamp, superLikeOpacity]}>
            <Text style={[styles.stampText, { color: '#2196F3' }]}>SUPER</Text>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stamp: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: 8,
  },
  stampText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  likeStamp: {
    left: 24,
    borderColor: '#4CAF50',
    transform: [{ rotate: '-20deg' }],
  },
  nopeStamp: {
    right: 24,
    borderColor: '#F44336',
    transform: [{ rotate: '20deg' }],
  },
  superLikeStamp: {
    alignSelf: 'center',
    left: '50%',
    marginLeft: -60,
    borderColor: '#2196F3',
  },
});
```

---

## 7. EXECUTION ORDER
```
1. SQL Migration     → Supabase SQL Editor'da çalıştır
2. Edge Functions    → supabase functions deploy push-worker delete-account moderate-image
3. Client Services   → Kod dosyalarını güncelle
4. Swipe Component   → UI component'i güncelle
5. Fix Orchestrator  → Fix agent'ları çalıştır
```

---

## 8. VERIFICATION CHECKLIST

### Database
- [ ] SQL migration hatasız çalıştı
- [ ] `notification_outbox.processing_started_at` kolonu var
- [ ] `create_conversation` match olmadan hata veriyor
- [ ] `reclaim_stale_notifications` RPC çalışıyor
- [ ] Realtime publication'lar eklendi

### Edge Functions
- [ ] Push worker sadece CRON_SECRET ile çalışıyor
- [ ] Account deletion storage pagination ile çalışıyor
- [ ] Moderate-image base64 encode doğru

### Client
- [ ] PhotoService.getSignedUrl düzgün çalışıyor
- [ ] PushService Expo projectId alıyor
- [ ] ChatService match kontrolü RPC'den geliyor
- [ ] Swipe callback animation bitince çağrılıyor

---

## STARTUP COMMAND
```
VITALIS_ARCHITECTURE_v2.0.2_PRODUCTION.md dosyasını oku.

Bu Production-Ready Architecture.

SIRASYLA UYGULA:
1. Section 3 SQL'i Supabase'de çalıştır
2. Section 4 Edge Functions deploy et
3. Section 5 Client Services güncelle
4. Section 6 Swipe Component güncelle
5. FIX ORCHESTRATOR çalıştır

🚀 BAŞLA
```

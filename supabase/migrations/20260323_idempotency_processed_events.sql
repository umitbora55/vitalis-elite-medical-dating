-- ─── Idempotency: processed_events tablosu ve RPC'ler ────────────────────────
-- Release protokolü Bölüm 3: Webhook & event idempotency
--
-- 4 durum modeli:
--   processing     → İşleniyor (lock aktif)
--   processed      → Başarıyla tamamlandı
--   failed_retryable → Geçici hata, retry bekliyor
--   failed_fatal     → Kalıcı hata, manuel müdahale gerekli
--
-- Retry schedule (deterministik): 1m → 5m → 15m → fatal
-- Concurrency: SKIP LOCKED ile aynı satır iki worker tarafından alınamaz
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tablo ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processed_events (
  provider       TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  event_type     TEXT,
  -- TEXT + CHECK: ENUM alter riskli; bu pattern daha güvenli
  status         TEXT NOT NULL DEFAULT 'processing'
    CONSTRAINT processed_events_valid_status
    CHECK (status IN ('processing', 'processed', 'failed_retryable', 'failed_fatal')),
  locked_until   TIMESTAMPTZ,
  retry_count    INTEGER NOT NULL DEFAULT 0,
  error_code     TEXT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ,
  metadata       JSONB,

  PRIMARY KEY (provider, event_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_processed_events_created
  ON processed_events (created_at);

CREATE INDEX IF NOT EXISTS idx_processed_events_retry
  ON processed_events (status, locked_until)
  WHERE status IN ('processing', 'failed_retryable');

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
-- processed_events sadece service_role tarafından okunabilir.
-- Kullanıcılar bu tabloyu göremez.
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

-- Hiçbir authenticated kullanıcı bu tabloyu göremez (service_role bypass eder)
-- Politika yok = tüm authenticated erişim reddedilir.

-- ── 3. Atomic INSERT RPC ─────────────────────────────────────────────────────
-- Tek atomik INSERT: race condition koruması.
-- RETURNS JSONB (TABLE dönüş array olur — KAÇIN).

CREATE OR REPLACE FUNCTION process_webhook_atomic(
  p_provider     TEXT,
  p_event_id     TEXT,
  p_event_type   TEXT DEFAULT NULL,
  p_locked_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Tek atomik INSERT: ON CONFLICT DO NOTHING
  -- FOUND = true → yeni kayıt (bu event ilk kez görülüyor)
  -- FOUND = false → duplicate (daha önce işlendi/işleniyor)
  INSERT INTO processed_events (provider, event_id, event_type, status, locked_until)
  VALUES (p_provider, p_event_id, p_event_type, 'processing', p_locked_until)
  ON CONFLICT (provider, event_id) DO NOTHING;

  IF FOUND THEN
    v_result := jsonb_build_object('is_new', true, 'status', 'processing');
  ELSE
    SELECT jsonb_build_object('is_new', false, 'status', pe.status)
    INTO v_result
    FROM processed_events pe
    WHERE pe.provider = p_provider AND pe.event_id = p_event_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ── 4. Event tamamlama RPC ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_processed_event(
  p_provider   TEXT,
  p_event_id   TEXT,
  p_metadata   JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE processed_events
  SET
    status       = 'processed',
    locked_until = NULL,
    processed_at = NOW(),
    metadata     = COALESCE(p_metadata, metadata)
  WHERE provider = p_provider AND event_id = p_event_id;
END;
$$;

-- ── 5. Event başarısız işaretleme RPC ────────────────────────────────────────

CREATE OR REPLACE FUNCTION fail_processed_event(
  p_provider     TEXT,
  p_event_id     TEXT,
  p_error_code   TEXT DEFAULT NULL,
  p_error_msg    TEXT DEFAULT NULL,
  p_fatal        BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_retry_count INTEGER;
  v_new_status  TEXT;
  v_backoff     INTERVAL;
  -- Deterministik backoff schedule: 1m → 5m → 15m → fatal
  v_schedule    INTEGER[] := ARRAY[1, 5, 15]; -- dakika cinsinden
BEGIN
  SELECT retry_count INTO v_retry_count
  FROM processed_events
  WHERE provider = p_provider AND event_id = p_event_id;

  IF p_fatal OR v_retry_count >= array_length(v_schedule, 1) THEN
    v_new_status := 'failed_fatal';
    v_backoff    := NULL;
  ELSE
    v_new_status := 'failed_retryable';
    v_backoff    := (v_schedule[LEAST(v_retry_count + 1, array_length(v_schedule, 1))] || ' minutes')::INTERVAL;
  END IF;

  UPDATE processed_events
  SET
    status        = v_new_status,
    locked_until  = CASE WHEN v_backoff IS NOT NULL THEN NOW() + v_backoff ELSE NULL END,
    error_code    = p_error_code,
    error_message = p_error_msg
  WHERE provider = p_provider AND event_id = p_event_id;
END;
$$;

-- ── 6. Stale reclaim worker (SKIP LOCKED) ───────────────────────────────────
-- ÖNEMLİ: Bu fonksiyon tek transaction içinde çalışır.
-- FOR UPDATE SKIP LOCKED lock'ı transaction bitene kadar tutulur.
-- Fonksiyonu iki ayrı query'ye BÖLME — lock garantisi kaybolur.

CREATE OR REPLACE FUNCTION claim_next_events(
  p_batch_size INTEGER DEFAULT 1
)
RETURNS SETOF processed_events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT *
    FROM processed_events
    WHERE
      (
        -- Stale processing (lock süresi dolmuş)
        (status = 'processing' AND locked_until < NOW())
        OR
        -- Retry için hazır
        (status = 'failed_retryable' AND (locked_until IS NULL OR locked_until < NOW()))
      )
      AND retry_count < 3
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE processed_events pe
  SET
    locked_until = NOW() + INTERVAL '5 minutes',
    retry_count  = retry_count + 1
  FROM claimed c
  WHERE pe.provider = c.provider AND pe.event_id = c.event_id
  RETURNING pe.*;
END;
$$;

-- ── 7. Eski kayıt temizleme (90 gün) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_old_processed_events(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM processed_events
  WHERE status IN ('processed', 'failed_fatal')
    AND created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ── 8. Yorumlar ──────────────────────────────────────────────────────────────

COMMENT ON TABLE processed_events IS
  'Webhook & event idempotency tablosu. '
  'Her provider+event_id çifti sadece bir kez işlenir. '
  'Retry schedule: 1m → 5m → 15m → failed_fatal. '
  'Release Protokolü Bölüm 3.';

COMMENT ON FUNCTION process_webhook_atomic IS
  'Atomic INSERT with ON CONFLICT DO NOTHING. '
  'Returns {is_new: bool, status: text}. '
  'JSONB döner (TABLE yerine) — array wrapper sorunu olmaz.';

COMMENT ON FUNCTION claim_next_events IS
  'SKIP LOCKED ile güvenli worker claim. '
  'Tek transaction içinde çalışır — ayrı querylere bölme.';

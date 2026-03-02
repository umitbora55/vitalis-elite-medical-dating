-- ============================================================
-- VITALIS: Liveness + Healthcare Identity Verification System
-- Migration: 20260228_liveness_verification_system.sql
-- ============================================================

-- ── 1. HEALTHCARE DOMAINS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS healthcare_domains (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        TEXT NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN (
    'devlet_hastanesi', 'ozel_hastane', 'universite_tip', 'eczane',
    'laboratuvar', 'saglik_bakanligi', 'meslek_odasi', 'diger'
  )),
  city          TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT true,
  tier          INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1,2,3)),
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  verified_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_healthcare_domains_domain ON healthcare_domains(domain);
CREATE INDEX IF NOT EXISTS idx_healthcare_domains_type ON healthcare_domains(institution_type);

-- Seed initial Turkish healthcare domains
INSERT INTO healthcare_domains (domain, institution_name, institution_type, city, tier) VALUES
  -- Tier 1: Devlet / Bakanlık
  ('saglik.gov.tr',         'T.C. Sağlık Bakanlığı',              'saglik_bakanligi', 'Ankara', 1),
  ('*.saglik.gov.tr',       'Sağlık Bakanlığı Bağlı Kurum',       'devlet_hastanesi', NULL,     1),
  -- Üniversiteler (Tıp Fakülteleri)
  ('*.edu.tr',              'Türkiye Üniversitesi',                'universite_tip',   NULL,     1),
  ('istanbul.edu.tr',       'İstanbul Üniversitesi',               'universite_tip',   'İstanbul', 1),
  ('hacettepe.edu.tr',      'Hacettepe Üniversitesi',              'universite_tip',   'Ankara',   1),
  ('itu.edu.tr',            'İstanbul Teknik Üniversitesi',        'universite_tip',   'İstanbul', 1),
  ('metu.edu.tr',           'Orta Doğu Teknik Üniversitesi',       'universite_tip',   'Ankara',   1),
  ('gazi.edu.tr',           'Gazi Üniversitesi',                   'universite_tip',   'Ankara',   1),
  ('ege.edu.tr',            'Ege Üniversitesi',                    'universite_tip',   'İzmir',    1),
  ('deu.edu.tr',            'Dokuz Eylül Üniversitesi',            'universite_tip',   'İzmir',    1),
  ('marmara.edu.tr',        'Marmara Üniversitesi',                'universite_tip',   'İstanbul', 1),
  ('baskent.edu.tr',        'Başkent Üniversitesi',                'universite_tip',   'Ankara',   1),
  ('bilkent.edu.tr',        'Bilkent Üniversitesi',                'universite_tip',   'Ankara',   1),
  ('koc.edu.tr',            'Koç Üniversitesi',                    'universite_tip',   'İstanbul', 1),
  ('sabanciuniv.edu',       'Sabancı Üniversitesi',                'universite_tip',   'İstanbul', 1),
  -- Özel Hastane Zincirleri (Tier 2)
  ('memorial.com.tr',       'Memorial Hastanesi',                  'ozel_hastane',     NULL,       2),
  ('acibadem.com',          'Acıbadem Sağlık Grubu',               'ozel_hastane',     NULL,       2),
  ('medicana.com.tr',       'Medicana Hastanesi',                  'ozel_hastane',     NULL,       2),
  ('medicalpark.com.tr',    'Medical Park Hastanesi',              'ozel_hastane',     NULL,       2),
  ('liv.com.tr',            'Liv Hospital',                        'ozel_hastane',     NULL,       2),
  ('florence.com.tr',       'Florence Nightingale Hastanesi',      'ozel_hastane',     NULL,       2),
  ('americanhospital.com.tr','American Hospital',                  'ozel_hastane',     'İstanbul', 2),
  ('istinye.com.tr',        'İstinye Üniversitesi Hastanesi',      'ozel_hastane',     'İstanbul', 2),
  ('bayindir.com',          'Bayındır Sağlık Grubu',               'ozel_hastane',     NULL,       2),
  ('dunyagoz.com',          'Dünya Göz Hastanesi',                 'ozel_hastane',     NULL,       2),
  ('guneyklinik.com.tr',    'Güney Klinik',                        'ozel_hastane',     NULL,       2),
  -- Meslek Odaları (Tier 1)
  ('ttb.org.tr',            'Türk Tabipleri Birliği',              'meslek_odasi',     'Ankara',   1),
  ('teb.org.tr',            'Türk Eczacıları Birliği',             'meslek_odasi',     'Ankara',   1),
  ('thod.org.tr',           'Türk Hemşireler Derneği',             'meslek_odasi',     'Ankara',   1),
  ('tfd.org.tr',            'Türkiye Fizyoterapistler Derneği',    'meslek_odasi',     'Ankara',   1),
  ('tdbd.org.tr',           'Türk Diş Hekimleri Birliği',         'meslek_odasi',     'Ankara',   1),
  -- Eczane Zincirleri (Tier 2)
  ('semercioglu.com.tr',    'Semercioglu Eczane Grubu',            'eczane',           NULL,       2),
  ('gratis.com.tr',         'Gratis',                              'eczane',           NULL,       2)
ON CONFLICT (domain) DO NOTHING;

-- ── 2. DOMAIN ADDITION REQUESTS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domain_addition_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT,
  city          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   UUID,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_requests_status ON domain_addition_requests(status);
CREATE INDEX IF NOT EXISTS idx_domain_requests_user ON domain_addition_requests(user_id);

-- ── 3. NAME-EMAIL MATCH LOGS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS name_email_match_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  match_score   INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_details JSONB,
  decision      TEXT NOT NULL CHECK (decision IN ('auto_approved','manual_review','rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_name_email_match_user ON name_email_match_logs(user_id);

-- ── 4. LIVENESS CHECKS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liveness_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token   TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','processing','passed','failed','manual_review','rejected'
  )),
  liveness_score  NUMERIC(5,4) CHECK (liveness_score >= 0 AND liveness_score <= 1),
  challenges_completed JSONB DEFAULT '[]',
  failure_reason  TEXT,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  video_storage_path TEXT,
  face_embedding_id UUID,
  device_fingerprint JSONB,
  ip_address      INET,
  user_agent      TEXT,
  anti_spoof_signals JSONB,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_liveness_checks_user ON liveness_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_liveness_checks_status ON liveness_checks(status);
CREATE INDEX IF NOT EXISTS idx_liveness_checks_created ON liveness_checks(created_at DESC);

-- ── 5. FACE EMBEDDINGS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS face_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  embedding_type  TEXT NOT NULL CHECK (embedding_type IN ('liveness', 'profile_photo')),
  source_path     TEXT,
  embedding_data  JSONB NOT NULL,     -- 512-dim or 128-dim vector as JSON array
  embedding_model TEXT NOT NULL DEFAULT 'facenet_v1',
  quality_score   NUMERIC(5,4),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_embeddings_user ON face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_type ON face_embeddings(embedding_type, user_id);

-- ── 6. FACE MATCH RESULTS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS face_match_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_embedding_id UUID REFERENCES face_embeddings(id),
  target_embedding_id UUID REFERENCES face_embeddings(id),
  similarity_score NUMERIC(5,4) NOT NULL,
  match_decision  TEXT NOT NULL CHECK (match_decision IN ('matched','no_match','manual_review')),
  match_type      TEXT NOT NULL CHECK (match_type IN ('1to1_selfie_profile','1toN_duplicate')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_match_user ON face_match_results(user_id);

-- ── 7. FRAUD SIGNALS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type     TEXT NOT NULL CHECK (signal_type IN (
    'duplicate_face','stolen_photo','vpn_detected','datacenter_ip',
    'velocity_device','velocity_ip','velocity_phone','ban_evasion',
    'deepfake_detected','spoof_detected','name_mismatch'
  )),
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  details         JSONB,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON fraud_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_type ON fraud_signals(signal_type, severity);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_unresolved ON fraud_signals(resolved, created_at DESC) WHERE NOT resolved;

-- ── 8. RISK SCORES TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_risk_scores (
  user_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  liveness_score      INTEGER NOT NULL DEFAULT 0 CHECK (liveness_score BETWEEN 0 AND 100),
  face_match_score    INTEGER NOT NULL DEFAULT 0 CHECK (face_match_score BETWEEN 0 AND 100),
  duplicate_risk      INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_risk BETWEEN 0 AND 100),
  device_risk         INTEGER NOT NULL DEFAULT 0 CHECK (device_risk BETWEEN 0 AND 100),
  network_risk        INTEGER NOT NULL DEFAULT 0 CHECK (network_risk BETWEEN 0 AND 100),
  total_risk          INTEGER GENERATED ALWAYS AS (
    LEAST(100, (liveness_score + face_match_score + duplicate_risk + device_risk + network_risk) / 5)
  ) STORED,
  risk_level          TEXT NOT NULL DEFAULT 'unknown' CHECK (risk_level IN (
    'low','medium','high','critical','unknown'
  )),
  last_calculated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. TRUST BADGES TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_trust_badges (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  liveness_verified BOOLEAN NOT NULL DEFAULT false,
  liveness_verified_at TIMESTAMPTZ,
  healthcare_verified BOOLEAN NOT NULL DEFAULT false,
  healthcare_verified_at TIMESTAMPTZ,
  institution_verified BOOLEAN NOT NULL DEFAULT false,
  institution_verified_at TIMESTAMPTZ,
  institution_name  TEXT,
  photo_changed_since_liveness BOOLEAN NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. APPEALS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_appeals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appeal_type     TEXT NOT NULL CHECK (appeal_type IN (
    'liveness_failed','face_mismatch','document_rejected',
    'duplicate_detected','account_suspended','other'
  )),
  description     TEXT,
  additional_doc_path TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','under_review','approved','rejected','escalated'
  )),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  decision_notes  TEXT,
  sla_due_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appeals_user ON verification_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON verification_appeals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_appeals_sla ON verification_appeals(sla_due_at) WHERE status IN ('pending','under_review');

-- ── 11. EXTEND profiles TABLE ─────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS liveness_verified       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liveness_verified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liveness_check_id       UUID,
  ADD COLUMN IF NOT EXISTS face_embedding_id       UUID,
  ADD COLUMN IF NOT EXISTS name_match_score        INTEGER,
  ADD COLUMN IF NOT EXISTS name_match_decision     TEXT,
  ADD COLUMN IF NOT EXISTS corporate_domain        TEXT,
  ADD COLUMN IF NOT EXISTS corporate_institution   TEXT,
  ADD COLUMN IF NOT EXISTS institution_tier        INTEGER;

-- ── 12. ROW LEVEL SECURITY ────────────────────────────────────────────────────

-- liveness_checks
ALTER TABLE liveness_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own liveness checks" ON liveness_checks;
DROP POLICY IF EXISTS "Users can read own liveness checks" ON liveness_checks;
DROP POLICY IF EXISTS "Moderators can manage liveness checks" ON liveness_checks;

CREATE POLICY "Users can insert own liveness checks"
  ON liveness_checks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own liveness checks"
  ON liveness_checks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Moderators can manage liveness checks"
  ON liveness_checks FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- face_embeddings
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own face embeddings" ON face_embeddings;
DROP POLICY IF EXISTS "Moderators can manage face embeddings" ON face_embeddings;

CREATE POLICY "Users can insert own face embeddings"
  ON face_embeddings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Embeddings are NOT readable by users for privacy
CREATE POLICY "Moderators can manage face embeddings"
  ON face_embeddings FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- fraud_signals
ALTER TABLE fraud_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can manage fraud signals" ON fraud_signals;

CREATE POLICY "Moderators can manage fraud signals"
  ON fraud_signals FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- user_risk_scores
ALTER TABLE user_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can manage risk scores" ON user_risk_scores;

CREATE POLICY "Moderators can manage risk scores"
  ON user_risk_scores FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- user_trust_badges
ALTER TABLE user_trust_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own trust badges" ON user_trust_badges;
DROP POLICY IF EXISTS "Moderators can manage trust badges" ON user_trust_badges;

CREATE POLICY "Users can read own trust badges"
  ON user_trust_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Moderators can manage trust badges"
  ON user_trust_badges FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- verification_appeals
ALTER TABLE verification_appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own appeals" ON verification_appeals;
DROP POLICY IF EXISTS "Users can read own appeals" ON verification_appeals;
DROP POLICY IF EXISTS "Moderators can manage appeals" ON verification_appeals;

CREATE POLICY "Users can insert own appeals"
  ON verification_appeals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own appeals"
  ON verification_appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Moderators can manage appeals"
  ON verification_appeals FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- healthcare_domains
ALTER TABLE healthcare_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read verified domains" ON healthcare_domains;
DROP POLICY IF EXISTS "Moderators can manage domains" ON healthcare_domains;

CREATE POLICY "Anyone can read verified domains"
  ON healthcare_domains FOR SELECT TO authenticated
  USING (is_verified = true);

CREATE POLICY "Moderators can manage domains"
  ON healthcare_domains FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- domain_addition_requests
ALTER TABLE domain_addition_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert domain requests" ON domain_addition_requests;
DROP POLICY IF EXISTS "Users can read own domain requests" ON domain_addition_requests;
DROP POLICY IF EXISTS "Moderators can manage domain requests" ON domain_addition_requests;

CREATE POLICY "Users can insert domain requests"
  ON domain_addition_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own domain requests"
  ON domain_addition_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Moderators can manage domain requests"
  ON domain_addition_requests FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- name_email_match_logs
ALTER TABLE name_email_match_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can manage name match logs" ON name_email_match_logs;

CREATE POLICY "Moderators can manage name match logs"
  ON name_email_match_logs FOR ALL TO authenticated
  USING (public.auth_has_moderation_access());

-- ── 13. STORAGE BUCKET: liveness-videos ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('liveness-videos', 'liveness-videos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can upload own liveness videos" ON storage.objects;
DROP POLICY IF EXISTS "Moderators can read liveness videos" ON storage.objects;

CREATE POLICY "Users can upload own liveness videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'liveness-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Moderators can read liveness videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'liveness-videos'
  AND public.auth_has_moderation_access()
);

-- ── 14. AUTO-ESCALATE SLA FUNCTION ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION escalate_overdue_appeals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE verification_appeals
  SET status = 'escalated', priority = 'urgent', updated_at = NOW()
  WHERE status IN ('pending','under_review')
    AND sla_due_at < NOW()
    AND priority != 'urgent';
END;
$$;

-- ── 15. RISK LEVEL TRIGGER ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_risk_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.risk_level := CASE
    WHEN NEW.total_risk <= 30 THEN 'low'
    WHEN NEW.total_risk <= 60 THEN 'medium'
    WHEN NEW.total_risk <= 80 THEN 'high'
    ELSE 'critical'
  END;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_risk_level ON user_risk_scores;
CREATE TRIGGER trg_update_risk_level
  BEFORE INSERT OR UPDATE ON user_risk_scores
  FOR EACH ROW EXECUTE FUNCTION update_risk_level();

-- ── 16. COMMENTS (KVKK/GDPR) ─────────────────────────────────────────────────
COMMENT ON TABLE face_embeddings IS 'Özel nitelikli biyometrik veri - KVKK Md.6 kapsamında işleniyor. Açık rıza şarttır. Saklama süresi: hesap silmeye kadar (şifreli).';
COMMENT ON TABLE liveness_checks IS 'Canlılık doğrulama oturumları. Video dosyaları 7 gün, metadata süresiz saklanır.';
COMMENT ON TABLE face_match_results IS 'Yüz karşılaştırma sonuçları. Ham skorlar saklanmaz, yalnızca karar ve özet.';

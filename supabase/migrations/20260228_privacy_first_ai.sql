-- ============================================================
-- Feature 8: Privacy-First AI
-- GDPR Article 22 & 25, EU AI Act, DSA Article 27 uyumu.
-- Kullanıcı rızası, AI karar logu, model registry.
-- ============================================================

-- ── 1. Model Registry ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_model_registry (
  model_id         TEXT PRIMARY KEY,             -- 'content_moderation_v1'
  feature_key      TEXT NOT NULL UNIQUE,         -- 'content_moderation'
  display_name_tr  TEXT NOT NULL,                -- 'İçerik Moderasyonu'
  description_tr   TEXT NOT NULL,
  model_type       TEXT NOT NULL,                -- 'rule_based' | 'statistical' | 'neural'
  input_fields     TEXT[] NOT NULL,              -- ['message_text']
  output_type      TEXT NOT NULL,                -- 'classification' | 'ranking' | 'score' | 'flag'
  is_security      BOOLEAN NOT NULL DEFAULT FALSE,  -- Kapatılamaz
  gdpr_article_22  BOOLEAN NOT NULL DEFAULT FALSE,  -- Otomatik karar mı?
  human_review_required_for TEXT,                -- 'perm_ban' vs NULL
  data_retention_days INT DEFAULT 90,
  last_bias_audit  DATE,
  version          TEXT DEFAULT '1.0.0',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Model kartları (seed)
INSERT INTO ai_model_registry
  (model_id, feature_key, display_name_tr, description_tr, model_type,
   input_fields, output_type, is_security, gdpr_article_22, human_review_required_for, data_retention_days)
VALUES
('content_moderation_v1', 'content_moderation',
  'İçerik Moderasyonu',
  'Chat mesajlarında taciz, tehdit ve dolandırıcılık örüntülerini tespit eder. Kural tabanlı, açıklanabilir.',
  'rule_based',
  ARRAY['message_text'],
  'classification',
  TRUE, TRUE, 'perm_ban', 30),

('slate_recommendation_v1', 'slate_recommendation',
  'Günlük Öneri Sıralaması',
  'Günlük 7 profil önerisi için uyumluluk, güven ve tazelik skorlarını hesaplar.',
  'rule_based',
  ARRAY['profile_role', 'profile_distance', 'schedule', 'verification_status', 'exposure_count'],
  'ranking',
  FALSE, TRUE, NULL, 90),

('explanation_engine_v1', 'explanation_engine',
  'Eşleşme Açıklaması',
  'İki profil arasındaki uyumluluğu 11 faktörle açıklar. Yalnızca kullanıcının paylaştığı verileri kullanır.',
  'rule_based',
  ARRAY['role', 'specialty', 'schedule', 'location', 'interests', 'looking_for', 'lifestyle'],
  'classification',
  FALSE, FALSE, NULL, 180),

('liveness_check_v1', 'liveness_check',
  'Canlılık Doğrulaması',
  'Video selfie üzerinden kimlik doğrulama. Biyometrik veri (yüz vektörü) işlenir.',
  'rule_based',
  ARRAY['video_blob', 'device_signals'],
  'score',
  FALSE, TRUE, 'identity_rejection', 90),

('name_email_match_v1', 'name_email_match',
  'İsim-E-posta Eşleşmesi',
  'Kurumsal e-posta adresi ile kullanıcı adını Levenshtein mesafesi ile karşılaştırır.',
  'rule_based',
  ARRAY['email_local_part', 'first_name', 'last_name'],
  'score',
  FALSE, TRUE, 'manual_review', 180),

('risk_scoring_v1', 'risk_scoring',
  'Profil Risk Skoru',
  'Hesap yaşı, doğrulama durumu ve şikayet sayısına göre güven skoru hesaplar.',
  'rule_based',
  ARRAY['account_age_days', 'verification_status', 'reports_count', 'fraud_signals'],
  'score',
  FALSE, TRUE, 'profile_hide', 90),

('compatibility_scoring_v1', 'compatibility_scoring',
  'Uyumluluk Skoru',
  'Profil kartında gösterilen %X uyumluluk skoru. Bilgi amaçlı, eşleşmeyi etkilemez.',
  'rule_based',
  ARRAY['interests', 'role', 'distance', 'lifestyle', 'looking_for'],
  'score',
  FALSE, FALSE, NULL, 0)

ON CONFLICT (feature_key) DO UPDATE SET
  description_tr = EXCLUDED.description_tr,
  version = EXCLUDED.version;

-- ── 2. Kullanıcı AI Rızası ───────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_consent (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key    TEXT NOT NULL REFERENCES ai_model_registry(feature_key),
  consented      BOOLEAN NOT NULL DEFAULT TRUE,
  consented_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at     TIMESTAMPTZ,
  consent_version TEXT NOT NULL DEFAULT '2026-02',
  ip_hash        TEXT,          -- Hashed IP (privacy preserved)
  user_agent_hash TEXT,         -- Hashed UA
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_consent_user
  ON ai_consent(user_id, feature_key);

-- ── 3. AI Rıza Değişiklik Kaydı ─────────────────────────────

CREATE TABLE IF NOT EXISTS ai_consent_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL,
  old_value    BOOLEAN,
  new_value    BOOLEAN NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash      TEXT,
  user_agent_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_consent_audit_user
  ON ai_consent_audit_log(user_id, changed_at DESC);

-- ── 4. AI Kullanım Logu ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature_key     TEXT NOT NULL,
  model_id        TEXT NOT NULL,
  input_hash      TEXT,          -- SHA-256 of input (no raw PII)
  output_summary  TEXT,          -- Human-readable summary of output
  confidence      NUMERIC(4,3),  -- 0.000 - 1.000
  action_taken    TEXT,          -- 'allow' | 'warn' | 'block' | 'flag' | 'rank'
  human_override  BOOLEAN NOT NULL DEFAULT FALSE,
  human_reviewer  UUID REFERENCES profiles(id),
  consent_given   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- GDPR: TTL enforced by cron based on model's data_retention_days
  expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
  ON ai_usage_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature
  ON ai_usage_log(feature_key, created_at DESC);

-- ── 5. Yüz Vektörü Saklama Süre Sınırı ─────────────────────

ALTER TABLE face_embeddings
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ
    DEFAULT NOW() + INTERVAL '90 days';

ALTER TABLE liveness_checks
  ADD COLUMN IF NOT EXISTS video_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '2026-02';

-- ── 6. Profiles: AI Rıza Özeti ──────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_opt_out_features TEXT[] DEFAULT '{}';
  -- Örn: ['slate_recommendation', 'explanation_engine']
  -- 'content_moderation' bu listeye eklenemez (güvenlik AI)

-- ── 7. Yardımcı Fonksiyon: Rıza Kontrolü ────────────────────

CREATE OR REPLACE FUNCTION user_has_ai_consent(
  p_user_id   UUID,
  p_feature   TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_is_security BOOLEAN;
  v_consented   BOOLEAN;
BEGIN
  -- Güvenlik AI'ları her zaman açık
  SELECT is_security INTO v_is_security
  FROM ai_model_registry WHERE feature_key = p_feature;

  IF v_is_security THEN RETURN TRUE; END IF;

  -- Kullanıcı rızasını kontrol et
  SELECT consented INTO v_consented
  FROM ai_consent
  WHERE user_id = p_user_id AND feature_key = p_feature;

  -- Kayıt yoksa: varsayılan açık (GDPR: legitimate interest için)
  RETURN COALESCE(v_consented, TRUE);
END;
$$;

-- ── 8. Süre Dolan Veriyi Silme Fonksiyonu ───────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_ai_data()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- AI usage logları
  DELETE FROM ai_usage_log WHERE expires_at < NOW();

  -- Yüz vektörleri
  DELETE FROM face_embeddings WHERE retention_expires_at < NOW();

  -- NOT: Gerçek video dosyası Storage API üzerinden silinmeli
  -- Bu fonksiyon sadece DB kayıtlarını temizler
  UPDATE liveness_checks
  SET video_deleted_at = NOW()
  WHERE video_deleted_at IS NULL
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ── 9. RLS ──────────────────────────────────────────────────

ALTER TABLE ai_model_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_registry_public_read" ON ai_model_registry
  FOR SELECT USING (TRUE);

ALTER TABLE ai_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_consent_own_all" ON ai_consent
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "ai_consent_admin_read" ON ai_consent
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND user_role IN ('moderator', 'admin', 'superadmin'))
  );

ALTER TABLE ai_consent_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_consent_audit_own_read" ON ai_consent_audit_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_consent_audit_insert" ON ai_consent_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_consent_audit_admin" ON ai_consent_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND user_role IN ('moderator', 'admin', 'superadmin'))
  );

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_own_read" ON ai_usage_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_usage_admin_all" ON ai_usage_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND user_role IN ('moderator', 'admin', 'superadmin'))
  );

-- ── 10. Şeffaflık Görünümü ──────────────────────────────────

CREATE OR REPLACE VIEW ai_usage_stats AS
SELECT
  feature_key,
  COUNT(*)                                                        AS total_uses,
  COUNT(*) FILTER (WHERE action_taken = 'block')                  AS blocks,
  COUNT(*) FILTER (WHERE action_taken = 'warn')                   AS warns,
  COUNT(*) FILTER (WHERE human_override = TRUE)                   AS human_overrides,
  COUNT(*) FILTER (WHERE consent_given = FALSE)                   AS uses_without_consent,
  ROUND(AVG(confidence)::NUMERIC, 3)                              AS avg_confidence,
  DATE_TRUNC('month', created_at)                                 AS month
FROM ai_usage_log
WHERE created_at > NOW() - INTERVAL '12 months'
GROUP BY feature_key, DATE_TRUNC('month', created_at)
ORDER BY month DESC, feature_key;

GRANT SELECT ON ai_usage_stats TO authenticated;
GRANT SELECT ON ai_model_registry TO anon, authenticated;

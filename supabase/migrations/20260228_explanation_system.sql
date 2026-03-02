-- ============================================================
-- VITALIS: "Neden Eşleştik" Açıklama Sistemi
-- Migration: 20260228_explanation_system.sql
-- DSA Article 27 uyumlu recommender transparency
-- ============================================================

-- ── 1. EXPLANATION TEMPLATES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS explanation_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key    TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables     JSONB NOT NULL DEFAULT '[]',
  tone          TEXT NOT NULL DEFAULT 'positive' CHECK (tone IN ('neutral','positive','encouraging')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  ab_variant    TEXT NOT NULL DEFAULT 'A',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explanation_templates_factor ON explanation_templates(factor_key, is_active);

-- Seed templates for all 11 factors
INSERT INTO explanation_templates (factor_key, template_text, variables, tone, ab_variant) VALUES
  -- Dating Intention
  ('dating_intention', 'İkiniz de ciddi bir ilişki arıyorsunuz', '[]', 'positive', 'A'),
  ('dating_intention', 'İlişki beklentileriniz uyumlu', '[]', 'neutral', 'B'),
  ('dating_intention', 'İkiniz de evliliği düşünüyorsunuz', '[]', 'positive', 'A'),
  ('dating_intention', 'İkiniz de önce arkadaşlık istiyorsunuz', '[]', 'positive', 'A'),
  -- Profession
  ('profession', 'İkiniz de doktorsunuz', '[]', 'positive', 'A'),
  ('profession', 'İkiniz de sağlık sektöründe çalışıyorsunuz', '[]', 'neutral', 'A'),
  ('profession', 'Mesleki olarak birbirinizi anlayabilirsiniz', '[]', 'encouraging', 'B'),
  ('profession', 'İş hayatınızın zorluklarını paylaşabilirsiniz', '[]', 'encouraging', 'A'),
  -- Work Schedule
  ('work_schedule', 'Çalışma saatleriniz uyumlu', '[]', 'positive', 'A'),
  ('work_schedule', 'İkiniz de vardiyalı çalışıyorsunuz, birbirinizi anlarsınız', '[]', 'encouraging', 'A'),
  ('work_schedule', 'Gece nöbetlerinin zorluğunu ikiniz de biliyorsunuz', '[]', 'encouraging', 'B'),
  ('work_schedule', 'Hafta sonları ikiniz de müsait', '[]', 'positive', 'A'),
  -- Location
  ('location', 'Aynı şehirdesiniz', '[]', 'positive', 'A'),
  ('location', 'Birbirinize yakın mesafedesiniz', '[]', 'positive', 'A'),
  ('location', '{distance} km mesafedesiniz', '["distance"]', 'neutral', 'A'),
  -- Values
  ('values', 'İkiniz de aileyi ön planda tutuyorsunuz', '[]', 'positive', 'A'),
  ('values', 'Kariyer hedefleriniz benzer', '[]', 'positive', 'A'),
  ('values', 'Yaşam değerleriniz uyumlu', '[]', 'neutral', 'A'),
  -- Lifestyle
  ('lifestyle', 'İkiniz de sağlıklı yaşamı önemsiyorsunuz', '[]', 'positive', 'A'),
  ('lifestyle', 'İkiniz de sporu seviyor', '[]', 'positive', 'A'),
  ('lifestyle', 'İkiniz de sigara kullanmıyor', '[]', 'positive', 'A'),
  ('lifestyle', 'Yaşam tarzlarınız uyumlu', '[]', 'neutral', 'A'),
  -- Interests
  ('interests', '{count} ortak ilgi alanınız var', '["count"]', 'positive', 'A'),
  ('interests', 'İkiniz de {interest} ile ilgileniyorsunuz', '["interest"]', 'positive', 'A'),
  ('interests', 'Ortak hobileriniz var: {hobbies}', '["hobbies"]', 'positive', 'A'),
  -- Dealbreaker
  ('dealbreaker', 'Önemli konularda uyumlusunuz', '[]', 'positive', 'A'),
  ('dealbreaker', 'Temel beklentileriniz örtüşüyor', '[]', 'neutral', 'B'),
  -- Specialty
  ('specialty', 'İkiniz de {specialty} alanında çalışıyorsunuz', '["specialty"]', 'positive', 'A'),
  ('specialty', 'İkiniz de dahili branslarda çalışıyorsunuz', '[]', 'neutral', 'A'),
  ('specialty', 'İş stresini birbirinize anlatabilirsiniz', '[]', 'encouraging', 'A'),
  -- Career Stage
  ('career_stage', 'Kariyerinizde benzer aşamadasınız', '[]', 'positive', 'A'),
  -- Institution Type
  ('institution_type', 'İkiniz de üniversite hastanesinde çalışıyorsunuz', '[]', 'positive', 'A'),
  ('institution_type', 'Kurum deneyimleriniz benzer', '[]', 'neutral', 'A')
ON CONFLICT DO NOTHING;

-- ── 2. USER FACTOR WEIGHTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_factor_weights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  factor_key       TEXT NOT NULL,
  weight_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0 CHECK (weight_multiplier BETWEEN 0.1 AND 2.0),
  is_disabled      BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, factor_key)
);

CREATE INDEX IF NOT EXISTS idx_user_factor_weights_user ON user_factor_weights(user_id);

-- ── 3. USER PREFERENCE FEEDBACK ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preference_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  factor_key      TEXT NOT NULL,
  feedback_type   TEXT NOT NULL CHECK (feedback_type IN ('more_like_this', 'less_like_this')),
  context_match_id UUID,          -- Which match triggered this feedback
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_feedback_user ON user_preference_feedback(user_id, factor_key);
CREATE INDEX IF NOT EXISTS idx_pref_feedback_created ON user_preference_feedback(created_at DESC);

-- ── 4. EXPLANATION AUDIT LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS explanation_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id    UUID NOT NULL,
  factors_used      JSONB NOT NULL,
  templates_used    JSONB NOT NULL,
  user_weights      JSONB NOT NULL DEFAULT '{}',
  personalized      BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explanation_audit_user ON explanation_audit_log(user_id, created_at DESC);

-- ── 5. DSA OPT-OUT ────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personalized_recommendations BOOLEAN NOT NULL DEFAULT true;

-- ── 6. ROW LEVEL SECURITY ─────────────────────────────────────────────────────

-- user_factor_weights
ALTER TABLE user_factor_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own factor weights" ON user_factor_weights;
CREATE POLICY "Users manage own factor weights"
  ON user_factor_weights FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_preference_feedback
ALTER TABLE user_preference_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own feedback" ON user_preference_feedback;
DROP POLICY IF EXISTS "Users read own feedback" ON user_preference_feedback;
CREATE POLICY "Users insert own feedback"
  ON user_preference_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own feedback"
  ON user_preference_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- explanation_templates (readable by all auth)
ALTER TABLE explanation_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All users read active templates" ON explanation_templates;
CREATE POLICY "All users read active templates"
  ON explanation_templates FOR SELECT TO authenticated
  USING (is_active = true);

-- explanation_audit_log
ALTER TABLE explanation_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own audit log" ON explanation_audit_log;
DROP POLICY IF EXISTS "Users read own audit log" ON explanation_audit_log;
DROP POLICY IF EXISTS "Moderators read all audit logs" ON explanation_audit_log;
CREATE POLICY "Users insert own audit log"
  ON explanation_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own audit log"
  ON explanation_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Moderators read all audit logs"
  ON explanation_audit_log FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- ── 7. COMMENTS ──────────────────────────────────────────────────────────────
COMMENT ON TABLE explanation_templates IS 'DSA Art.27: Açıklama şablonları. Tüm faktörler kullanıcının açıkça paylaştığı bilgilere dayanır. Inferans yok.';
COMMENT ON TABLE user_factor_weights IS 'DSA Art.27: Kullanıcı kontrollü faktör ağırlıkları. Kullanıcı her faktörü devre dışı bırakabilir.';
COMMENT ON COLUMN profiles.personalized_recommendations IS 'DSA Art.27: false ise yalnızca temel filtreler uygulanır, açıklama gösterilmez.';

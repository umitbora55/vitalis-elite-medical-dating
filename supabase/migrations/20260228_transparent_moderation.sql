-- ============================================================
-- Feature 7: Şeffaf Moderasyon Sistemi
-- DSA Article 17 (açık gerekçe + itiraz yolu)
-- DSA Article 20 (ücretsiz elektronik şikayet sistemi)
-- ============================================================

-- ── 1. Reason Code Kataloğu ──────────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_reason_codes (
  code            TEXT PRIMARY KEY,          -- e.g. 'HAR-01'
  category        TEXT NOT NULL,             -- harassment | scam | identity | content | system
  title_tr        TEXT NOT NULL,             -- Türkçe başlık
  description_tr  TEXT NOT NULL,             -- Türkçe açıklama
  user_guidance   TEXT NOT NULL,             -- Kullanıcıya yol gösterici ipucu
  typical_action  TEXT NOT NULL,             -- warning | temp_ban | perm_ban
  is_zero_tolerance BOOLEAN DEFAULT FALSE,
  dsa_article     TEXT,                      -- DSA madde referansı
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reason code seed verisi
INSERT INTO moderation_reason_codes
  (code, category, title_tr, description_tr, user_guidance, typical_action, is_zero_tolerance, dsa_article)
VALUES
-- Taciz kategorisi
('HAR-01', 'harassment', 'Taciz',
  'Başka bir kullanıcıya yönelik rahatsız edici, korkutucu veya aşağılayıcı davranış.',
  'Mesajlaşmada saygılı bir dil kullanın. Karşı tarafın sizi engellediğini veya yanıt vermediğini görürseniz iletişimi sonlandırın.',
  'warning', FALSE, 'DSA Art.17'),

('HAR-02', 'harassment', 'Israrcı Taciz',
  'Bir kullanıcı engelledikten veya yanıt vermemeye başladıktan sonra devam eden iletişim girişimleri.',
  'Engel veya sessizlik, hayır anlamına gelir. İletişimi derhal sonlandırın.',
  'temp_ban', FALSE, 'DSA Art.17'),

('HAR-03', 'harassment', 'Tehdit',
  'Fiziksel zarar, ifşa veya başka bir zarar verme tehdidi içeren mesajlar.',
  'Tehdit içeren hiçbir ifadeye izin verilmez. Bu tür içerikler yasal süreçlere konu olabilir.',
  'temp_ban', FALSE, 'DSA Art.17'),

('HAR-04', 'harassment', 'Ayrımcı İçerik',
  'Irk, cinsiyet, din, engellilik veya başka bir kimliğe dayalı aşağılayıcı dil.',
  'Topluluk standartlarımız her bireyin onuruna saygıyı zorunlu kılar.',
  'temp_ban', FALSE, 'DSA Art.17'),

-- Dolandırıcılık kategorisi
('SCM-01', 'scam', 'Dolandırıcılık',
  'Para, kripto para, hediye kartı veya finansal bilgi talep etmek.',
  'Uygulama üzerinden hiçbir zaman para veya finansal bilgi paylaşmayın.',
  'perm_ban', FALSE, 'DSA Art.17'),

('SCM-02', 'scam', 'Spam',
  'Tekrarlayan, istenmeyen veya otomatik mesajlar göndermek.',
  'Her mesajın gerçek ve anlamlı olmasını sağlayın.',
  'temp_ban', FALSE, 'DSA Art.17'),

('SCM-03', 'scam', 'Harici Uygulama Yönlendirmesi',
  'Kullanıcıları WhatsApp, Telegram vb. uygulamalara erken aşamada yönlendirmeye çalışmak.',
  'Güvenlik için ilk tanışma aşamasında iletişimi uygulama içinde tutun.',
  'warning', FALSE, 'DSA Art.17'),

-- Kimlik kategorisi
('IMP-01', 'identity', 'Sahte Profil',
  'Sahte kimlik, sahte fotoğraflar veya yanıltıcı bilgilerle hesap oluşturmak.',
  'Profilinizin gerçek ve doğru bilgileri yansıttığından emin olun.',
  'perm_ban', FALSE, 'DSA Art.17'),

('IMP-02', 'identity', 'Kimlik Taklidi',
  'Başka bir kişiyi veya kuruluşu taklit etmek.',
  'Sadece kendi gerçek kimliğinizle hesap açabilirsiniz.',
  'perm_ban', FALSE, 'DSA Art.17'),

-- İçerik kategorisi
('CON-01', 'content', 'Uygunsuz Görsel',
  'Rıza gösterilmeden paylaşılan müstehcen, şiddet içeren veya rahatsız edici görsel.',
  'Paylaşacağınız tüm görseller topluluk kurallarına uygun olmalıdır.',
  'temp_ban', FALSE, 'DSA Art.17'),

('CON-02', 'content', 'Cinsel İçerik Zorlama',
  'Kullanıcıyı cinsel içerik paylaşmaya zorlamak veya baskı uygulamak.',
  'Herkesin kendi sınırlarını belirleme hakkı vardır. Bu hakkı ihlal etmek yasaktır.',
  'temp_ban', FALSE, 'DSA Art.17'),

('CON-03', 'content', 'Kişisel Bilgi İfşası',
  'Başkasının rızası olmadan adres, telefon veya kişisel bilgilerini paylaşmak.',
  'Başkalarının mahremiyetine saygı gösterin. Kişisel bilgileri asla izinsiz paylaşmayın.',
  'warning', FALSE, 'DSA Art.17'),

-- Sıfır tolerans kategorisi
('SPL-01', 'zero_tolerance', 'Reşit Olmayan Kullanıcı',
  'Platformda 18 yaşın altındaki bireylerin hesap açması veya bu tür içeriklere erişmesi.',
  'Platforma erişim için 18 yaşında olmak zorunludur.',
  'perm_ban', TRUE, 'DSA Art.17'),

('SPL-02', 'zero_tolerance', 'Çocuk İstismarı İçeriği',
  'Çocukları cinsel açıdan suistimal eden veya istismar eden herhangi bir içerik.',
  'Bu tür içerikler derhal kolluk kuvvetlerine bildirilir.',
  'perm_ban', TRUE, 'DSA Art.17'),

('SPL-03', 'zero_tolerance', 'Şiddet/Terör Propagandası',
  'Şiddeti veya terör eylemlerini teşvik eden içerikler.',
  'Bu tür içerikler derhal ilgili makamlara bildirilir.',
  'perm_ban', TRUE, 'DSA Art.17'),

-- Sistem kategorisi
('SYS-01', 'system', 'Çoklu Hesap',
  'Aynı cihaz veya kimlikle birden fazla hesap açmak.',
  'Her kullanıcı yalnızca bir hesap açabilir.',
  'temp_ban', FALSE, 'DSA Art.17'),

('SYS-02', 'system', 'Güven Skoru Eşiği',
  'Topluluk raporları veya davranış örüntüsü nedeniyle güven skoru kritik seviyenin altına düştü.',
  'Diğer kullanıcılarla saygılı etkileşimler güven skorunuzu artırır.',
  'warning', FALSE, 'DSA Art.17'),

('SYS-03', 'system', 'Doğrulama İhlali',
  'Sağlık çalışanı kimliğinin sahte veya geçersiz olduğunun tespit edilmesi.',
  'Platforma erişim için geçerli bir sağlık çalışanı kimliğine sahip olmanız gerekmektedir.',
  'perm_ban', FALSE, 'DSA Art.17')

ON CONFLICT (code) DO UPDATE SET
  title_tr       = EXCLUDED.title_tr,
  description_tr = EXCLUDED.description_tr,
  user_guidance  = EXCLUDED.user_guidance;

-- ── 2. Kullanıcı Moderasyon Bildirimleri ────────────────────

CREATE TABLE IF NOT EXISTS moderation_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Bildirim içeriği
  notification_type   TEXT NOT NULL CHECK (notification_type IN (
                        'action_taken', 'restriction_lifted',
                        'appeal_received', 'appeal_decided',
                        'warning_issued')),
  action_type         TEXT NOT NULL CHECK (action_type IN (
                        'warning', 'temp_ban', 'perm_ban',
                        'messaging_disabled', 'matching_disabled',
                        'shadow_limit', 'badge_revoked', 'restriction_lifted')),

  -- Şeffaflık bilgisi (DSA Art.17)
  reason_code         TEXT REFERENCES moderation_reason_codes(code),
  title_tr            TEXT NOT NULL,
  body_tr             TEXT NOT NULL,
  evidence_summary    TEXT,         -- Hangi içerik tetikledi (kimlik ifşası olmadan)
  is_automated        BOOLEAN NOT NULL DEFAULT FALSE,

  -- İlişkili kayıtlar
  related_action_id   UUID,         -- user_restrictions.id veya user_violations.id
  related_appeal_id   UUID,         -- appeals.id

  -- Zamanlama
  action_taken_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,  -- Ban bitiş tarihi (varsa)
  appeal_deadline     TIMESTAMPTZ   -- DSA: 6 ay itiraz süresi
                        GENERATED ALWAYS AS (action_taken_at + INTERVAL '6 months') STORED,

  -- Kullanıcı etkileşimi
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_user
  ON moderation_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_unread
  ON moderation_notifications(user_id, read_at)
  WHERE read_at IS NULL;

-- ── 3. Karar Adalet Değerlendirmesi ─────────────────────────

CREATE TABLE IF NOT EXISTS moderation_decision_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id  UUID NOT NULL REFERENCES moderation_notifications(id) ON DELETE CASCADE,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT CHECK (length(comment) <= 500),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- ── 4. Mevcut Tablolara Sütun Ekle ──────────────────────────

-- user_violations: reason_code + is_automated
ALTER TABLE user_violations
  ADD COLUMN IF NOT EXISTS reason_code  TEXT REFERENCES moderation_reason_codes(code),
  ADD COLUMN IF NOT EXISTS is_automated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES moderation_notifications(id);

-- user_restrictions: reason_code + is_automated + notification FK
ALTER TABLE user_restrictions
  ADD COLUMN IF NOT EXISTS reason_code     TEXT REFERENCES moderation_reason_codes(code),
  ADD COLUMN IF NOT EXISTS is_automated    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES moderation_notifications(id);

-- appeals: SLA deadline, notification FK, DSA flag, decided_at
ALTER TABLE appeals
  ADD COLUMN IF NOT EXISTS notification_id  UUID REFERENCES moderation_notifications(id),
  ADD COLUMN IF NOT EXISTS sla_deadline     TIMESTAMPTZ
    GENERATED ALWAYS AS (submitted_at + INTERVAL '48 hours') STORED,
  ADD COLUMN IF NOT EXISTS decided_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_notes   TEXT,
  ADD COLUMN IF NOT EXISTS dsa_compliant    BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 5. Şeffaflık İstatistikleri Görünümü ────────────────────

CREATE OR REPLACE VIEW moderation_transparency_stats AS
SELECT
  TO_CHAR(DATE_TRUNC('quarter', mn.created_at), 'YYYY"-Q"Q') AS period,
  COUNT(*)                                                      AS total_notifications,
  COUNT(*) FILTER (WHERE mn.action_type IN ('temp_ban','perm_ban')) AS bans_issued,
  COUNT(*) FILTER (WHERE mn.action_type = 'warning')            AS warnings_issued,
  COUNT(*) FILTER (WHERE mn.is_automated = TRUE)                AS automated_decisions,
  COUNT(*) FILTER (WHERE mn.is_automated = FALSE)               AS human_decisions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mn.is_automated = TRUE)
    / NULLIF(COUNT(*), 0), 1
  )                                                             AS automated_pct,
  -- Appeals
  COUNT(a.id)                                                   AS appeals_submitted,
  COUNT(a.id) FILTER (WHERE a.status = 'approved')              AS appeals_approved,
  COUNT(a.id) FILTER (WHERE a.status = 'denied')                AS appeals_denied,
  ROUND(
    100.0 * COUNT(a.id) FILTER (WHERE a.status = 'approved')
    / NULLIF(COUNT(a.id) FILTER (WHERE a.status IN ('approved','denied')), 0), 1
  )                                                             AS appeal_approval_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (a.decided_at - a.submitted_at)) / 3600)
    FILTER (WHERE a.decided_at IS NOT NULL), 1
  )                                                             AS avg_appeal_hours,
  -- Fairness rating
  ROUND(AVG(r.rating)::NUMERIC, 2)                              AS avg_fairness_score,
  COUNT(r.id)                                                   AS ratings_count
FROM moderation_notifications mn
LEFT JOIN appeals a ON a.notification_id = mn.id
LEFT JOIN moderation_decision_ratings r ON r.notification_id = mn.id
GROUP BY DATE_TRUNC('quarter', mn.created_at)
ORDER BY DATE_TRUNC('quarter', mn.created_at) DESC;

-- ── 6. Helper Fonksiyon: Moderasyon Bildirimi Oluştur ───────

CREATE OR REPLACE FUNCTION create_moderation_notification(
  p_user_id         UUID,
  p_notification_type TEXT,
  p_action_type     TEXT,
  p_reason_code     TEXT,
  p_title_tr        TEXT,
  p_body_tr         TEXT,
  p_evidence_summary TEXT,
  p_is_automated    BOOLEAN,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL,
  p_related_action_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO moderation_notifications (
    user_id, notification_type, action_type, reason_code,
    title_tr, body_tr, evidence_summary, is_automated,
    expires_at, related_action_id
  ) VALUES (
    p_user_id, p_notification_type, p_action_type, p_reason_code,
    p_title_tr, p_body_tr, p_evidence_summary, p_is_automated,
    p_expires_at, p_related_action_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ── 7. RLS ──────────────────────────────────────────────────

ALTER TABLE moderation_reason_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reason_codes_public_read" ON moderation_reason_codes
  FOR SELECT USING (TRUE); -- herkes okuyabilir (kural katalon)

ALTER TABLE moderation_notifications ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi bildirimlerini görebilir
CREATE POLICY "notifications_own_select" ON moderation_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Kullanıcı kendi bildirimini okundu olarak işaretleyebilir
CREATE POLICY "notifications_own_read_update" ON moderation_notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin tüm bildirimleri görebilir ve ekleyebilir
CREATE POLICY "notifications_admin_all" ON moderation_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

ALTER TABLE moderation_decision_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_own_all" ON moderation_decision_ratings
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "ratings_admin_read" ON moderation_decision_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- appeals: kullanıcı kendi itirazlarını görebilir ve ekleyebilir
DO $$ BEGIN
  CREATE POLICY "appeals_own_select" ON appeals
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "appeals_own_insert" ON appeals
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- moderation_transparency_stats: herkes okuyabilir (public)
CREATE OR REPLACE VIEW moderation_transparency_stats_public AS
SELECT
  period,
  total_notifications,
  bans_issued,
  warnings_issued,
  automated_pct,
  appeals_submitted,
  appeal_approval_pct,
  avg_appeal_hours,
  avg_fairness_score
FROM moderation_transparency_stats;

GRANT SELECT ON moderation_transparency_stats_public TO anon, authenticated;
GRANT SELECT ON moderation_reason_codes TO anon, authenticated;

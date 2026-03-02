/**
 * transparentModerationService — Özellik 7: Şeffaf Moderasyon
 *
 * Kullanıcıya yönelik (user-facing) moderasyon şeffaflık servisi.
 * DSA Article 17 + 20 uyumu.
 *
 * Admin-side işlemler için adminPanelService kullanın.
 */

import { supabase } from '../src/lib/supabase';
import type {
  ModerationNotification,
  ModerationReasonCode,
  ModerationReasonCodeInfo,
  ModerationReasonCategory,
  UserAppeal,
  AppealSubmitPayload,
  UserReportStatus,
  TransparencyStats,
  ModerationDecisionRating,
} from '../types';

// ── Reason Code yerel kataloğu (DB'ye gitmeden hızlı erişim) ──────────────

export const REASON_CODE_CATALOG: Record<ModerationReasonCode, ModerationReasonCodeInfo> = {
  // Taciz
  'HAR-01': {
    code: 'HAR-01', category: 'harassment',
    title_tr: 'Taciz',
    description_tr: 'Başka bir kullanıcıya yönelik rahatsız edici, korkutucu veya aşağılayıcı davranış.',
    user_guidance: 'Mesajlaşmada saygılı bir dil kullanın. Karşı tarafın sizi engellediğini veya yanıt vermediğini görürseniz iletişimi sonlandırın.',
    typical_action: 'warning',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'HAR-02': {
    code: 'HAR-02', category: 'harassment',
    title_tr: 'Israrcı Taciz',
    description_tr: 'Bir kullanıcı engelledikten veya yanıt vermemeye başladıktan sonra devam eden iletişim girişimleri.',
    user_guidance: 'Engel veya sessizlik, hayır anlamına gelir. İletişimi derhal sonlandırın.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'HAR-03': {
    code: 'HAR-03', category: 'harassment',
    title_tr: 'Tehdit',
    description_tr: 'Fiziksel zarar, ifşa veya başka bir zarar verme tehdidi içeren mesajlar.',
    user_guidance: 'Tehdit içeren hiçbir ifadeye izin verilmez. Bu tür içerikler yasal süreçlere konu olabilir.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'HAR-04': {
    code: 'HAR-04', category: 'harassment',
    title_tr: 'Ayrımcı İçerik',
    description_tr: 'Irk, cinsiyet, din, engellilik veya başka bir kimliğe dayalı aşağılayıcı dil.',
    user_guidance: 'Topluluk standartlarımız her bireyin onuruna saygıyı zorunlu kılar.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  // Dolandırıcılık
  'SCM-01': {
    code: 'SCM-01', category: 'scam',
    title_tr: 'Dolandırıcılık',
    description_tr: 'Para, kripto para, hediye kartı veya finansal bilgi talep etmek.',
    user_guidance: 'Uygulama üzerinden hiçbir zaman para veya finansal bilgi paylaşmayın.',
    typical_action: 'perm_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'SCM-02': {
    code: 'SCM-02', category: 'scam',
    title_tr: 'Spam',
    description_tr: 'Tekrarlayan, istenmeyen veya otomatik mesajlar göndermek.',
    user_guidance: 'Her mesajın gerçek ve anlamlı olmasını sağlayın.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'SCM-03': {
    code: 'SCM-03', category: 'scam',
    title_tr: 'Harici Uygulama Yönlendirmesi',
    description_tr: 'Kullanıcıları WhatsApp, Telegram vb. uygulamalara erken aşamada yönlendirmeye çalışmak.',
    user_guidance: 'Güvenlik için ilk tanışma aşamasında iletişimi uygulama içinde tutun.',
    typical_action: 'warning',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  // Kimlik
  'IMP-01': {
    code: 'IMP-01', category: 'identity',
    title_tr: 'Sahte Profil',
    description_tr: 'Sahte kimlik, sahte fotoğraflar veya yanıltıcı bilgilerle hesap oluşturmak.',
    user_guidance: 'Profilinizin gerçek ve doğru bilgileri yansıttığından emin olun.',
    typical_action: 'perm_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'IMP-02': {
    code: 'IMP-02', category: 'identity',
    title_tr: 'Kimlik Taklidi',
    description_tr: 'Başka bir kişiyi veya kuruluşu taklit etmek.',
    user_guidance: 'Sadece kendi gerçek kimliğinizle hesap açabilirsiniz.',
    typical_action: 'perm_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  // İçerik
  'CON-01': {
    code: 'CON-01', category: 'content',
    title_tr: 'Uygunsuz Görsel',
    description_tr: 'Rıza gösterilmeden paylaşılan müstehcen, şiddet içeren veya rahatsız edici görsel.',
    user_guidance: 'Paylaşacağınız tüm görseller topluluk kurallarına uygun olmalıdır.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'CON-02': {
    code: 'CON-02', category: 'content',
    title_tr: 'Cinsel İçerik Zorlama',
    description_tr: 'Kullanıcıyı cinsel içerik paylaşmaya zorlamak veya baskı uygulamak.',
    user_guidance: 'Herkesin kendi sınırlarını belirleme hakkı vardır. Bu hakkı ihlal etmek yasaktır.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'CON-03': {
    code: 'CON-03', category: 'content',
    title_tr: 'Kişisel Bilgi İfşası',
    description_tr: 'Başkasının rızası olmadan adres, telefon veya kişisel bilgilerini paylaşmak.',
    user_guidance: 'Başkalarının mahremiyetine saygı gösterin. Kişisel bilgileri asla izinsiz paylaşmayın.',
    typical_action: 'warning',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  // Sıfır tolerans
  'SPL-01': {
    code: 'SPL-01', category: 'zero_tolerance',
    title_tr: 'Reşit Olmayan Kullanıcı',
    description_tr: 'Platformda 18 yaşın altındaki bireylerin hesap açması.',
    user_guidance: 'Platforma erişim için 18 yaşında olmak zorunludur.',
    typical_action: 'perm_ban',
    is_zero_tolerance: true,
    dsa_article: 'DSA Art.17',
  },
  'SPL-02': {
    code: 'SPL-02', category: 'zero_tolerance',
    title_tr: 'Çocuk İstismarı İçeriği',
    description_tr: 'Çocukları cinsel açıdan suistimal eden veya istismar eden herhangi bir içerik.',
    user_guidance: 'Bu tür içerikler derhal kolluk kuvvetlerine bildirilir.',
    typical_action: 'perm_ban',
    is_zero_tolerance: true,
    dsa_article: 'DSA Art.17',
  },
  'SPL-03': {
    code: 'SPL-03', category: 'zero_tolerance',
    title_tr: 'Şiddet/Terör Propagandası',
    description_tr: 'Şiddeti veya terör eylemlerini teşvik eden içerikler.',
    user_guidance: 'Bu tür içerikler derhal ilgili makamlara bildirilir.',
    typical_action: 'perm_ban',
    is_zero_tolerance: true,
    dsa_article: 'DSA Art.17',
  },
  // Sistem
  'SYS-01': {
    code: 'SYS-01', category: 'system',
    title_tr: 'Çoklu Hesap',
    description_tr: 'Aynı cihaz veya kimlikle birden fazla hesap açmak.',
    user_guidance: 'Her kullanıcı yalnızca bir hesap açabilir.',
    typical_action: 'temp_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'SYS-02': {
    code: 'SYS-02', category: 'system',
    title_tr: 'Güven Skoru Eşiği',
    description_tr: 'Topluluk raporları veya davranış örüntüsü nedeniyle güven skoru kritik seviyenin altına düştü.',
    user_guidance: 'Diğer kullanıcılarla saygılı etkileşimler güven skorunuzu artırır.',
    typical_action: 'warning',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
  'SYS-03': {
    code: 'SYS-03', category: 'system',
    title_tr: 'Doğrulama İhlali',
    description_tr: 'Sağlık çalışanı kimliğinin sahte veya geçersiz olduğunun tespit edilmesi.',
    user_guidance: 'Platforma erişim için geçerli bir sağlık çalışanı kimliğine sahip olmanız gerekmektedir.',
    typical_action: 'perm_ban',
    is_zero_tolerance: false,
    dsa_article: 'DSA Art.17',
  },
};

// ── Kategori başlıkları ────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ModerationReasonCategory, string> = {
  harassment:    'Taciz ve Tehdit',
  scam:          'Dolandırıcılık ve Spam',
  identity:      'Kimlik ve Profil',
  content:       'İçerik İhlalleri',
  zero_tolerance: 'Sıfır Tolerans',
  system:        'Sistem Kararları',
};

// ── Action type label/icon ─────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  warning:             { label: 'Uyarı', icon: '⚠️', color: 'text-amber-400' },
  temp_ban:            { label: 'Geçici Askıya Alma', icon: '⏳', color: 'text-orange-400' },
  perm_ban:            { label: 'Kalıcı Engel', icon: '🚫', color: 'text-red-400' },
  messaging_disabled:  { label: 'Mesajlaşma Kısıtlandı', icon: '💬', color: 'text-orange-400' },
  matching_disabled:   { label: 'Eşleşme Kısıtlandı', icon: '🔒', color: 'text-orange-400' },
  shadow_limit:        { label: 'Gölge Sınırlama', icon: '👁️', color: 'text-yellow-400' },
  badge_revoked:       { label: 'Rozet İptal Edildi', icon: '🏷️', color: 'text-rose-400' },
  restriction_lifted:  { label: 'Kısıtlama Kaldırıldı', icon: '✅', color: 'text-emerald-400' },
};

// ── Service ───────────────────────────────────────────────────────────────

export const transparentModerationService = {

  // ── Kullanıcı moderasyon bildirimleri ───────────────────────────────────

  async getMyModerationNotifications(): Promise<ModerationNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('moderation_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[transparentModerationService] getMyModerationNotifications:', error);
      return [];
    }
    return (data ?? []) as ModerationNotification[];
  },

  async getUnreadNotificationCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from('moderation_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    return count ?? 0;
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await supabase
      .from('moderation_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
  },

  async markAllNotificationsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('moderation_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
  },

  // ── İtiraz sistemi (DSA Article 20) ────────────────────────────────────

  async getMyAppeals(): Promise<UserAppeal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('appeals')
      .select(`
        id, user_id, notification_id, appeal_type,
        user_statement, evidence_paths, status, priority,
        submitted_at, sla_deadline, reviewed_at, decided_at,
        decision, decision_reason, reviewer_notes, dsa_compliant
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[transparentModerationService] getMyAppeals:', error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      notification_id: row.notification_id as string | null,
      appeal_type: row.appeal_type as string,
      user_statement: row.user_statement as string,
      evidence_paths: (row.evidence_paths as string[]) ?? [],
      status: row.status as UserAppeal['status'],
      priority: row.priority as string,
      submitted_at: row.submitted_at as string,
      sla_deadline: row.sla_deadline as string | null,
      reviewed_at: row.reviewed_at as string | null,
      decided_at: row.decided_at as string | null,
      decision: row.decision as string | null,
      decision_reason: row.decision_reason as string | null,
      reviewer_notes: row.reviewer_notes as string | null,
      dsa_compliant: (row.dsa_compliant as boolean) ?? true,
    }));
  },

  async submitAppeal(payload: AppealSubmitPayload): Promise<{ id: string } | { error: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Oturum bulunamadı.' };

    if (payload.user_statement.trim().length < 100) {
      return { error: 'İtiraz açıklamanız en az 100 karakter olmalıdır (DSA Art.20).' };
    }

    // Aynı bildirim için önceden itiraz var mı?
    if (payload.notification_id) {
      const { data: existing } = await supabase
        .from('appeals')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('notification_id', payload.notification_id)
        .maybeSingle();

      if (existing) {
        return { error: 'Bu karar için zaten bir itirazınız bulunmaktadır.' };
      }
    }

    const { data, error } = await supabase
      .from('appeals')
      .insert({
        user_id: user.id,
        notification_id: payload.notification_id,
        appeal_type: payload.appeal_type,
        user_statement: payload.user_statement.trim(),
        evidence_paths: payload.evidence_paths ?? [],
        status: 'pending',
        priority: 'normal',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[transparentModerationService] submitAppeal:', error);
      return { error: 'İtiraz gönderilemedi. Lütfen tekrar deneyin.' };
    }

    return { id: (data as { id: string }).id };
  },

  // ── Dosyalanan raporların durumu ────────────────────────────────────────

  async getMyReports(): Promise<UserReportStatus[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('id, report_type, reported_user_id, status, severity, created_at, resolved_at, resolution_type')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('[transparentModerationService] getMyReports:', error);
      return [];
    }

    return (data ?? []).map((row, idx) => ({
      id: row.id as string,
      report_type: row.report_type as string,
      reported_user_display: `Kullanıcı #${(idx + 1).toString().padStart(3, '0')}`, // PII gizlenir
      status: row.status as string,
      severity: row.severity as string | null,
      created_at: row.created_at as string,
      resolved_at: row.resolved_at as string | null,
      resolution_summary: getResolutionSummary(row.resolution_type as string | null, row.status as string),
    }));
  },

  // ── Karar adalet değerlendirmesi ────────────────────────────────────────

  async rateDecision(payload: ModerationDecisionRating): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('moderation_decision_ratings')
      .upsert({
        user_id: user.id,
        notification_id: payload.notification_id,
        rating: payload.rating,
        comment: payload.comment ?? null,
      }, { onConflict: 'user_id,notification_id' });

    return !error;
  },

  // ── Şeffaflık istatistikleri (herkese açık) ─────────────────────────────

  async getTransparencyStats(): Promise<TransparencyStats[]> {
    const { data, error } = await supabase
      .from('moderation_transparency_stats_public')
      .select('*')
      .limit(4); // Son 4 çeyrek

    if (error) {
      console.error('[transparentModerationService] getTransparencyStats:', error);
      return [];
    }
    return (data ?? []) as TransparencyStats[];
  },

  // ── Yerel katalog erişimi (DB çağrısı yok) ──────────────────────────────

  getReasonCodeInfo(code: ModerationReasonCode): ModerationReasonCodeInfo {
    return REASON_CODE_CATALOG[code];
  },

  getAllReasonCodes(): ModerationReasonCodeInfo[] {
    return Object.values(REASON_CODE_CATALOG);
  },

  getReasonCodesByCategory(category: ModerationReasonCategory): ModerationReasonCodeInfo[] {
    return Object.values(REASON_CODE_CATALOG).filter((r) => r.category === category);
  },

  formatExpiresIn(expiresAt: string | null): string {
    if (!expiresAt) return 'Kalıcı';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Sona erdi';
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} saat sonra sona erer`;
    const days = Math.floor(hours / 24);
    return `${days} gün sonra sona erer`;
  },

  isSlaBreached(slaDeadline: string | null): boolean {
    if (!slaDeadline) return false;
    return new Date(slaDeadline).getTime() < Date.now();
  },

  formatSlaRemaining(slaDeadline: string | null): string {
    if (!slaDeadline) return '—';
    const diff = new Date(slaDeadline).getTime() - Date.now();
    if (diff <= 0) return 'SLA aşıldı';
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)} dk`;
    return `${hours} sa`;
  },
};

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────

function getResolutionSummary(resolutionType: string | null, status: string): string | null {
  if (status === 'pending') return 'İnceleme bekliyor';
  if (status === 'investigating') return 'İnceleniyor';
  if (!resolutionType || status === 'dismissed') return 'Harekete geçirilmedi';

  const labels: Record<string, string> = {
    warning:    'Kullanıcı uyarıldı',
    temp_ban:   'Geçici kısıtlama uygulandı',
    perm_ban:   'Hesap kalıcı olarak engellendi',
    dismissed:  'Harekete geçirilmedi',
    false_report: 'Geçersiz rapor',
  };
  return labels[resolutionType] ?? 'Çözüldü';
}

/**
 * aiConsentService — Feature 8: Privacy-First AI
 *
 * GDPR Article 22 & 25, EU AI Act, DSA Article 27 compliance.
 * Provides:
 *   • Per-feature consent read/write (ai_consent table)
 *   • Consent audit trail (ai_consent_audit_log)
 *   • User's AI usage log (ai_usage_log)
 *   • Model registry reads (ai_model_registry)
 *   • Helper: canUseFeature(), logAIUsage()
 *
 * Security AI (is_security=true) is ALWAYS on — cannot be disabled.
 * All mutations are rejected client-side + enforced server-side via RLS.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  AIFeatureKey,
  AIConsentRecord,
  AIConsentMap,
  AIConsentUpdatePayload,
  AIUsageLogEntry,
  ModelCard,
  AIBiasAuditRow,
} from '../types';

// ── Supabase client ─────────────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

// ── Feature metadata (mirrors ai_model_registry seed) ────────────────────

/**
 * Local model card cache — mirrors the seed data in the migration.
 * Used for offline/fast reads; DB is the source of truth.
 */
export const MODEL_CARD_CACHE: Record<AIFeatureKey, {
  display_name_tr: string;
  description_tr: string;
  is_security: boolean;
  gdpr_article_22: boolean;
  data_retention_days: number;
  input_fields: string[];
  human_review_required_for: string | null;
}> = {
  content_moderation: {
    display_name_tr: 'İçerik Moderasyonu',
    description_tr:
      'Chat mesajlarında taciz, tehdit ve dolandırıcılık örüntülerini tespit eder. Kural tabanlı, açıklanabilir.',
    is_security: true,
    gdpr_article_22: true,
    data_retention_days: 30,
    input_fields: ['message_text'],
    human_review_required_for: 'perm_ban',
  },
  slate_recommendation: {
    display_name_tr: 'Günlük Öneri Sıralaması',
    description_tr:
      'Günlük 7 profil önerisi için uyumluluk, güven ve tazelik skorlarını hesaplar.',
    is_security: false,
    gdpr_article_22: true,
    data_retention_days: 90,
    input_fields: ['profile_role', 'profile_distance', 'schedule', 'verification_status', 'exposure_count'],
    human_review_required_for: null,
  },
  explanation_engine: {
    display_name_tr: 'Eşleşme Açıklaması',
    description_tr:
      'İki profil arasındaki uyumluluğu 11 faktörle açıklar. Yalnızca kullanıcının paylaştığı verileri kullanır.',
    is_security: false,
    gdpr_article_22: false,
    data_retention_days: 180,
    input_fields: ['role', 'specialty', 'schedule', 'location', 'interests', 'looking_for', 'lifestyle'],
    human_review_required_for: null,
  },
  liveness_check: {
    display_name_tr: 'Canlılık Doğrulaması',
    description_tr:
      'Video selfie üzerinden kimlik doğrulama. Biyometrik veri (yüz vektörü) işlenir.',
    is_security: false,
    gdpr_article_22: true,
    data_retention_days: 90,
    input_fields: ['video_blob', 'device_signals'],
    human_review_required_for: 'identity_rejection',
  },
  name_email_match: {
    display_name_tr: 'İsim-E-posta Eşleşmesi',
    description_tr:
      'Kurumsal e-posta adresi ile kullanıcı adını Levenshtein mesafesi ile karşılaştırır.',
    is_security: false,
    gdpr_article_22: true,
    data_retention_days: 180,
    input_fields: ['email_local_part', 'first_name', 'last_name'],
    human_review_required_for: 'manual_review',
  },
  risk_scoring: {
    display_name_tr: 'Profil Risk Skoru',
    description_tr:
      'Hesap yaşı, doğrulama durumu ve şikayet sayısına göre güven skoru hesaplar.',
    is_security: false,
    gdpr_article_22: true,
    data_retention_days: 90,
    input_fields: ['account_age_days', 'verification_status', 'reports_count', 'fraud_signals'],
    human_review_required_for: 'profile_hide',
  },
  compatibility_scoring: {
    display_name_tr: 'Uyumluluk Skoru',
    description_tr:
      'Profil kartında gösterilen %X uyumluluk skoru. Bilgi amaçlı, eşleşmeyi etkilemez.',
    is_security: false,
    gdpr_article_22: false,
    data_retention_days: 0,
    input_fields: ['interests', 'role', 'distance', 'lifestyle', 'looking_for'],
    human_review_required_for: null,
  },
};

/** All feature keys ordered for display */
export const FEATURE_KEY_ORDER: AIFeatureKey[] = [
  'content_moderation',
  'slate_recommendation',
  'explanation_engine',
  'liveness_check',
  'name_email_match',
  'risk_scoring',
  'compatibility_scoring',
];

// ── Consent reads ────────────────────────────────────────────────────────────

/**
 * Fetch all consent records for the current user.
 * Returns [] on error (fail-open — default consent is TRUE per GDPR legitimate interest).
 */
export async function getMyConsents(): Promise<AIConsentRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_consent')
    .select('*')
    .eq('user_id', user.id)
    .order('feature_key');

  if (error) {
    console.error('[aiConsentService] getMyConsents error:', error.message);
    return [];
  }
  return (data ?? []) as AIConsentRecord[];
}

/**
 * Build a consent map from raw records.
 * Missing keys = consented (default true per legitimate interest).
 */
export function buildConsentMap(records: AIConsentRecord[]): AIConsentMap {
  const map: AIConsentMap = {};
  for (const r of records) {
    map[r.feature_key] = r.consented;
  }
  return map;
}

// ── Consent writes ───────────────────────────────────────────────────────────

/**
 * Update consent for one feature.
 * Guards:
 *   1. Security AI cannot be disabled.
 *   2. Audit log is written on every change.
 */
export async function updateConsent(
  payload: AIConsentUpdatePayload,
): Promise<{ success: boolean; error?: string }> {
  const { feature_key, consented } = payload;

  // Guard: security AI always on
  const meta = MODEL_CARD_CACHE[feature_key];
  if (meta.is_security && !consented) {
    return {
      success: false,
      error: 'Güvenlik AI\'ları devre dışı bırakılamaz. Bu sistem sizi korumak için zorunludur.',
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' };

  // Fetch old value for audit log
  const { data: existing } = await supabase
    .from('ai_consent')
    .select('consented')
    .eq('user_id', user.id)
    .eq('feature_key', feature_key)
    .maybeSingle();

  const oldValue: boolean | null = (existing as { consented: boolean } | null)?.consented ?? null;

  // Upsert consent
  const { error: upsertError } = await supabase
    .from('ai_consent')
    .upsert({
      user_id: user.id,
      feature_key,
      consented,
      consented_at: new Date().toISOString(),
      revoked_at: consented ? null : new Date().toISOString(),
      consent_version: '2026-02',
    }, { onConflict: 'user_id,feature_key' });

  if (upsertError) {
    console.error('[aiConsentService] updateConsent error:', upsertError.message);
    return { success: false, error: 'Rıza güncellenirken bir hata oluştu.' };
  }

  // Write audit log (fire-and-forget — non-blocking)
  void supabase.from('ai_consent_audit_log').insert({
    user_id: user.id,
    feature_key,
    old_value: oldValue,
    new_value: consented,
    changed_at: new Date().toISOString(),
  });

  // Sync to profiles.ai_opt_out_features
  await syncOptOutProfile(user.id, feature_key, consented);

  return { success: true };
}

/**
 * Sync opt-out state to profiles.ai_opt_out_features array.
 * Security features are never added to the opt-out list.
 */
async function syncOptOutProfile(
  userId: string,
  featureKey: AIFeatureKey,
  consented: boolean,
): Promise<void> {
  const meta = MODEL_CARD_CACHE[featureKey];
  if (meta.is_security) return; // Never touch security features

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_opt_out_features')
    .eq('id', userId)
    .single();

  const current: string[] = (profile as { ai_opt_out_features: string[] } | null)
    ?.ai_opt_out_features ?? [];

  let updated: string[];
  if (!consented && !current.includes(featureKey)) {
    updated = [...current, featureKey];
  } else if (consented) {
    updated = current.filter((k) => k !== featureKey);
  } else {
    return; // No change needed
  }

  await supabase
    .from('profiles')
    .update({ ai_opt_out_features: updated })
    .eq('id', userId);
}

// ── AI Usage logs ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's AI usage log.
 * Returns last 100 entries, ordered newest first.
 */
export async function getMyAIUsageLogs(
  featureFilter?: AIFeatureKey,
): Promise<AIUsageLogEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('ai_usage_log')
    .select('id, feature_key, model_id, output_summary, confidence, action_taken, human_override, consent_given, created_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (featureFilter) {
    query = query.eq('feature_key', featureFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[aiConsentService] getMyAIUsageLogs error:', error.message);
    return [];
  }
  return (data ?? []) as AIUsageLogEntry[];
}

/**
 * Log an AI usage event.
 * input_hash: SHA-256 of the input string (no raw PII stored).
 * Call fire-and-forget (void) from feature code.
 */
export async function logAIUsage(params: {
  feature_key: AIFeatureKey;
  model_id: string;
  input_hash?: string;
  output_summary: string;
  confidence?: number;
  action_taken: 'allow' | 'warn' | 'block' | 'flag' | 'rank';
  human_override?: boolean;
  consent_given?: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const retentionDays = MODEL_CARD_CACHE[params.feature_key]?.data_retention_days ?? 90;
  const expiresAt = retentionDays > 0
    ? new Date(Date.now() + retentionDays * 86_400_000).toISOString()
    : null;

  const { error } = await supabase.from('ai_usage_log').insert({
    user_id: user?.id ?? null,
    feature_key: params.feature_key,
    model_id: params.model_id,
    input_hash: params.input_hash ?? null,
    output_summary: params.output_summary,
    confidence: params.confidence ?? null,
    action_taken: params.action_taken,
    human_override: params.human_override ?? false,
    consent_given: params.consent_given ?? true,
    expires_at: expiresAt,
  });

  if (error) {
    console.warn('[aiConsentService] logAIUsage error:', error.message);
  }
}

// ── Model registry ───────────────────────────────────────────────────────────

/**
 * Fetch a single model card from DB.
 * Falls back to local cache on error.
 */
export async function getModelCard(featureKey: AIFeatureKey): Promise<ModelCard | null> {
  const { data, error } = await supabase
    .from('ai_model_registry')
    .select('*')
    .eq('feature_key', featureKey)
    .single();

  if (error) {
    // Fallback to local cache
    const meta = MODEL_CARD_CACHE[featureKey];
    if (!meta) return null;
    return {
      model_id: `${featureKey}_v1`,
      feature_key: featureKey,
      display_name_tr: meta.display_name_tr,
      description_tr: meta.description_tr,
      model_type: 'rule_based',
      input_fields: meta.input_fields,
      output_type: 'classification',
      is_security: meta.is_security,
      gdpr_article_22: meta.gdpr_article_22,
      human_review_required_for: meta.human_review_required_for,
      data_retention_days: meta.data_retention_days,
      last_bias_audit: null,
      version: '1.0.0',
      created_at: new Date().toISOString(),
    };
  }
  return data as ModelCard;
}

/**
 * Fetch all model cards from DB.
 */
export async function getAllModelCards(): Promise<ModelCard[]> {
  const { data, error } = await supabase
    .from('ai_model_registry')
    .select('*')
    .order('feature_key');

  if (error) {
    console.error('[aiConsentService] getAllModelCards error:', error.message);
    return [];
  }
  return (data ?? []) as ModelCard[];
}

// ── Permission check ─────────────────────────────────────────────────────────

/**
 * Client-side check: can this user use the given AI feature?
 * Security AI = always true.
 * Others: check consentMap (default true if not set).
 */
export function canUseFeature(featureKey: AIFeatureKey, consentMap: AIConsentMap): boolean {
  const meta = MODEL_CARD_CACHE[featureKey];
  if (meta?.is_security) return true;
  const consent = consentMap[featureKey];
  return consent !== false; // undefined = default true
}

// ── Admin: bias audit stats ──────────────────────────────────────────────────

/**
 * Admin-only: fetch monthly AI usage stats for bias audit.
 * Reads from ai_usage_stats view.
 */
export async function getAIBiasAuditData(): Promise<AIBiasAuditRow[]> {
  const { data, error } = await supabase
    .from('ai_usage_stats')
    .select('*')
    .limit(84); // 7 features × 12 months

  if (error) {
    console.error('[aiConsentService] getAIBiasAuditData error:', error.message);
    return [];
  }
  return (data ?? []) as AIBiasAuditRow[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable description of what data a feature uses */
export function getFeatureDataUsage(featureKey: AIFeatureKey): string {
  const meta = MODEL_CARD_CACHE[featureKey];
  if (!meta) return '';
  return meta.input_fields.join(', ');
}

/** Human-readable retention period */
export function getRetentionLabel(days: number): string {
  if (days === 0) return 'Saklanmaz';
  if (days < 30) return `${days} gün`;
  if (days === 30) return '1 ay';
  if (days === 90) return '3 ay';
  if (days === 180) return '6 ay';
  return `${days} gün`;
}

export const aiConsentService = {
  getMyConsents,
  buildConsentMap,
  updateConsent,
  getMyAIUsageLogs,
  logAIUsage,
  getModelCard,
  getAllModelCards,
  canUseFeature,
  getAIBiasAuditData,
  getFeatureDataUsage,
  getRetentionLabel,
  MODEL_CARD_CACHE,
  FEATURE_KEY_ORDER,
};

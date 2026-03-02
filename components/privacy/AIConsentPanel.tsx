/**
 * AIConsentPanel — Feature 8: Privacy-First AI
 *
 * User-facing AI preference settings page.
 * GDPR Article 22 & 25, EU AI Act Article 13 compliance.
 *
 * Per feature:
 *   • Display name + description
 *   • What data it uses
 *   • Data retention period
 *   • Toggle (security AI: locked, non-security: user-controlled)
 *   • GDPR Article 22 badge (automated decision making)
 *   • Last consent change date
 *
 * Groups:
 *   1. Security AI (always on, locked)
 *   2. Matching AI (controllable)
 *   3. Verification AI (controllable)
 *   4. Analytics AI (controllable)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Lock,
  Shield,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  aiConsentService,
  MODEL_CARD_CACHE,
  FEATURE_KEY_ORDER,
  getRetentionLabel,
} from '../../services/aiConsentService';
import type { AIFeatureKey, AIConsentMap, AIConsentRecord } from '../../types';

// ── Feature grouping ─────────────────────────────────────────────────────────

interface FeatureGroup {
  label: string;
  keys: AIFeatureKey[];
  color: string;
  icon: React.ReactNode;
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Güvenlik AI',
    keys: ['content_moderation'],
    color: 'text-red-400',
    icon: <Shield size={13} />,
  },
  {
    label: 'Eşleştirme AI',
    keys: ['slate_recommendation', 'explanation_engine', 'compatibility_scoring'],
    color: 'text-violet-400',
    icon: <Bot size={13} />,
  },
  {
    label: 'Doğrulama AI',
    keys: ['liveness_check', 'name_email_match'],
    color: 'text-blue-400',
    icon: <Shield size={13} />,
  },
  {
    label: 'Risk & Güven AI',
    keys: ['risk_scoring'],
    color: 'text-amber-400',
    icon: <AlertTriangle size={13} />,
  },
];

// ── Feature row ──────────────────────────────────────────────────────────────

interface FeatureRowProps {
  featureKey: AIFeatureKey;
  consented: boolean;
  consentRecord: AIConsentRecord | undefined;
  updating: boolean;
  onToggle: (key: AIFeatureKey, value: boolean) => void;
}

const FeatureRow: React.FC<FeatureRowProps> = ({
  featureKey,
  consented,
  consentRecord,
  updating,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = MODEL_CARD_CACHE[featureKey];
  if (!meta) return null;

  const isLocked = meta.is_security;

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
      {/* Main row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Info expand */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex-1 flex items-start gap-3 text-left"
        >
          <div className="pt-0.5">
            {expanded
              ? <ChevronUp size={12} className="text-slate-500" />
              : <ChevronDown size={12} className="text-slate-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-200">{meta.display_name_tr}</p>
              {meta.gdpr_article_22 && (
                <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400">
                  GDPR Art.22
                </span>
              )}
              {isLocked && (
                <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-700/60 border border-slate-600/40 text-slate-400">
                  Zorunlu
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
              {meta.description_tr}
            </p>
          </div>
        </button>

        {/* Toggle */}
        {isLocked ? (
          <div className="flex-shrink-0 flex items-center gap-1 text-slate-600" title="Güvenlik AI — devre dışı bırakılamaz">
            <Lock size={13} />
            <span className="text-[10px]">Açık</span>
          </div>
        ) : (
          <button
            onClick={() => onToggle(featureKey, !consented)}
            disabled={updating}
            className="flex-shrink-0 transition-opacity disabled:opacity-50"
            aria-label={consented ? 'Devre dışı bırak' : 'Etkinleştir'}
          >
            {consented
              ? <ToggleRight size={28} className="text-violet-400" />
              : <ToggleLeft size={28} className="text-slate-600" />
            }
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-700/30 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">{meta.description_tr}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="px-2.5 py-2 bg-slate-800/50 rounded-lg">
              <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wide">Kullandığı veri</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                {meta.input_fields.join(', ')}
              </p>
            </div>
            <div className="px-2.5 py-2 bg-slate-800/50 rounded-lg">
              <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wide">Veri saklama</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {getRetentionLabel(meta.data_retention_days)}
              </p>
            </div>
          </div>

          {meta.human_review_required_for && (
            <div className="flex items-start gap-2 px-2.5 py-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
              <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-300 leading-relaxed">
                Ağır kararlar insan moderatörü gerektirir: <strong>{meta.human_review_required_for}</strong>
              </p>
            </div>
          )}

          {meta.gdpr_article_22 && (
            <div className="flex items-start gap-2 px-2.5 py-2 bg-amber-500/8 border border-amber-500/15 rounded-lg">
              <Info size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300 leading-relaxed">
                Bu sistem GDPR Madde 22 kapsamında otomatik karar alır. İtiraz hakkınız saklıdır.
              </p>
            </div>
          )}

          {consentRecord && (
            <p className="text-[9px] text-slate-600">
              Son güncelleme:{' '}
              {new Date(consentRecord.consented_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {' · '}Sürüm {consentRecord.consent_version}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface AIConsentPanelProps {
  className?: string;
}

export const AIConsentPanel: React.FC<AIConsentPanelProps> = ({ className = '' }) => {
  const [records, setRecords] = useState<AIConsentRecord[]>([]);
  const [consentMap, setConsentMap] = useState<AIConsentMap>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<AIFeatureKey | null>(null);
  const [feedback, setFeedback] = useState<{ key: AIFeatureKey; msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const recs = await aiConsentService.getMyConsents();
    setRecords(recs);
    setConsentMap(aiConsentService.buildConsentMap(recs));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleToggle = async (featureKey: AIFeatureKey, newValue: boolean) => {
    setUpdating(featureKey);
    setFeedback(null);

    // Optimistic update
    setConsentMap((prev) => ({ ...prev, [featureKey]: newValue }));

    const result = await aiConsentService.updateConsent({ feature_key: featureKey, consented: newValue });

    if (!result.success) {
      // Revert
      setConsentMap((prev) => ({ ...prev, [featureKey]: !newValue }));
      setFeedback({ key: featureKey, msg: result.error ?? 'Güncelleme başarısız.', ok: false });
    } else {
      setFeedback({
        key: featureKey,
        msg: newValue
          ? `${MODEL_CARD_CACHE[featureKey]?.display_name_tr} etkinleştirildi.`
          : `${MODEL_CARD_CACHE[featureKey]?.display_name_tr} devre dışı bırakıldı.`,
        ok: true,
      });
      // Refresh records for timestamp
      void load();
    }

    setUpdating(null);

    // Clear feedback after 4s
    setTimeout(() => setFeedback(null), 4000);
  };

  // Count non-security features that are active
  const nonSecurityFeatures = FEATURE_KEY_ORDER.filter(k => !MODEL_CARD_CACHE[k]?.is_security);
  const enabledCount = nonSecurityFeatures.filter(k => consentMap[k] !== false).length;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-violet-400" />
          <h2 className="text-base font-bold text-white">AI Tercihleri</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            {enabledCount}/{nonSecurityFeatures.length} etkin
          </span>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
            aria-label="Yenile"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Intro */}
      <div className="px-4 py-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
        <p className="text-xs text-slate-300 leading-relaxed">
          Vitalis, profil önerisi ve güvenlik için kural tabanlı AI sistemleri kullanır.
          Güvenlik AI her zaman açıktır; diğer özellikleri tercihlerinize göre ayarlayabilirsiniz.
          GDPR Madde 22 kapsamında otomatik kararlara itiraz hakkınız saklıdır.
        </p>
      </div>

      {/* Global feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${
          feedback.ok
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          {feedback.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {feedback.msg}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Feature groups */}
      {!loading && FEATURE_GROUPS.map((group) => {
        const groupKeys = group.keys.filter((k) => FEATURE_KEY_ORDER.includes(k));
        if (groupKeys.length === 0) return null;

        return (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={group.color}>{group.icon}</span>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {group.label}
              </h3>
            </div>

            <div className="space-y-1.5">
              {groupKeys.map((key) => (
                <FeatureRow
                  key={key}
                  featureKey={key}
                  consented={consentMap[key] !== false}
                  consentRecord={records.find((r) => r.feature_key === key)}
                  updating={updating === key}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* GDPR rights footer */}
      <div className="px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl space-y-1.5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-semibold">GDPR haklarınız:</span>{' '}
          Verilerinize erişim, düzeltme, silme ve taşınabilirlik haklarınız saklıdır.
          Otomatik kararlara (Madde 22) itiraz hakkı için Şeffaflık Merkezi'ni kullanın.
        </p>
        <p className="text-[10px] text-slate-600">
          Sürüm 2026-02 · Vitalis AI Politikası
        </p>
      </div>
    </div>
  );
};

export default AIConsentPanel;

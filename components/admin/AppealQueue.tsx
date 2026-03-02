/**
 * AppealQueue — Özellik 7: Şeffaf Moderasyon (Admin Panel)
 *
 * Moderatör itiraz kuyruğu.
 * - SLA takibi (48 saat)
 * - Öncelik sıralama (SLA ihlali → urgent → normal)
 * - Kararlandırma: onay / red / eskalasyon
 * - DSA Art.20: insan incelemesi zorunlu
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronUp,
  Loader2,
  RefreshCw,
  Filter,
  Shield,
  User,
  ChevronDown,
} from 'lucide-react';
import { adminPanelService } from '../../services/adminPanelService';
import type { AppealQueueItem } from '../../types';

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Bekliyor',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  under_review: { label: 'İnceleniyor', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  approved:     { label: 'Kabul',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  denied:       { label: 'Red',        color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  escalated:    { label: 'Eskalasyon', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Düşük',  color: 'text-slate-400' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  high:   { label: 'Yüksek', color: 'text-amber-400' },
  urgent: { label: 'Acil',   color: 'text-red-400' },
};

const APPEAL_TYPE_LABELS: Record<string, string> = {
  ban_appeal:         'Hesap Engeli',
  restriction_appeal: 'Kısıtlama',
  report_dispute:     'Rapor İtirazı',
  badge_revocation:   'Rozet İptali',
};

// ── Decision modal ─────────────────────────────────────────────────────────

interface DecisionModalProps {
  appeal: AppealQueueItem;
  onDecide: (decision: 'approved' | 'denied' | 'escalated', reason: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

const DecisionModal: React.FC<DecisionModalProps> = ({ appeal, onDecide, onClose }) => {
  const [decision, setDecision] = useState<'approved' | 'denied' | 'escalated' | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!decision) { setError('Karar seçin.'); return; }
    if (reason.trim().length < 20) { setError('Gerekçe en az 20 karakter olmalıdır.'); return; }
    setSubmitting(true);
    await onDecide(decision, reason.trim(), notes.trim() || undefined);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4 animate-scale-in">
        <div>
          <h3 className="text-sm font-bold text-white">İtiraz Kararı</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {APPEAL_TYPE_LABELS[appeal.appeal_type] ?? appeal.appeal_type} · {appeal.user_name}
          </p>
        </div>

        {/* Kullanıcı ifadesi özeti */}
        <div className="px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">İtiraz Metni</p>
          <p className="text-xs text-slate-400 leading-relaxed">{appeal.user_statement_preview}…</p>
        </div>

        {/* Decision picker */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { v: 'approved' as const, label: '✓ Kabul', color: 'bg-emerald-600 text-white border-emerald-500' },
            { v: 'denied'   as const, label: '✗ Red',   color: 'bg-red-700 text-white border-red-600' },
            { v: 'escalated'as const, label: '↑ Eskalasyon', color: 'bg-purple-700 text-white border-purple-600' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setDecision(opt.v)}
              className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                decision === opt.v ? opt.color : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-400 font-semibold">Gerekçe <span className="text-red-400">*</span></p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Kararın gerekçesini kullanıcıya şeffaf biçimde açıklayın…"
            rows={3}
            className="w-full text-xs bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Internal notes */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-400 font-semibold">Moderatör Notu (dahili)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dahili notlar (kullanıcıya gösterilmez)"
            rows={2}
            className="w-full text-xs bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-600"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:text-slate-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={!decision || submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-blue-500 transition-colors flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Scale size={13} />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Appeal row ─────────────────────────────────────────────────────────────

interface AppealRowProps {
  appeal: AppealQueueItem;
  onOpenDecision: (appeal: AppealQueueItem) => void;
}

const AppealRow: React.FC<AppealRowProps> = ({ appeal, onOpenDecision }) => {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[appeal.status] ?? STATUS_CONFIG['pending'];
  const priorityCfg = PRIORITY_CONFIG[appeal.priority] ?? PRIORITY_CONFIG['normal'];
  const isPending = appeal.status === 'pending' || appeal.status === 'under_review';

  return (
    <div className={`rounded-xl border overflow-hidden ${
      appeal.is_sla_breached ? 'border-red-500/40 bg-red-500/5' : 'border-slate-700/40 bg-slate-800/20'
    }`}>
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {appeal.user_avatar ? (
            <img src={appeal.user_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={14} className="text-slate-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-200 truncate">{appeal.user_name}</p>
            <span className={`text-[9px] font-bold uppercase ${priorityCfg.color}`}>
              {priorityCfg.label}
            </span>
            {appeal.is_sla_breached && (
              <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                SLA AŞILDI
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">
              {APPEAL_TYPE_LABELS[appeal.appeal_type] ?? appeal.appeal_type}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-[10px] text-slate-500">
              {new Date(appeal.submitted_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          {appeal.sla_deadline && !appeal.is_sla_breached && (
            <div className="flex items-center gap-0.5 text-[9px] text-slate-500">
              <Clock size={9} />
              {Math.max(0, Math.floor((new Date(appeal.sla_deadline).getTime() - Date.now()) / 3600000))}s kaldı
            </div>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Gizle' : 'İtiraz metnini gör'}
        </button>
        {isPending && (
          <button
            onClick={() => onOpenDecision(appeal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors"
          >
            <Scale size={11} /> Karar Ver
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/40 rounded-xl">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">İtiraz Metni</p>
            <p className="text-xs text-slate-300 leading-relaxed">{appeal.user_statement_preview}…</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const STATUS_FILTER_TABS: { key: string; label: string }[] = [
  { key: 'open',         label: 'Açık' },
  { key: 'pending',      label: 'Bekliyor' },
  { key: 'under_review', label: 'İnceleniyor' },
  { key: 'approved',     label: 'Kabul' },
  { key: 'denied',       label: 'Red' },
];

export interface AppealQueueProps {
  className?: string;
}

export const AppealQueue: React.FC<AppealQueueProps> = ({ className = '' }) => {
  const [appeals, setAppeals] = useState<AppealQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [decidingAppeal, setDecidingAppeal] = useState<AppealQueueItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const filterStatus = statusFilter === 'open' ? undefined : statusFilter;
    const data = await adminPanelService.getAppealQueue(filterStatus);
    // Sort: SLA breached first, then by submitted_at
    data.sort((a, b) => {
      if (a.is_sla_breached !== b.is_sla_breached) return a.is_sla_breached ? -1 : 1;
      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    });
    setAppeals(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleDecide = useCallback(async (
    decision: 'approved' | 'denied' | 'escalated',
    reason: string,
    notes?: string,
  ) => {
    if (!decidingAppeal) return;
    const ok = await adminPanelService.reviewAppeal(
      decidingAppeal.id,
      decision,
      reason,
      notes,
    );
    if (ok) {
      setDecidingAppeal(null);
      void load();
    }
  }, [decidingAppeal, load]);

  const slaBreakedCount = appeals.filter((a) => a.is_sla_breached).length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-blue-400" />
          <h3 className="text-sm font-bold text-white">İtiraz Kuyruğu</h3>
          <span className="text-[10px] text-slate-500">({appeals.length})</span>
          {slaBreakedCount > 0 && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full">
              {slaBreakedCount} SLA aşımı
            </span>
          )}
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* DSA note */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/8 border border-blue-500/20 rounded-xl">
        <Shield size={11} className="text-blue-400 flex-shrink-0" />
        <p className="text-[10px] text-blue-300">
          DSA Art.20: Tüm itirazlar insan moderatör tarafından 48 saat içinde incelenmelidir.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter size={9} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && appeals.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <CheckCircle2 size={24} className="mx-auto text-emerald-700" />
          <p className="text-sm text-slate-500">Kuyrukta itiraz bulunmuyor.</p>
        </div>
      )}

      {/* Appeal list */}
      {!loading && appeals.length > 0 && (
        <div className="space-y-2">
          {appeals.map((appeal) => (
            <AppealRow
              key={appeal.id}
              appeal={appeal}
              onOpenDecision={setDecidingAppeal}
            />
          ))}
        </div>
      )}

      {/* SLA legend */}
      <div className="flex gap-4 text-[10px] text-slate-600">
        <div className="flex items-center gap-1"><AlertTriangle size={9} className="text-red-500" /> SLA aşımı</div>
        <div className="flex items-center gap-1"><Clock size={9} className="text-amber-500" /> SLA takibi</div>
        <div className="flex items-center gap-1"><XCircle size={9} className="text-slate-500" /> Bekliyor</div>
      </div>

      {/* Decision modal */}
      {decidingAppeal && (
        <DecisionModal
          appeal={decidingAppeal}
          onDecide={handleDecide}
          onClose={() => setDecidingAppeal(null)}
        />
      )}
    </div>
  );
};

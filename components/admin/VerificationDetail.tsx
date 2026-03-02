import React, { useCallback, useEffect, useState } from 'react';
import {
  adminPanelService,
  VerificationQueueItem,
  SlaStatus,
} from '../../services/adminPanelService';
import {
  getVerificationDocUrls,
  SignedDoc,
} from '../../services/adminService';
import { supabase } from '../../src/lib/supabase';
import {
  X, BadgeCheck, Clock, CheckCircle2, XCircle,
  HelpCircle, Loader2, Crown, User, MapPin, Mail,
  FileImage, FileText, ExternalLink, ZoomIn,
  ChevronDown, ChevronUp, History,
} from 'lucide-react';

interface VerificationDetailProps {
  item: VerificationQueueItem;
  onClose: () => void;
  onActionComplete: () => void;
}

const SLA_COLORS: Record<SlaStatus, string> = {
  ok:       'text-emerald-400',
  warning:  'text-amber-400',
  breached: 'text-red-400',
};

const REJECTION_REASONS = [
  'Belgeler okunamıyor',
  'Belge geçerlilik süresi dolmuş',
  'Belge sahte görünüyor',
  'İsim eşleşmiyor',
  'Yanlış belge türü',
  'Mezun değil / aktif değil',
  'Diğer',
];

// ─── Audit Log Types ──────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string;
  created_at: string;
  action: string;
  notes: string | null;
  actor_email: string | null;
}

// ─── Document Viewer ──────────────────────────────────────────────────────────

interface DocumentViewerProps {
  requestId: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ requestId }) => {
  const [docs, setDocs]         = useState<SignedDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // AUDIT-FIX: [FE-DOC-01] — Fetch signed document URLs from admin edge function
    getVerificationDocUrls(requestId)
      .then((result) => {
        if (!cancelled) {
          setDocs(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Belgeler yüklenemedi.';
          setError(msg);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [requestId]);

  const isImage = (mime: string | null): boolean =>
    (mime ?? '').startsWith('image/');

  const isPdf = (mime: string | null): boolean =>
    mime === 'application/pdf';

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2 size={14} className="animate-spin text-slate-400" />
        <span className="text-xs text-slate-400">Belgeler yükleniyor…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-400 py-2">{error}</p>
    );
  }

  if (docs.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-2 text-center">Belge bulunamadı.</p>
    );
  }

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[130] bg-slate-950/95 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Belge tam görünüm"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Kapat"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
          <img
            src={lightbox}
            alt="Belge tam görünüm"
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {docs.map((doc) => (
          <div
            key={doc.docId}
            className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden"
          >
            {isImage(doc.mime) ? (
              <button
                type="button"
                onClick={() => setLightbox(doc.signedUrl)}
                className="w-full group relative"
                aria-label="Belgeyi büyüt"
              >
                <img
                  src={doc.signedUrl}
                  alt="Doğrulama belgesi"
                  className="w-full h-20 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn size={18} className="text-white" />
                </div>
              </button>
            ) : isPdf(doc.mime) ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <FileText size={22} className="text-slate-400" />
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  PDF Görüntüle <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <FileImage size={22} className="text-slate-400" />
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Görüntüle <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

interface AuditLogProps {
  targetId: string;
}

const AuditLog: React.FC<AuditLogProps> = ({ targetId }) => {
  const [entries, setEntries]     = useState<AuditLogRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState(false);
  const [showAll, setShowAll]     = useState(false);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    setError(null);

    // AUDIT-FIX: [FE-AUDIT-01] — Fetch audit log entries for this verification request
    const { data, error: dbErr } = await supabase
      .from('admin_audit_logs')
      .select('id, created_at, action, notes, actor_email')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (dbErr) {
      setError(dbErr.message ?? 'Geçmiş yüklenemedi.');
      setLoading(false);
      return;
    }

    setEntries((data ?? []) as AuditLogRow[]);
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    if (expanded) void loadAuditLog();
  }, [expanded, loadAuditLog]);

  const INITIAL_DISPLAY = 10;
  const visible = showAll ? entries : entries.slice(0, INITIAL_DISPLAY);

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
        aria-expanded={expanded}
        aria-controls="audit-log-content"
      >
        <div className="flex items-center gap-2">
          <History size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Geçmiş
          </span>
          {entries.length > 0 && !loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
              {entries.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-slate-500" />
        ) : (
          <ChevronDown size={14} className="text-slate-500" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div id="audit-log-content" className="px-4 pb-4 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 py-3 justify-center">
              <Loader2 size={13} className="animate-spin text-slate-400" />
              <span className="text-xs text-slate-400">Geçmiş yükleniyor…</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 py-2">{error}</p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-xs text-slate-500 py-2 text-center">Kayıt bulunamadı.</p>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="space-y-1.5">
              {visible.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 bg-slate-800/40 rounded-lg px-3 py-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {entry.action}
                      </span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('tr-TR', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {entry.actor_email && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{entry.actor_email}</p>
                    )}
                    {entry.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && entries.length > INITIAL_DISPLAY && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full text-[11px] text-slate-400 hover:text-white py-1.5 transition-colors"
            >
              {showAll ? 'Daha az göster' : `Daha fazla (${entries.length - INITIAL_DISPLAY} daha)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const VerificationDetail: React.FC<VerificationDetailProps> = ({
  item,
  onClose,
  onActionComplete,
}) => {
  const [action, setAction]       = useState<'approve' | 'reject' | 'info' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!action) return;
    setSubmitting(true);
    setActionError(null);

    let result: { data: null; error: string | null };

    if (action === 'approve') {
      result = await adminPanelService.approveVerification(item.id, notes || undefined);
    } else if (action === 'reject') {
      if (!rejectionReason) {
        setActionError('Lütfen bir red sebebi seçin.');
        setSubmitting(false);
        return;
      }
      result = await adminPanelService.rejectVerification(item.id, rejectionReason, notes || undefined);
    } else {
      if (!notes.trim()) {
        setActionError('Lütfen istenen bilgiyi belirtin.');
        setSubmitting(false);
        return;
      }
      result = await adminPanelService.requestMoreInfo(item.id, notes);
    }

    if (result.error) {
      setActionError(result.error);
      setSubmitting(false);
    } else {
      onActionComplete();
      onClose();
    }
  };

  const timeLeft = adminPanelService.getSlaTimeLeft(item.sla_deadline);
  const slaColor = SLA_COLORS[item.sla_status];
  const canAct   = item.status === 'pending' || item.status === 'in_review' || item.status === 'needs_more_info';

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <BadgeCheck size={18} className="text-blue-400" />
            <h3 className="text-base font-bold text-white">Doğrulama İncelemesi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* User profile summary */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.user_name ?? 'İsimsiz'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.subscription_tier && item.subscription_tier !== 'FREE' && (
                    <Crown size={11} className="text-gold-400" />
                  )}
                  <span className="text-[11px] text-slate-400">{item.subscription_tier ?? 'FREE'}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Mail size={11} />
                <span className="truncate">{item.user_email ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={11} />
                <span className="truncate">{item.user_city ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* SLA info */}
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className={slaColor} />
                <span className="text-xs font-semibold text-slate-300">SLA Durumu</span>
              </div>
              <span className={`text-xs font-bold ${slaColor}`}>
                {adminPanelService.getSlaLabel(item.sla_status)}
              </span>
            </div>
            <p className={`text-sm font-bold mt-1 ${slaColor}`}>{timeLeft}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deadline: {new Date(item.sla_deadline).toLocaleString('tr-TR')}
            </p>
          </div>

          {/* Request details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Talep Detayları</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Başvuru Tarihi</p>
                <p className="text-xs font-semibold text-white">
                  {new Date(item.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Yöntem</p>
                <p className="text-xs font-semibold text-white">{item.verification_method ?? '—'}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Öncelik</p>
                <p className="text-xs font-semibold text-white">{item.priority}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Durum</p>
                <p className="text-xs font-semibold text-white capitalize">{item.status.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>

          {/* ── DOCUMENT VIEWER — AUDIT-FIX: [FE-DOC-01] ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belgeler</h4>
            <DocumentViewer requestId={item.id} />
          </div>

          {/* Existing notes */}
          {item.notes && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Notlar</p>
              <p className="text-xs text-slate-300">{item.notes}</p>
            </div>
          )}

          {/* Action section */}
          {canAct && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar</h4>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    action === 'approve'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  <span className="text-[11px] font-semibold">Onayla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    action === 'reject'
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'border-slate-700 text-slate-400 hover:border-red-500/40 hover:text-red-400'
                  }`}
                >
                  <XCircle size={18} />
                  <span className="text-[11px] font-semibold">Reddet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('info')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    action === 'info'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'border-slate-700 text-slate-400 hover:border-amber-500/40 hover:text-amber-400'
                  }`}
                >
                  <HelpCircle size={18} />
                  <span className="text-[11px] font-semibold">Bilgi İste</span>
                </button>
              </div>

              {/* Rejection reason (only for reject) */}
              {action === 'reject' && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-semibold">Red sebebi *</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REJECTION_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRejectionReason(r)}
                        className={`text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                          rejectionReason === r
                            ? 'bg-red-500/15 border-red-500/30 text-red-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400 font-semibold">
                  {action === 'info' ? 'İstenen bilgi *' : 'Notlar (isteğe bağlı)'}
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={action === 'info' ? 'Kullanıcıdan ne istiyorsunuz?' : 'İç not ekle…'}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {actionError && (
                <p className="text-xs text-red-400">{actionError}</p>
              )}
            </div>
          )}

          {/* ── AUDIT LOG — AUDIT-FIX: [FE-AUDIT-01] ── */}
          <AuditLog targetId={item.id} />

        </div>

        {/* Footer */}
        {canAct && (
          <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!action || submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
              ) : (
                'Onayla & Kaydet'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

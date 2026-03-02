import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    Shield,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    User,
    MapPin,
    Calendar,
    Eye,
    Loader2,
    RefreshCw,
    ChevronRight,
    ExternalLink,
    MessageSquare,
} from 'lucide-react';
import {
    fetchVerificationQueue,
    fetchVerificationCase,
    claimVerificationRequest,
    decideVerification,
    getVerificationDocUrls,
    type QueueItem,
    type CaseDetail,
    type SignedDoc,
    type Decision,
    type QueueFilters,
} from '../services/adminService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Bekliyor', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    UNDER_REVIEW: { label: 'İnceleniyor', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    NEED_MORE_INFO: { label: 'Ek Bilgi', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    APPROVED: { label: 'Onaylandı', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    REJECTED: { label: 'Reddedildi', color: 'text-red-400', bg: 'bg-red-400/10' },
    SUSPENDED: { label: 'Askıya Alındı', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

const REJECT_REASONS = [
    { code: 'BLURRY_DOC', label: 'Belge okunamıyor / bulanık' },
    { code: 'INVALID_DOC', label: 'Geçersiz belge türü' },
    { code: 'MISMATCH', label: 'Bilgiler uyuşmuyor' },
    { code: 'EXPIRED_DOC', label: 'Süresi geçmiş belge' },
    { code: 'FAKE_DOC', label: 'Sahte belge şüphesi' },
    { code: 'OTHER', label: 'Diğer' },
];

const formatDate = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatRelative = (iso: string | null): string => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
};

// ─── Status Badge ────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-gray-400', bg: 'bg-gray-400/10' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
            {cfg.label}
        </span>
    );
};

// ─── Queue Item Card ─────────────────────────────────────────────────────────

interface QueueCardProps {
    item: QueueItem;
    onClick: () => void;
}

const QueueCard: React.FC<QueueCardProps> = ({ item, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl p-4 transition-all duration-200 group"
    >
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-[#b89a5a] shrink-0" />
                    <span className="text-white font-medium text-sm truncate">
                        {item.requestorName || 'İsimsiz Kullanıcı'}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    {item.requestorCity && (
                        <span className="flex items-center gap-1">
                            <MapPin size={11} /> {item.requestorCity}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatRelative(item.submittedAt)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.emailType && (
                        <span className="text-[10px] text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded-full">
                            {item.emailType === 'corporate' ? 'Kurumsal' : 'Kişisel'} e-posta
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight size={16} className="text-gray-600 group-hover:text-[#b89a5a] transition-colors mt-1 shrink-0" />
        </div>
    </button>
);

// ─── Filter Bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
    filters: QueueFilters;
    onChange: (f: QueueFilters) => void;
    total: number;
    onRefresh: () => void;
    loading: boolean;
}

const FILTER_TABS: { key: string; label: string }[] = [
    { key: 'ALL', label: 'Tümü' },
    { key: 'PENDING', label: 'Bekliyor' },
    { key: 'UNDER_REVIEW', label: 'İnceleniyor' },
    { key: 'NEED_MORE_INFO', label: 'Ek Bilgi' },
];

const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, total, onRefresh, loading }) => {
    const active = filters.status?.[0] || 'ALL';

    return (
        <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex gap-1.5 overflow-x-auto">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() =>
                            onChange({
                                ...filters,
                                status: tab.key === 'ALL' ? undefined : [tab.key],
                            })
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${active === tab.key
                                ? 'bg-[#b89a5a] text-black'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">{total} talep</span>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>
    );
};

// ─── Document Viewer ─────────────────────────────────────────────────────────

interface DocViewerProps {
    docs: SignedDoc[];
    loading: boolean;
}

const DocViewer: React.FC<DocViewerProps> = ({ docs, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                Belgeler yükleniyor...
            </div>
        );
    }

    if (docs.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 text-sm">
                <FileText size={24} className="mx-auto mb-2 opacity-40" />
                Belge yüklenmemiş
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {docs.map(doc => {
                const isImage = doc.mime?.startsWith('image/');
                return (
                    <div key={doc.docId} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                        {isImage ? (
                            <img
                                src={doc.signedUrl}
                                alt="Doğrulama belgesi"
                                className="w-full max-h-96 object-contain bg-black/50"
                            />
                        ) : (
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                                    <FileText size={16} className="text-[#b89a5a]" />
                                    <span>PDF Belge</span>
                                </div>
                                <a
                                    href={doc.signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-[#b89a5a] hover:text-[#d4b56a] transition-colors"
                                >
                                    Aç <ExternalLink size={12} />
                                </a>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Case Detail View ────────────────────────────────────────────────────────

interface CaseViewProps {
    requestId: string;
    onBack: () => void;
    onDecided: () => void;
}

const CaseView: React.FC<CaseViewProps> = ({ requestId, onBack, onDecided }) => {
    const [caseData, setCaseData] = useState<CaseDetail | null>(null);
    const [docs, setDocs] = useState<SignedDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [docsLoading, setDocsLoading] = useState(true);
    const [deciding, setDeciding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [reasonCode, setReasonCode] = useState('');
    const [notes, setNotes] = useState('');

    const loadCase = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Claim the request for this moderator
            await claimVerificationRequest(requestId).catch(() => {
                // Already claimed by us or error — continue
            });

            const data = await fetchVerificationCase(requestId);
            setCaseData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    const loadDocs = useCallback(async () => {
        try {
            setDocsLoading(true);
            const signedDocs = await getVerificationDocUrls(requestId);
            setDocs(signedDocs);
        } catch {
            // Doc loading failure is non-fatal
        } finally {
            setDocsLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        void loadCase();
        void loadDocs();
    }, [loadCase, loadDocs]);

    const handleDecision = async (decision: Decision) => {
        if (decision === 'reject' && !reasonCode) {
            setShowRejectForm(true);
            return;
        }

        try {
            setDeciding(true);
            await decideVerification(requestId, decision, reasonCode || null, notes || null);
            onDecided();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'İşlem başarısız');
        } finally {
            setDeciding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 size={28} className="animate-spin mb-3" />
                <span className="text-sm">Talep yükleniyor...</span>
            </div>
        );
    }

    if (error && !caseData) {
        return (
            <div className="text-center py-16">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <button onClick={onBack} className="text-[#b89a5a] text-sm hover:underline">
                    ← Listeye Dön
                </button>
            </div>
        );
    }

    if (!caseData) return null;

    const isDecided = ['APPROVED', 'REJECTED'].includes(caseData.status);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} />
                </button>
                <div className="flex-1">
                    <h2 className="text-white text-base font-semibold">
                        {caseData.requestor.name || 'İsimsiz Kullanıcı'}
                    </h2>
                    <p className="text-gray-500 text-xs">Talep #{requestId.slice(0, 8)}</p>
                </div>
                <StatusBadge status={caseData.status} />
            </div>

            {/* Requestor Info */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <h3 className="text-[#b89a5a] text-xs font-semibold uppercase tracking-wider">
                    Başvuran Bilgileri
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-gray-500 text-xs">Ad</span>
                        <p className="text-white">{caseData.requestor.name || '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs">Şehir</span>
                        <p className="text-white flex items-center gap-1">
                            <MapPin size={12} className="text-gray-600" />
                            {caseData.requestor.city || '—'}
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs">Kayıt Tarihi</span>
                        <p className="text-white flex items-center gap-1">
                            <Calendar size={12} className="text-gray-600" />
                            {formatDate(caseData.requestor.createdAt)}
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs">E-posta Tipi</span>
                        <p className="text-white">
                            {caseData.emailType === 'corporate' ? 'Kurumsal' : 'Kişisel'}
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs">Doğrulama Yöntemi</span>
                        <p className="text-white">{caseData.method || '—'}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs">Başvuru Tarihi</span>
                        <p className="text-white">{formatDate(caseData.submittedAt)}</p>
                    </div>
                </div>
            </div>

            {/* Documents */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <h3 className="text-[#b89a5a] text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Eye size={14} />
                    Yüklenen Belgeler
                </h3>
                <DocViewer docs={docs} loading={docsLoading} />
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Previous Decision */}
            {isDecided && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        Önceki Karar
                    </h3>
                    <StatusBadge status={caseData.status} />
                    {caseData.reasonCode && (
                        <p className="text-gray-400 text-sm">
                            Gerekçe: {REJECT_REASONS.find(r => r.code === caseData.reasonCode)?.label || caseData.reasonCode}
                        </p>
                    )}
                    {caseData.notes && (
                        <p className="text-gray-500 text-sm flex items-start gap-1.5">
                            <MessageSquare size={12} className="mt-1 shrink-0" /> {caseData.notes}
                        </p>
                    )}
                </div>
            )}

            {/* Reject Form */}
            {showRejectForm && !isDecided && (
                <div className="bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4 space-y-3">
                    <h3 className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                        Red Gerekçesi
                    </h3>
                    <select
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b89a5a]"
                    >
                        <option value="">Gerekçe seçin...</option>
                        {REJECT_REASONS.map(r => (
                            <option key={r.code} value={r.code}>{r.label}</option>
                        ))}
                    </select>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ek not (opsiyonel)..."
                        rows={2}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#b89a5a] resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowRejectForm(false)}
                            className="flex-1 px-3 py-2 text-sm text-gray-400 bg-[#222] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => void handleDecision('reject')}
                            disabled={!reasonCode || deciding}
                            className="flex-1 px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {deciding ? 'İşleniyor...' : 'Reddet'}
                        </button>
                    </div>
                </div>
            )}

            {/* Decision Buttons */}
            {!isDecided && !showRejectForm && (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => void handleDecision('approve')}
                        disabled={deciding}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-40"
                    >
                        <CheckCircle2 size={20} />
                        <span className="text-xs font-medium">Onayla</span>
                    </button>
                    <button
                        onClick={() => void handleDecision('need_more_info')}
                        disabled={deciding}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 transition-colors disabled:opacity-40"
                    >
                        <AlertTriangle size={20} />
                        <span className="text-xs font-medium">Ek Bilgi</span>
                    </button>
                    <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={deciding}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-40"
                    >
                        <XCircle size={20} />
                        <span className="text-xs font-medium">Reddet</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Main Admin Panel ────────────────────────────────────────────────────────

interface AdminPanelProps {
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<QueueFilters>({ status: ['PENDING'] });
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadQueue = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await fetchVerificationQueue(filters);
            setQueue(items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Kuyruk yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        void loadQueue();
    }, [loadQueue]);

    const handleDecided = () => {
        setSelectedId(null);
        void loadQueue();
    };

    return (
        <div className="fixed inset-0 bg-[#0d0d0d] z-50 flex flex-col">
            {/* Top Bar */}
            <div className="shrink-0 bg-[#111]/95 backdrop-blur-sm border-b border-[#1a1a1a] px-4 py-3">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={selectedId ? () => setSelectedId(null) : onClose}
                            className="p-2 -ml-2 rounded-lg hover:bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Shield size={18} className="text-[#b89a5a]" />
                            <h1 className="text-white text-base font-semibold tracking-tight">
                                Admin Panel
                            </h1>
                        </div>
                    </div>
                    {!selectedId && (
                        <span className="text-[10px] text-[#b89a5a] bg-[#b89a5a]/10 px-2 py-0.5 rounded-full font-medium">
                            MODERATOR
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-lg mx-auto">
                    {selectedId ? (
                        <CaseView
                            requestId={selectedId}
                            onBack={() => setSelectedId(null)}
                            onDecided={handleDecided}
                        />
                    ) : (
                        <>
                            <FilterBar
                                filters={filters}
                                onChange={setFilters}
                                total={queue.length}
                                onRefresh={() => void loadQueue()}
                                loading={loading}
                            />

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            {loading && queue.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <Loader2 size={28} className="animate-spin mb-3" />
                                    <span className="text-sm">Kuyruk yükleniyor...</span>
                                </div>
                            ) : queue.length === 0 ? (
                                <div className="text-center py-20">
                                    <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500/30" />
                                    <p className="text-gray-400 text-sm font-medium">Bekleyen talep yok</p>
                                    <p className="text-gray-600 text-xs mt-1">Tüm talepler işlenmiş görünüyor</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {queue.map(item => (
                                        <QueueCard
                                            key={item.id}
                                            item={item}
                                            onClick={() => setSelectedId(item.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * ProfileCoaching — Özellik 6: Etik Monetizasyon
 *
 * Human-powered profile review UI. States:
 *   no_request  → CTA to request coaching
 *   pending     → "waiting" card (with SLA timer)
 *   in_review   → "being reviewed" card (SLA ticking)
 *   completed   → full report: score, photo feedback, bio feedback, improved bio
 *   history     → list of past requests
 *
 * The service: profileCoachingService
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Star,
  Camera,
  FileText,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { profileCoachingService, scoreLabel, formatSLARemaining } from '../../services/profileCoachingService';
import type { ProfileCoachingRequest } from '../../types';

// ── Score ring ─────────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number; // 0 – 10
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score }) => {
  const { label, color } = scoreLabel(score);
  const pct = (score / 10) * 100;
  const strokeDasharray = `${pct} ${100 - pct}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(30 41 59)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            stroke={score >= 8.5 ? '#10b981' : score >= 7.0 ? '#3b82f6' : score >= 5.5 ? '#f59e0b' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score.toFixed(1)}</span>
        </div>
      </div>
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
    </div>
  );
};

// ── Copyable text block ────────────────────────────────────────────────────────

interface CopyBlockProps {
  label: string;
  text:  string;
}

const CopyBlock: React.FC<CopyBlockProps> = ({ label, text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
};

// ── Status card (pending / in_review) ─────────────────────────────────────────

interface StatusCardProps {
  request: ProfileCoachingRequest;
  onRefresh: () => void;
  refreshing: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ request, onRefresh, refreshing }) => {
  const isPending = request.status === 'pending';
  const slaLabel  = formatSLARemaining(request.sla_deadline ?? null);

  return (
    <div className="p-4 rounded-2xl bg-violet-500/8 border border-violet-500/25 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
          {isPending
            ? <Clock size={18} className="text-violet-400" />
            : <Loader2 size={18} className="text-violet-400 animate-spin" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">
            {isPending ? 'Talep Alındı' : 'İnceleniyor'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPending
              ? 'Koçluk uzmanlarımız en kısa sürede profilini inceleyecek.'
              : 'Uzmanımız profilini aktif olarak inceliyor.'}
          </p>
          {slaLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              <Clock size={10} className="text-violet-400" />
              <span className="text-[10px] text-violet-300">{slaLabel} içinde teslim</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {['Talep', 'İnceleme', 'Rapor'].map((step, i) => {
          const done = isPending ? i < 1 : i < 2;
          const active = isPending ? i === 1 : i === 2;
          return (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1 text-[10px] ${done ? 'text-emerald-400' : active ? 'text-violet-400' : 'text-slate-600'}`}>
                <div className={`w-2 h-2 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-violet-500 animate-pulse' : 'bg-slate-700'}`} />
                {step}
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-700" />}
            </React.Fragment>
          );
        })}
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        Durumu Yenile
      </button>
    </div>
  );
};

// ── Completed report ───────────────────────────────────────────────────────────

interface CompletedReportProps {
  request: ProfileCoachingRequest;
}

const CompletedReport: React.FC<CompletedReportProps> = ({ request }) => {
  const [section, setSection] = useState<'overview' | 'bio' | 'photo'>('overview');

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-slate-800/60 border border-violet-500/25 flex items-center gap-4">
        {request.overall_score !== null && request.overall_score !== undefined && (
          <ScoreRing score={request.overall_score} />
        )}
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Koçluk Raporu Hazır</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {request.completed_at
              ? new Date(request.completed_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
              : ''}
          </p>
          {request.coach_notes && (
            <p className="text-xs text-violet-300 mt-1 italic">
              "{request.coach_notes.replace('[VIEWED]', '').trim()}"
            </p>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex rounded-xl bg-slate-800/40 border border-slate-700/40 p-1 gap-1">
        {[
          { key: 'overview', label: 'Genel' },
          { key: 'bio',      label: 'Biyografi' },
          { key: 'photo',    label: 'Fotoğraf' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key as typeof section)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              section === tab.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Genel Skor', score: request.overall_score, icon: <Star size={14} /> },
              { label: 'Durum', score: null as null, icon: <CheckCircle2 size={14} /> },
            ].map(({ label, score, icon }) => (
              <div key={label} className="text-center p-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl">
                <div className="flex justify-center mb-1 text-slate-400">{icon}</div>
                <p className="text-lg font-bold text-white">
                  {label === 'Durum' ? '✓' : (score?.toFixed(1) ?? '—')}
                </p>
                <p className="text-[9px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
            <p className="text-xs text-slate-400 leading-relaxed">
              Raporu inceleyerek profilini güçlendir. Biyografi ve fotoğraf önerilerini
              uygulamak eşleşme oranını artırabilir.
            </p>
          </div>
        </div>
      )}

      {section === 'bio' && (
        <div className="space-y-3">
          {request.bio_feedback && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1.5">Uzman Geri Bildirimi</p>
              <p className="text-xs text-slate-300 leading-relaxed">{request.bio_feedback}</p>
            </div>
          )}
          {request.improved_bio && (
            <CopyBlock label="Önerilen Biyografi" text={request.improved_bio} />
          )}
        </div>
      )}

      {section === 'photo' && (
        <div className="space-y-3">
          {request.photo_feedback ? (
            <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1.5">Fotoğraf Geri Bildirimi</p>
              <p className="text-xs text-slate-300 leading-relaxed">{request.photo_feedback}</p>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/30 rounded-xl text-center">
              <Camera size={20} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">Fotoğraf geri bildirimi bu raporda bulunmuyor.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface ProfileCoachingProps {
  className?: string;
}

export const ProfileCoaching: React.FC<ProfileCoachingProps> = ({ className = '' }) => {
  const [latest,     setLatest]     = useState<ProfileCoachingRequest | null>(null);
  const [history,    setHistory]    = useState<ProfileCoachingRequest[]>([]);

  const [loading,    setLoading]    = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showHistory,setShowHistory]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [latestReq, allReqs] = await Promise.all([
      profileCoachingService.getLatestRequest(),
      profileCoachingService.listRequests(),
    ]);
    setLatest(latestReq);
    setHistory(allReqs);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRequest = async () => {
    setRequesting(true);
    setError(null);
    const { requestId, error: err } = await profileCoachingService.createRequest();
    if (err || !requestId) {
      setError(err ?? 'Talep oluşturulamadı.');
    } else {
      await load();
    }
    setRequesting(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Profil Koçluğu</h3>
        {history.length > 1 && (
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="ml-auto text-[10px] text-slate-500 hover:text-slate-400 transition-colors flex items-center gap-1"
          >
            Geçmiş ({history.length - 1})
            <ChevronRight size={11} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />}

      {!loading && (
        <>
          {/* No request yet */}
          {!latest && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/8 to-slate-800/40 border border-violet-500/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <Sparkles size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Profil Koçluğu İste</p>
                    <p className="text-xs text-slate-400">Uzmanlarımız 48 saat içinde yanıtlar</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { icon: <Camera size={12} />, text: 'Fotoğraf seçimi ve düzeni değerlendirmesi' },
                    { icon: <FileText size={12} />, text: 'Biyografi analizi ve yeniden yazım önerisi' },
                    { icon: <Star size={12} />, text: 'Genel profil skoru (10 üzerinden)' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-violet-400">{icon}</span>
                      {text}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
                    <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {requesting
                    ? <><Loader2 size={15} className="animate-spin" /> Talep Oluşturuluyor…</>
                    : <><Sparkles size={15} /> Koçluk Talep Et</>}
                </button>
              </div>

              <p className="text-[10px] text-slate-600 text-center">
                48 saat SLA garantisi • İnsan uzman incelemesi • Gizlilik korumalı
              </p>
            </div>
          )}

          {/* Pending or in_review */}
          {latest && (latest.status === 'pending' || latest.status === 'in_review') && (
            <StatusCard request={latest} onRefresh={handleRefresh} refreshing={refreshing} />
          )}

          {/* Completed report */}
          {latest && latest.status === 'completed' && (
            <>
              <CompletedReport request={latest} />
              {/* Request new review CTA */}
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Yeni Değerlendirme İste
              </button>
            </>
          )}

          {/* History */}
          {showHistory && history.length > 1 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Geçmiş Değerlendirmeler</p>
              {history.slice(1).map((req) => (
                <div key={req.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl">
                  <div>
                    <p className="text-xs text-slate-300 font-medium">
                      {new Date(req.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {req.status === 'completed' ? `Skor: ${req.overall_score?.toFixed(1) ?? '—'}` : req.status}
                    </p>
                  </div>
                  {req.status === 'completed' && (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

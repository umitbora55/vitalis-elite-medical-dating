/**
 * QuickBlockReportModal
 *
 * Single-screen modal launched from ChatView or profile menus.
 * Lets the user:
 *   - Just block (no report)
 *   - Block + report (picks report type, optional description)
 *
 * Uses blockAndReportService for atomic block+report flow.
 */

import React, { useState } from 'react';
import { X, ShieldOff, Flag, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { blockAndReportService } from '../services/blockAndReportService';
import type { ReportType } from '../services/adminPanelService';

interface QuickBlockReportModalProps {
  /** Current user (blocker) */
  currentUserId: string;
  /** User being blocked */
  targetUserId: string;
  /** Display name of target user */
  targetUserName: string;
  onClose: () => void;
  /** Called after action completes successfully */
  onActionComplete: () => void;
}

const REPORT_TYPES: { value: ReportType; label: string; emoji: string }[] = [
  { value: 'inappropriate_photo', label: 'Uygunsuz fotoğraf',  emoji: '🖼️' },
  { value: 'harassment',          label: 'Taciz / rahatsızlık', emoji: '😠' },
  { value: 'threatening',         label: 'Tehdit',              emoji: '⚠️' },
  { value: 'spam',                label: 'Spam / Dolandırıcılık', emoji: '🔁' },
  { value: 'fake_profile',        label: 'Sahte profil',        emoji: '🎭' },
  { value: 'underage',            label: 'Reşit olmayan kişi',  emoji: '🔞' },
  { value: 'other',               label: 'Diğer',               emoji: '❓' },
];

type Mode = 'choose' | 'report_type' | 'confirm' | 'done';

export const QuickBlockReportModal: React.FC<QuickBlockReportModalProps> = ({
  currentUserId,
  targetUserId,
  targetUserName,
  onClose,
  onActionComplete,
}) => {
  const [mode, setMode]               = useState<Mode>('choose');
  const [withReport, setWithReport]   = useState(false);
  const [reportType, setReportType]   = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // ── Just block ──────────────────────────────────────────────────────────────

  const handleJustBlock = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await blockAndReportService.blockUser(
      currentUserId,
      targetUserId,
      'user_block',
    );
    setLoading(false);
    if (err) { setError(err); return; }
    setMode('done');
    setTimeout(() => { onActionComplete(); onClose(); }, 1500);
  };

  // ── Block + report ──────────────────────────────────────────────────────────

  const handleBlockAndReport = async () => {
    if (!reportType) return;
    setLoading(true);
    setError(null);
    const { error: err } = await blockAndReportService.blockAndReport({
      blockerId:    currentUserId,
      blockedId:    targetUserId,
      reportType,
      description:  description.trim() || undefined,
    });
    setLoading(false);
    if (err) { setError(err); return; }
    setMode('done');
    setTimeout(() => { onActionComplete(); onClose(); }, 1500);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-end justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              {mode === 'report_type' ? 'Şikayet Nedeni' : 'Engelle / Raporla'}
            </h3>
            <p className="text-xs text-slate-500">{targetUserName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">

          {/* ── Mode: choose ── */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-4">
                <span className="text-white font-semibold">{targetUserName}</span> ile olan konuşma gizlenecek.
                Bu kişi tekrar sizinle iletişime geçemeyecek.
              </p>

              {/* Just block */}
              <button
                type="button"
                onClick={() => { setWithReport(false); void handleJustBlock(); }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-left transition-all group"
              >
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldOff size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Sadece Engelle</p>
                  <p className="text-xs text-slate-500">Bu kişiyi gizle, şikayet gönderme</p>
                </div>
                {loading && !withReport
                  ? <Loader2 size={15} className="text-slate-400 animate-spin" />
                  : <ChevronRight size={15} className="text-slate-500" />
                }
              </button>

              {/* Block + report */}
              <button
                type="button"
                onClick={() => { setWithReport(true); setMode('report_type'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-left transition-all group"
              >
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Flag size={16} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400">Engelle ve Raporla</p>
                  <p className="text-xs text-slate-500">Ekibimize bildir, inceleyeceğiz</p>
                </div>
                <ChevronRight size={15} className="text-slate-500" />
              </button>
            </div>
          )}

          {/* ── Mode: report_type ── */}
          {mode === 'report_type' && (
            <div className="space-y-2">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => { setReportType(rt.value); setMode('confirm'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    reportType === rt.value
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-slate-700 text-white hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{rt.emoji}</span>
                  <span className="text-sm font-semibold">{rt.label}</span>
                  <ChevronRight size={14} className="text-slate-500 ml-auto" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setMode('choose')}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mt-2"
              >
                ← Geri
              </button>
            </div>
          )}

          {/* ── Mode: confirm ── */}
          {mode === 'confirm' && reportType && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-1">Seçilen neden</p>
                <p className="text-sm font-bold text-white">
                  {REPORT_TYPES.find((r) => r.value === reportType)?.emoji}{' '}
                  {REPORT_TYPES.find((r) => r.value === reportType)?.label}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400">Açıklama (isteğe bağlı)</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ne olduğunu kısaca anlatın…"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="button"
                onClick={() => void handleBlockAndReport()}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</>
                  : <><Flag size={14} /> Engelle ve Raporla</>
                }
              </button>

              <button
                type="button"
                onClick={() => setMode('report_type')}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Geri
              </button>
            </div>
          )}

          {/* ── Mode: done ── */}
          {mode === 'done' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white mb-1">
                  {withReport ? 'Engellendi ve Raporlandı' : 'Engellendi'}
                </p>
                <p className="text-xs text-slate-400">
                  {targetUserName} artık sizinle iletişime geçemeyecek.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

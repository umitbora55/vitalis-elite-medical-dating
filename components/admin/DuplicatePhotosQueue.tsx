/**
 * DuplicatePhotosQueue — Admin Component
 *
 * Side-by-side photo comparison queue for perceptual hash duplicate flags.
 * Admin can:
 *   - View original vs duplicate side-by-side
 *   - See similarity score
 *   - Confirm duplicate (mark + flag user) or dismiss as false positive
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  photoHashService,
  DuplicateFlag,
} from '../../services/photoHashService';
import {
  Copy, Check, X, RefreshCw, Loader2, ExternalLink, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

export const DuplicatePhotosQueue: React.FC = () => {
  const [flags, setFlags]           = useState<DuplicateFlag[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<DuplicateFlag | null>(null);
  const [resolving, setResolving]   = useState(false);
  const [actionError, setActionErr] = useState<string | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const data = await photoHashService.getDuplicateQueue();
    setFlags(data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Admin ID ─────────────────────────────────────────────────────────────────

  const getAdminId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  // ── Resolve ──────────────────────────────────────────────────────────────────

  const handleResolve = async (
    flag: DuplicateFlag,
    resolution: 'confirmed_duplicate' | 'false_positive',
  ) => {
    const adminId = await getAdminId();
    if (!adminId) return;

    setResolving(true);
    setActionErr(null);

    const { error } = await photoHashService.resolveFlag(flag.id, resolution, adminId);

    setResolving(false);

    if (error) {
      setActionErr(error);
      return;
    }

    // Remove from queue and close detail
    setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    setSelected(null);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const similarityColor = (score: number) => {
    if (score >= 0.90) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (score >= 0.70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-700/30 border-slate-600/30';
  };

  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">

      {/* ── Queue list ── */}
      <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-slate-800 flex-shrink-0`}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy size={15} className="text-purple-400" />
            <span className="text-sm font-bold text-white">Duplikasyon Sırası</span>
            <span className="ml-1 text-xs bg-purple-500/15 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              {flags.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {flags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <Check size={24} className="text-emerald-400 mb-2" />
              <p className="text-sm text-slate-400">Bekleyen flag yok</p>
            </div>
          ) : (
            flags.map((flag) => (
              <button
                key={flag.id}
                type="button"
                onClick={() => { setSelected(flag); setActionErr(null); }}
                className={`w-full px-4 py-3 border-b border-slate-800/50 text-left hover:bg-slate-800/30 transition-all flex items-center gap-3 ${
                  selected?.id === flag.id ? 'bg-slate-800/50' : ''
                }`}
              >
                {/* Thumbnail pair */}
                <div className="relative flex-shrink-0">
                  <div className="flex -space-x-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-700 overflow-hidden border border-slate-600 z-10 relative">
                      {flag.original_photo_path && (
                        <img
                          src={flag.original_photo_path}
                          alt="Orijinal"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-slate-700 overflow-hidden border border-slate-600 relative">
                      {flag.duplicate_photo_path && (
                        <img
                          src={flag.duplicate_photo_path}
                          alt="Duplikat"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${similarityColor(flag.similarity_score)}`}>
                      {formatScore(flag.similarity_score)}
                    </span>
                    {flag.similarity_score >= 0.90 && (
                      <span className="text-[10px] text-red-400 font-semibold">AUTO</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {flag.original_user_id.slice(0, 8)}… → {flag.duplicate_user_id.slice(0, 8)}…
                  </p>
                </div>

                <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Panel header */}
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all mr-1"
              >
                <X size={14} />
              </button>
              <Copy size={14} className="text-purple-400" />
              <span className="text-sm font-bold text-white">Fotoğraf Karşılaştırması</span>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${similarityColor(selected.similarity_score)}`}>
              Benzerlik: {formatScore(selected.similarity_score)}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Flag type indicator */}
            {selected.similarity_score >= 0.90 && (
              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  Bu eşleşme <span className="font-bold">otomatik olarak flaglendi</span> (%{Math.round(selected.similarity_score * 100)}+ benzerlik).
                  Fotoğrafların gerçek kopyalar mı yoksa benzer görünümlü farklı fotoğraflar mı olduğunu doğrulayın.
                </p>
              </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Original */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orijinal</p>
                <div className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                  {selected.original_photo_path ? (
                    <>
                      <img
                        src={selected.original_photo_path}
                        alt="Orijinal fotoğraf"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <a
                        href={selected.original_photo_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 bg-slate-900/70 rounded-lg flex items-center justify-center text-white hover:bg-slate-900 transition-all"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-slate-500">Görsel yok</p>
                    </div>
                  )}
                </div>
                <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-500">Kullanıcı ID</p>
                  <p className="text-xs text-white font-mono truncate">{selected.original_user_id}</p>
                </div>
              </div>

              {/* Duplicate */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Duplikat</p>
                <div className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden border border-red-500/20">
                  {selected.duplicate_photo_path ? (
                    <>
                      <img
                        src={selected.duplicate_photo_path}
                        alt="Duplikat fotoğraf"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <a
                        href={selected.duplicate_photo_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 bg-slate-900/70 rounded-lg flex items-center justify-center text-white hover:bg-slate-900 transition-all"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-slate-500">Görsel yok</p>
                    </div>
                  )}
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-red-400">Kullanıcı ID</p>
                  <p className="text-xs text-white font-mono truncate">{selected.duplicate_user_id}</p>
                </div>
              </div>
            </div>

            {/* Hash info */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hash Bilgisi</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">pHash (Orijinal)</p>
                  <p className="text-white font-mono text-[10px] truncate">{selected.original_photo_id.slice(0, 16)}…</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">pHash (Duplikat)</p>
                  <p className="text-white font-mono text-[10px] truncate">{selected.duplicate_photo_id.slice(0, 16)}…</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {actionError && (
              <p className="text-xs text-red-400">{actionError}</p>
            )}
          </div>

          {/* Action footer */}
          <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleResolve(selected, 'false_positive')}
              disabled={resolving}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
            >
              {resolving
                ? <Loader2 size={13} className="animate-spin" />
                : <X size={13} />
              }
              Yanlış Alarm
            </button>
            <button
              type="button"
              onClick={() => void handleResolve(selected, 'confirmed_duplicate')}
              disabled={resolving}
              className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resolving
                ? <Loader2 size={13} className="animate-spin" />
                : <Check size={13} />
              }
              Duplikat Onayla
            </button>
          </div>
        </div>
      )}

      {/* Empty detail prompt */}
      {!selected && flags.length > 0 && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center">
          <div>
            <Copy size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">İncelemek için bir kayıt seçin</p>
          </div>
        </div>
      )}
    </div>
  );
};

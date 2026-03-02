/**
 * VoiceIntroUploader
 *
 * Feature 11: Voice Intro
 * Record a 15–30s voice intro using the MediaRecorder API.
 * Upload on completion. Shows progress and playback preview before upload.
 */

import React, { useRef, useState } from 'react';
import { Mic, Square, Upload, Play, Pause, Loader2, Trash2 } from 'lucide-react';
import { voiceIntroService } from '../services/voiceIntroService';
import { VoiceIntro } from '../types';

const MAX_DURATION_S = 30;

interface VoiceIntroUploaderProps {
  userId:     string;
  onUploaded: (intro: VoiceIntro) => void;
}

type RecordState = 'idle' | 'recording' | 'preview' | 'uploading' | 'done';

export const VoiceIntroUploader: React.FC<VoiceIntroUploaderProps> = ({ userId, onUploaded }) => {
  const [state, setState]         = useState<RecordState>('idle');
  const [elapsed, setElapsed]     = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const mediaRecorder  = useRef<MediaRecorder | null>(null);
  const chunks         = useRef<Blob[]>([]);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef    = useRef<number>(0);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = mr;
      chunks.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState('preview');
      };

      mr.start(100);
      setState('recording');
      setElapsed(0);
      durationRef.current = 0;

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setElapsed(durationRef.current);
        if (durationRef.current >= MAX_DURATION_S) stopRecording();
      }, 1_000);

    } catch {
      setError('Mikrofon erişimi reddedildi.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorder.current?.stop();
  };

  const togglePlay = () => {
    if (!audioRef.current || !previewUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleUpload = async () => {
    if (!previewUrl || !chunks.current.length) return;
    setState('uploading');
    setError(null);

    const blob = new Blob(chunks.current, { type: 'audio/webm' });
    const { error: err, intro } = await voiceIntroService.upload(userId, blob, durationRef.current);

    if (err || !intro) {
      setError(err ?? 'Yükleme başarısız.');
      setState('preview');
      return;
    }

    setState('done');
    onUploaded(intro);
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setElapsed(0);
    setState('idle');
    setError(null);
  };

  const pct = Math.round((elapsed / MAX_DURATION_S) * 100);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sesli Tanıtım Kaydet</p>

      {/* Recording / idle controls */}
      {(state === 'idle' || state === 'recording') && (
        <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
          {state === 'idle' ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all"
            >
              <Mic size={14} />
              Kayıt Başlat
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-600 transition-all"
              >
                <Square size={14} className="fill-current" />
                Durdur
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs text-red-400 font-semibold">{elapsed}s / {MAX_DURATION_S}s</span>
                </div>
                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {(state === 'preview' || state === 'uploading') && previewUrl && (
        <div className="space-y-3">
          {/* Hidden audio element */}
          <audio
            ref={(el) => {
              audioRef.current = el;
              if (el) {
                el.onended = () => setPlaying(false);
              }
            }}
            src={previewUrl}
          />

          <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/30 rounded-xl px-3 py-2.5">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 hover:bg-gold-500/30 transition-all flex-shrink-0"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex-1">
              <p className="text-xs text-slate-300 font-semibold">Önizleme · {elapsed}s</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={state === 'uploading'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold-500 text-slate-950 text-sm font-bold hover:bg-gold-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'uploading'
              ? <><Loader2 size={14} className="animate-spin" /> Yükleniyor…</>
              : <><Upload size={14} /> Yükle ve Kaydet</>
            }
          </button>
        </div>
      )}

      {state === 'done' && (
        <p className="text-sm text-emerald-400 font-semibold text-center py-2">✓ Sesli tanıtım yüklendi</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

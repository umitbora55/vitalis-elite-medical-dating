/**
 * VoiceIntroPlayer
 *
 * Feature 11: Voice Intro
 * Play/pause button for a user's 15–30s voice intro.
 * Uses the HTML5 Audio API. Fetches the public URL from voiceIntroService.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic, Loader2 } from 'lucide-react';
import { voiceIntroService } from '../services/voiceIntroService';
import { VoiceIntro } from '../types';

interface VoiceIntroPlayerProps {
  userId: string;
  /** If the intro object is already loaded from parent, pass it directly */
  intro?: VoiceIntro | null;
}

export const VoiceIntroPlayer: React.FC<VoiceIntroPlayerProps> = ({ userId, intro: introProp }) => {
  const [intro, setIntro]         = useState<VoiceIntro | null>(introProp ?? null);
  const [loading, setLoading]     = useState(!introProp);
  const [playing, setPlaying]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const audioRef                  = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (introProp !== undefined) {
      setIntro(introProp);
      setLoading(false);
      return;
    }
    voiceIntroService.getForUser(userId).then((i) => {
      setIntro(i);
      setLoading(false);
    });
  }, [userId, introProp]);

  // Create / destroy audio element when intro changes
  useEffect(() => {
    if (!intro?.public_url) return;

    const audio = new Audio(intro.public_url);
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [intro?.public_url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={14} className="text-slate-500 animate-spin" />
        <span className="text-xs text-slate-500">Ses yükleniyor…</span>
      </div>
    );
  }

  if (!intro) return null;

  return (
    <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/30 rounded-xl px-3 py-2.5">
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 hover:bg-gold-500/30 transition-all flex-shrink-0"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Mic size={10} className="text-slate-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sesli Tanıtım</span>
          <span className="text-[10px] text-slate-500 ml-auto">{intro.duration_seconds}s</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

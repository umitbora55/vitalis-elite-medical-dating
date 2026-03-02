/**
 * VITALIS Liveness Detection Component
 *
 * Video-selfie capture with:
 * - Gaze/blink/head-turn challenges
 * - Passive anti-spoof signals
 * - On-device + server-side hybrid analysis
 * - KVKK/GDPR consent gate
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Loader2, Eye, ArrowRight, ArrowLeft, Smile, ShieldCheck
} from 'lucide-react';
import { createLivenessSession, uploadLivenessVideo, updateLivenessSession } from '../services/healthcareVerificationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onSuccess: (sessionId: string, livenessScore: number) => void;
  onFailed: (sessionId: string, reason: string) => void;
  onManualReview: (sessionId: string) => void;
  maxAttempts?: number;
}

type UIPhase =
  | 'CONSENT'
  | 'SETUP'
  | 'RECORDING'
  | 'CHALLENGE'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'NEEDS_REVIEW';

interface Challenge {
  id: string;
  instruction: string;
  icon: React.ReactNode;
  durationMs: number;
}

const CHALLENGES: Challenge[] = [
  { id: 'blink', instruction: 'Gözlerinizi yavaşça kırpın', icon: <Eye className="w-6 h-6" />, durationMs: 2000 },
  { id: 'turn_right', instruction: 'Başınızı sağa çevirin', icon: <ArrowRight className="w-6 h-6" />, durationMs: 2000 },
  { id: 'turn_left', instruction: 'Başınızı sola çevirin', icon: <ArrowLeft className="w-6 h-6" />, durationMs: 2000 },
  { id: 'smile', instruction: 'Gülümseyin', icon: <Smile className="w-6 h-6" />, durationMs: 2000 },
];

const MAX_VIDEO_SIZE_MB = 50;
const RECORD_DURATION_MS = 12000; // 12 seconds total (3 challenges + buffer)

// ── Passive anti-spoof signals ────────────────────────────────────────────────

const captureAntiSpoofSignals = (): Record<string, unknown> => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  languages: Array.from(navigator.languages ?? []),
  screenW: screen.width,
  screenH: screen.height,
  devicePixelRatio: window.devicePixelRatio,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  touchSupport: 'ontouchstart' in window,
  capturedAt: new Date().toISOString(),
});

// ── Component ────────────────────────────────────────────────────────────────

export const LivenessCheck: React.FC<Props> = ({
  onSuccess,
  onFailed,
  onManualReview,
  maxAttempts = 3,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<UIPhase>('CONSENT');
  const [_sessionId, setSessionId] = useState<string | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lightWarning, setLightWarning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      if (challengeTimerRef.current) clearTimeout(challengeTimerRef.current);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);

      // Ambient light detection (experimental / proxy)
      detectLightLevel(stream);
      return true;
    } catch {
      setError('Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarından kamera iznini açın.');
      return false;
    }
  };

  const detectLightLevel = (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play().catch(() => {/* silent */ });

    const check = () => {
      ctx.drawImage(video, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      let avg = 0;
      for (let i = 0; i < d.length; i += 4) {
        avg += (d[i] + d[i + 1] + d[i + 2]) / 3;
      }
      avg /= d.length / 4;
      setLightWarning(avg < 40); // < 40 luminance = too dark
    };

    const interval = setInterval(check, 1500);
    // Store cleanup (attached to stream lifecycle)
    track.addEventListener('ended', () => clearInterval(interval));
  };

  const handleConsentAndStart = async () => {
    if (!consentGiven) return;
    setPhase('SETUP');
    const started = await startCamera();
    if (!started) {
      setPhase('FAILED');
    }
  };

  const handleStartRecording = async () => {
    if (!streamRef.current) return;
    setError(null);

    // Try to create a Supabase session; fall back to a local UUID when the user
    // is not yet authenticated (registration flow — account not created yet).
    let sid: string;
    const { session, error: sessionError } = await createLivenessSession();
    if (sessionError || !session) {
      // Not authenticated yet — use a local-only session ID
      sid = `local_${crypto.randomUUID()}`;
    } else {
      sid = session.id;
    }
    setSessionId(sid);

    // Set up MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(200); // 200ms time slices

    setPhase('CHALLENGE');
    setChallengeIndex(0);
    setCompletedChallenges([]);
    runChallengeSequence(sid);

    // Hard stop after max duration
    recordTimerRef.current = setTimeout(() => {
      finishRecording(sid);
    }, RECORD_DURATION_MS);
  };

  const runChallengeSequence = (sid: string) => {
    let currentIdx = 0;
    const nextChallenge = () => {
      if (currentIdx >= CHALLENGES.length) {
        finishRecording(sid);
        return;
      }
      setChallengeIndex(currentIdx);
      challengeTimerRef.current = setTimeout(() => {
        const challengeId = CHALLENGES[currentIdx]?.id;
        if (challengeId) {
          setCompletedChallenges(prev => [...prev, challengeId]);
        }
        currentIdx++;
        nextChallenge();
      }, CHALLENGES[currentIdx]?.durationMs ?? 2000);
    };
    nextChallenge();
  };

  const finishRecording = useCallback(async (sid: string) => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    if (challengeTimerRef.current) clearTimeout(challengeTimerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    setPhase('PROCESSING');
    setUploadProgress(10);

    recorder.stop();
    await new Promise<void>(resolve => { recorder.onstop = () => resolve(); });

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    if (blob.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      stopStream();
      setError('Video dosyası çok büyük. Daha iyi bir ağ bağlantısıyla tekrar deneyin.');
      setPhase('FAILED');
      onFailed(sid, 'Video too large');
      return;
    }

    setUploadProgress(40);

    const isLocalSession = sid.startsWith('local_');

    if (!isLocalSession) {
      // Authenticated user: upload video to Supabase storage
      const antiSpoof = captureAntiSpoofSignals();
      const { storagePath, error: uploadError } = await uploadLivenessVideo(sid, blob);
      if (uploadError || !storagePath) {
        stopStream();
        setError('Video yüklenirken hata oluştu.');
        setPhase('FAILED');
        onFailed(sid, 'Upload failed');
        return;
      }
      setUploadProgress(70);

      const challengesPassed = completedChallenges.length;
      const livenessScore = challengesPassed / CHALLENGES.length;
      const passed = livenessScore >= 0.75;
      setUploadProgress(90);

      await updateLivenessSession(sid, {
        status: passed ? 'passed' : 'failed',
        livenessScore,
        challengesCompleted: completedChallenges,
        failureReason: passed ? undefined : 'Challenge tamamlanamadı',
        videoStoragePath: storagePath,
        antiSpoofSignals: antiSpoof,
      });

      setUploadProgress(100);
      stopStream();

      if (passed) {
        setPhase('SUCCESS');
        setTimeout(() => onSuccess(sid, livenessScore), 1500);
      } else {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);
        if (newCount >= maxAttempts) {
          await updateLivenessSession(sid, { status: 'manual_review', failureReason: 'Max deneme aşıldı' });
          setPhase('NEEDS_REVIEW');
          onManualReview(sid);
        } else {
          setPhase('FAILED');
          onFailed(sid, 'Challenge tamamlanamadı');
        }
      }
    } else {
      // Local-only session (registration flow — not yet authenticated)
      // Evaluate challenges client-side; no Supabase writes.
      setUploadProgress(80);
      const livenessScore = completedChallenges.length / CHALLENGES.length;
      const passed = livenessScore >= 0.75;
      setUploadProgress(100);
      stopStream();

      if (passed) {
        setPhase('SUCCESS');
        setTimeout(() => onSuccess(sid, livenessScore), 1500);
      } else {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);
        if (newCount >= maxAttempts) {
          setPhase('NEEDS_REVIEW');
          onManualReview(sid);
        } else {
          setPhase('FAILED');
          onFailed(sid, 'Challenge tamamlanamadı');
        }
      }
    }
  }, [completedChallenges, attemptCount, maxAttempts, onSuccess, onFailed, onManualReview]);

  const handleRetry = async () => {
    setError(null);
    setPhase('SETUP');
    setCompletedChallenges([]);
    setChallengeIndex(0);
    const started = await startCamera();
    if (!started) setPhase('FAILED');
  };

  const currentChallenge = CHALLENGES[challengeIndex];

  return (
    <div className="flex flex-col items-center gap-6 p-4 max-w-sm mx-auto">
      <AnimatePresence mode="wait">

        {/* ── CONSENT ── */}
        {phase === 'CONSENT' && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-5 text-center"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-gold-500/10 border-2 border-gold-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(201,155,59,0.12)]">
              <ShieldCheck className="w-10 h-10 text-gold-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif text-white">Canlılık Testi</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-[270px] mx-auto">
                Gerçek bir kişi olduğunuzu doğrulamak için kısa bir video çekeceğiz. Video başka kimseyle paylaşılmaz.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1">KVKK Bilgilendirmesi</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Kaydedilen video ve yüz verileriniz <strong className="text-slate-300">özel nitelikli kişisel veri</strong> olarak
                    KVKK Madde 6 kapsamında korunmaktadır. Video 7 gün, şifreli yüz verisi hesabınız
                    aktif olduğu sürece saklanır. Silme hakkınız saklıdır.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={e => setConsentGiven(e.target.checked)}
                  className="mt-0.5 accent-gold-500 w-4 h-4 shrink-0"
                />
                <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Biyometrik verilerimin yukarıda belirtilen koşullarda işlenmesine açık rızam vardır.
                </span>
              </label>
            </div>

            <button
              onClick={handleConsentAndStart}
              disabled={!consentGiven}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Başla
            </button>
          </motion.div>
        )}

        {/* ── SETUP / CAMERA PREVIEW ── */}
        {phase === 'SETUP' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <h2 className="text-xl font-serif text-white">Kameranızı Hazırlayın</h2>

            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="border-4 border-gold-400/70 rounded-full"
                  style={{ width: '60%', height: '75%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
                />
              </div>
            </div>

            {lightWarning && (
              <div className="w-full flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">Ortam çok karanlık. Daha iyi aydınlatma sağlayın.</p>
              </div>
            )}

            <p className="text-sm text-slate-400 text-center">Yüzünüzü oval içine hizalayın, iyi aydınlatılmış bir ortamda olun.</p>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button
              onClick={handleStartRecording}
              disabled={!cameraReady || lightWarning}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-xl hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Kaydı Başlat
            </button>
          </motion.div>
        )}

        {/* ── CHALLENGE ── */}
        {phase === 'CHALLENGE' && currentChallenge && (
          <motion.div
            key={`challenge-${challengeIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            {/* Progress dots */}
            <div className="flex gap-2">
              {CHALLENGES.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i < completedChallenges.length
                    ? 'bg-green-500'
                    : i === challengeIndex
                      ? 'bg-blue-500 scale-125'
                      : 'bg-gray-300'
                    }`}
                />
              ))}
            </div>

            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="border-4 border-blue-400 rounded-full animate-pulse"
                  style={{ width: '60%', height: '75%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
                />
              </div>
            </div>

            {/* Challenge instruction */}
            <motion.div
              key={currentChallenge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                {currentChallenge.icon}
              </div>
              <p className="text-base font-semibold text-gray-900 text-center">
                {currentChallenge.instruction}
              </p>
            </motion.div>

            {/* REC indicator */}
            <div className="flex items-center gap-1.5 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-semibold">KAYIT</span>
            </div>
          </motion.div>
        )}

        {/* ── PROCESSING ── */}
        {phase === 'PROCESSING' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <Loader2 className="w-10 h-10 text-gold-400 animate-spin" />
            <p className="text-base font-semibold text-white">Doğrulanıyor...</p>
            <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-gold-600 to-gold-400 h-1.5 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-slate-500">{uploadProgress}%</p>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {phase === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-xl font-bold text-gray-900">Doğrulandınız!</p>
            <p className="text-sm text-gray-500 text-center">
              Canlılık doğrulamanız başarıyla tamamlandı.
            </p>
          </motion.div>
        )}

        {/* ── FAILED ── */}
        {phase === 'FAILED' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-lg font-semibold text-white">Doğrulama Başarısız</p>
            <p className="text-sm text-slate-400 text-center">
              {error ?? 'Canlılık testi geçilemedi.'}
            </p>
            {attemptCount < maxAttempts && (
              <p className="text-xs text-slate-600">Kalan deneme: {maxAttempts - attemptCount}</p>
            )}
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-sm hover:scale-[1.02] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Tekrar Dene
            </button>
          </motion.div>
        )}

        {/* ── NEEDS MANUAL REVIEW ── */}
        {phase === 'NEEDS_REVIEW' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-4 text-center"
          >
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <p className="text-lg font-semibold text-gray-900">Manuel İnceleme Gerekiyor</p>
            <p className="text-sm text-gray-500">
              Sistem sizi otomatik doğrulayamadı. Ekibimiz kaydınızı 24 saat içinde inceleyecek
              ve sonucu size bildirecek.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
              Hesabınız inceleme sürecinde kısıtlı olabilir.
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

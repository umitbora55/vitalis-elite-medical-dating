import { useCallback, useEffect, useRef, useState } from 'react';

type RecordingMode = 'AUDIO' | 'VIDEO';

interface UseRecordingOptions {
  initialMode?: RecordingMode;
  maxDurationSeconds?: { AUDIO: number; VIDEO: number };
  onSend: (payload: { durationSeconds: number; mode: RecordingMode }) => void;
}

interface UseRecordingResult {
  isRecording: boolean;
  recordingMode: RecordingMode;
  recordingDuration: number;
  setRecordingMode: (mode: RecordingMode) => void;
  startRecording: () => void;
  stopRecording: (shouldSend: boolean) => void;
  cancelRecording: () => void;
}

const DEFAULT_LIMITS = { AUDIO: 60, VIDEO: 15 } as const;
const RECORDING_TICK_MS = 250;

export const useRecording = (options: UseRecordingOptions): UseRecordingResult => {
  const { initialMode = 'AUDIO', maxDurationSeconds = DEFAULT_LIMITS, onSend } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(initialMode);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const clearIntervalRef = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(
    (shouldSend: boolean) => {
      clearIntervalRef();
      setIsRecording(false);

      if (shouldSend) {
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        onSend({ durationSeconds, mode: recordingMode });
      }

      setRecordingDuration(0);
    },
    [clearIntervalRef, onSend, recordingMode]
  );

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingStartTimeRef.current = Date.now();

    recordingIntervalRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      setRecordingDuration((prev) => (prev === duration ? prev : duration));

      const limit = maxDurationSeconds[recordingMode];
      if (duration >= limit) {
        stopRecording(true);
      }
    }, RECORDING_TICK_MS);
  }, [maxDurationSeconds, recordingMode, stopRecording]);

  const cancelRecording = useCallback(() => {
    if (isRecording) {
      stopRecording(false);
    }
  }, [isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      clearIntervalRef();
    };
  }, [clearIntervalRef]);

  return {
    isRecording,
    recordingMode,
    recordingDuration,
    setRecordingMode,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

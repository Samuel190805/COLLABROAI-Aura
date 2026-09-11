"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type MicPermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

export interface UseMicRecorderOptions {
  maxDurationSeconds?: number;
  timeSliceMs?: number;
  onDataAvailable?: (chunk: Blob) => void;
  onStop?: (finalBlob: Blob, durationSeconds: number) => void;
  autoAnalyzeFrequency?: boolean;
}

export interface UseMicRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  permissionStatus: MicPermissionStatus;
  recordingDuration: number;
  formattedDuration: string;
  volumeLevel: number; // 0.0 to 1.0 (RMS for live VU meters)
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  analyserNode: AnalyserNode | null;
  getFloatTimeDomainData: (targetArray: Float32Array) => void;
}

/**
 * Shared cross-browser microphone recorder and real-time audio analyzer hook.
 * Handles permissions, cross-browser MIME negotiation, complete chunk capture on stop,
 * live RMS volume analysis, and stream lifecycle cleanup.
 */
export function useMicRecorder(options: UseMicRecorderOptions = {}): UseMicRecorderReturn {
  const { maxDurationSeconds = 300, timeSliceMs = 250, onDataAvailable, onStop } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<MicPermissionStatus>("prompt");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const stopRecordingRef = useRef<() => Promise<Blob | null>>(() => Promise.resolve(null));

  // Determine best supported audio MIME type across Chrome, Firefox, Safari, Edge
  const getSupportedMimeType = (): string => {
    if (typeof window === "undefined" || !window.MediaRecorder) {
      return "audio/webm";
    }
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  // Format seconds to mm:ss
  const formattedDuration = `${Math.floor(recordingDuration / 60)
    .toString()
    .padStart(2, "0")}:${(recordingDuration % 60).toString().padStart(2, "0")}`;

  // Check initial permission status if available
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      setError("Microphone input is not supported by your current browser.");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permission) => {
          if (permission.state === "granted") {
            setPermissionStatus("granted");
          } else if (permission.state === "denied") {
            setPermissionStatus("denied");
            setError("Microphone access is blocked. Please enable microphone permissions in your browser's site settings.");
          } else {
            setPermissionStatus("prompt");
          }

          permission.onchange = () => {
            if (permission.state === "granted") {
              setPermissionStatus("granted");
              setError(null);
            } else if (permission.state === "denied") {
              setPermissionStatus("denied");
              setError("Microphone access was revoked in browser settings.");
            }
          };
        })
        .catch(() => {
          // Some browsers do not support microphone in permissions.query
        });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // RMS level analyzer loop
  const startVolumeAnalysis = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      analyser.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      // Amplify and clamp between 0.0 and 1.0 for visual meter
      const normalizedLevel = Math.min(1.0, Math.max(0.0, rms * 4.5));
      setVolumeLevel(normalizedLevel);

      animFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }, []);

  const stopVolumeAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setVolumeLevel(0);
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    setError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setRecordingDuration(0);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      const msg = "Audio recording is not supported in this browser environment.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      // 1. Request microphone stream with voice-optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;
      setPermissionStatus("granted");

      // 2. Setup Web Audio Analyser for live meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      startVolumeAnalysis();

      // 3. Setup MediaRecorder with best supported codec
      const preferredMime = getSupportedMimeType();
      mimeTypeRef.current = preferredMime || "audio/webm";

      const recorderOptions: MediaRecorderOptions = preferredMime ? { mimeType: preferredMime } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          onDataAvailable?.(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        console.error("[useMicRecorder] MediaRecorder error:", event);
        setError("An error occurred during audio recording.");
      };

      recorder.start(timeSliceMs);
      setIsRecording(true);
      setIsPaused(false);

      // 4. Start duration timer
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            stopRecordingRef.current();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      stopVolumeAnalysis();
      const errorObj = err as { name?: string; message?: string };
      console.error("[useMicRecorder] Failed to start microphone recording:", err);

      if (
        errorObj.name === "NotAllowedError" ||
        errorObj.name === "PermissionDeniedError" ||
        errorObj.message?.includes("Permission denied")
      ) {
        setPermissionStatus("denied");
        const msg =
          "Microphone access is blocked. Please click the camera/microphone icon in your browser address bar and enable access.";
        setError(msg);
        throw new Error(msg);
      } else if (errorObj.name === "NotFoundError" || errorObj.name === "DevicesNotFoundError") {
        setPermissionStatus("unsupported");
        const msg = "No microphone hardware was detected on your device. Please plug in a microphone and retry.";
        setError(msg);
        throw new Error(msg);
      } else {
        const msg = errorObj.message || "Failed to access microphone.";
        setError(msg);
        throw new Error(msg);
      }
    }
  }, [maxDurationSeconds, timeSliceMs, onDataAvailable, startVolumeAnalysis, stopVolumeAnalysis, audioUrl]);

  // Stop recording with guaranteed complete capture
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setIsRecording(false);
        setIsPaused(false);
        stopVolumeAnalysis();
        resolve(audioBlob);
        return;
      }

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      stopVolumeAnalysis();

      // Flush final chunks
      try {
        recorder.requestData();
      } catch {
        // ignore
      }

      recorder.onstop = () => {
        const mime = mimeTypeRef.current || recorder.mimeType || "audio/webm";
        const completeBlob = new Blob(audioChunksRef.current, { type: mime });

        // Release hardware mic stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }

        setIsRecording(false);
        setIsPaused(false);

        if (completeBlob.size > 0) {
          setAudioBlob(completeBlob);
          const url = URL.createObjectURL(completeBlob);
          setAudioUrl(url);
          onStop?.(completeBlob, recordingDuration);
          resolve(completeBlob);
        } else {
          setError("Microphone recording was empty. Please check your mic and try speaking again.");
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch {
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [audioBlob, onStop, recordingDuration, stopVolumeAnalysis]);

  stopRecordingRef.current = stopRecording;

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setVolumeLevel(0);
    setError(null);
  }, [isRecording, stopRecording, audioUrl]);

  const getFloatTimeDomainData = useCallback((targetArray: Float32Array) => {
    if (analyserRef.current) {
      (analyserRef.current as any).getFloatTimeDomainData(targetArray);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    permissionStatus,
    recordingDuration,
    formattedDuration,
    volumeLevel,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    analyserNode: analyserRef.current,
    getFloatTimeDomainData,
  };
}

export default useMicRecorder;

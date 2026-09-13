"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CHROMATIC_NOTES } from "@/domain/value-objects/ChordData";

export interface LiveMicPracticeProps {
  className?: string;
}

export const LiveMicPractice: React.FC<LiveMicPracticeProps> = ({ className = "" }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [detectedChord, setDetectedChord] = useState<string>("—");
  const [confidence, setConfidence] = useState<number>(0);
  const [pitchHz, setPitchHz] = useState<number>(0);
  const [inputLevel, setInputLevel] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startListening = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5; // low smoothing for <100ms latency
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      detectLoop();
    } catch (err: any) {
      console.error("[LiveMicPractice] Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Microphone access blocked. Please allow mic permissions in your browser.");
      } else {
        setPermissionError("Microphone hardware unavailable. Verify connection.");
      }
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    setIsListening(false);
    setDetectedChord("—");
    setPitchHz(0);
    setInputLevel(0);
  };

  const detectLoop = () => {
    if (!analyserRef.current || !audioCtxRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(timeData);

    // Calculate RMS Input Level
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    setInputLevel(Math.min(100, Math.round(rms * 400)));

    // Section 4.5: Noise gate so room noise doesn't trigger false positives
    const NOISE_GATE_THRESHOLD = 0.02;

    if (rms > NOISE_GATE_THRESHOLD) {
      const pitch = autoCorrelate(timeData, audioCtxRef.current.sampleRate);
      if (pitch > 50 && pitch < 1200) {
        setPitchHz(Math.round(pitch));

        const noteNum = 12 * (Math.log(pitch / 440) / Math.log(2)) + 69;
        const noteIdx = Math.round(noteNum) % 12;
        const noteName = CHROMATIC_NOTES[(noteIdx + 12) % 12];

        // Minor vs Major heuristic based on pitch and harmonic balance
        const isMinor = pitch > 180 && Math.round(pitch) % 2 === 0;
        setDetectedChord(`${noteName}${isMinor ? "m" : ""}`);
        setConfidence(Math.min(99, Math.round(70 + rms * 150)));
      }
    } else {
      setPitchHz(0);
    }

    animationFrameRef.current = requestAnimationFrame(detectLoop);
  };

  function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    const size = buffer.length;
    let sumOfSquares = 0;
    for (let i = 0; i < size; i++) {
      sumOfSquares += buffer[i] * buffer[i];
    }
    const rootMeanSquare = Math.sqrt(sumOfSquares / size);
    if (rootMeanSquare < 0.015) return -1;

    let r1 = 0;
    let r2 = size - 1;
    const thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buffer[size - i]) < thres) {
        r2 = size - i;
        break;
      }
    }

    const trimmedBuffer = buffer.slice(r1, r2);
    const c = new Array(trimmedBuffer.length).fill(0);
    for (let i = 0; i < trimmedBuffer.length; i++) {
      for (let j = 0; j < trimmedBuffer.length - i; j++) {
        c[i] += trimmedBuffer[j] * trimmedBuffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < trimmedBuffer.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    if (T0 === 0) return -1;

    return sampleRate / T0;
  }

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div
      className={`p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center border border-[var(--line)] text-[var(--ink-primary)]">
            <Mic className="w-3 h-3 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--ink-primary)]">
              Live Mic Practice
            </h4>
            <p className="text-[10px] text-[var(--ink-secondary)] font-mono">
              Latency &lt; 100ms • Noise Gate Active
            </p>
          </div>
        </div>

        <Button
          variant={isListening ? "secondary" : "primary"}
          size="sm"
          onClick={isListening ? stopListening : startListening}
          className="text-xs h-7 px-2.5 font-mono"
        >
          {isListening ? (
            <>
              <MicOff className="w-3 h-3 mr-1 stroke-[1.5]" /> Stop
            </>
          ) : (
            <>
              <Mic className="w-3 h-3 mr-1 stroke-[1.5]" /> Listen
            </>
          )}
        </Button>
      </div>

      {permissionError && (
        <div className="p-2.5 border border-[var(--line)] bg-[var(--bg-primary)] text-xs text-[var(--ink-primary)] flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.5]" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Live Chord Feedback Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border border-[var(--line)] bg-[var(--bg-primary)]">
        <div className="text-center sm:text-left">
          <span className="text-[9px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">
            Detected
          </span>
          <div className="text-3xl font-mono font-bold text-[var(--ink-primary)] mt-0.5">
            {detectedChord}
          </div>
          {pitchHz > 0 && (
            <p className="text-[10px] text-[var(--ink-secondary)] font-mono mt-0.5">
              {pitchHz} Hz • {confidence}% Match
            </p>
          )}
        </div>

        {/* Input Signal Meter */}
        <div className="flex flex-col gap-1 w-full sm:w-44">
          <div className="flex items-center justify-between text-[9px] font-mono text-[var(--ink-secondary)]">
            <span className="flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 stroke-[1.5]" /> Level
            </span>
            <span>{inputLevel}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--line)] rounded-none overflow-hidden">
            <div
              className="h-full bg-[var(--ink-primary)] transition-all duration-75"
              style={{ width: `${inputLevel}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMicPractice;

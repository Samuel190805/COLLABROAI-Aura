"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { formatDuration, formatBytes } from "@/lib/utils";

export interface StemTrack {
  id: string;
  name: string;
  kind: "STEM_VOCALS" | "STEM_INSTRUMENT";
  url: string;
  waveformData?: number[];
  sizeBytes?: number;
  format?: string;
  clarityPercent?: number;
  qualityLabel?: string;
}

export interface StemMixerProps {
  tracks: StemTrack[];
  title?: string;
  qualityLabel?: string;
  engine?: "demucs" | "dsp-fallback";
  className?: string;
}

interface ChannelState {
  volume: number; // 0 to 1
  isMuted: boolean;
  isSolo: boolean;
}

export const StemMixer: React.FC<StemMixerProps> = ({
  tracks,
  title = "Vocal / Instrument Separation",
  qualityLabel,
  engine,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [isMasterMuted, setIsMasterMuted] = useState(false);

  // Dedicated preview track
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Identify the two stems
  const vocalsTrack = tracks.find((t) => t.kind === "STEM_VOCALS") || tracks[0];
  const instrumentTrack = tracks.find((t) => t.kind === "STEM_INSTRUMENT") || tracks[1];

  const [channelStates, setChannelStates] = useState<Record<string, ChannelState>>({
    vocals: { volume: 0.85, isMuted: false, isSolo: false },
    instrument: { volume: 0.85, isMuted: false, isSolo: false },
  });

  const vocalsAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentAudioRef = useRef<HTMLAudioElement | null>(null);

  const hasAnySolo = channelStates.vocals?.isSolo || channelStates.instrument?.isSolo;

  // Master Play/Pause
  const togglePlay = () => {
    if (previewAudioRef.current && (previewTrackId || isPreviewPlaying)) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
      setPreviewTrackId(null);
    }

    if (isPlaying) {
      vocalsAudioRef.current?.pause();
      instrumentAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (vocalsAudioRef.current) {
        vocalsAudioRef.current.currentTime = currentTime;
        vocalsAudioRef.current.play().catch(() => {});
      }
      if (instrumentAudioRef.current) {
        instrumentAudioRef.current.currentTime = currentTime;
        instrumentAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Preview individual stem
  const togglePreview = (track: StemTrack) => {
    const previewEl = previewAudioRef.current;
    if (!previewEl) return;

    if (previewTrackId === track.id && isPreviewPlaying) {
      previewEl.pause();
      setIsPreviewPlaying(false);
      return;
    }

    if (previewTrackId === track.id && !isPreviewPlaying) {
      if (isPlaying) {
        vocalsAudioRef.current?.pause();
        instrumentAudioRef.current?.pause();
        setIsPlaying(false);
      }
      previewEl.volume = isMasterMuted ? 0 : masterVolume;
      previewEl.play().catch(() => {});
      setIsPreviewPlaying(true);
      return;
    }

    if (isPlaying) {
      vocalsAudioRef.current?.pause();
      instrumentAudioRef.current?.pause();
      setIsPlaying(false);
    }

    previewEl.pause();
    previewEl.src = track.url;
    previewEl.currentTime = currentTime;
    previewEl.volume = isMasterMuted ? 0 : masterVolume;
    previewEl.play().catch(() => {});

    setPreviewTrackId(track.id);
    setIsPreviewPlaying(true);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (vocalsAudioRef.current) vocalsAudioRef.current.currentTime = time;
    if (instrumentAudioRef.current) instrumentAudioRef.current.currentTime = time;
    if (previewAudioRef.current) previewAudioRef.current.currentTime = time;
  };

  const updateChannel = (key: "vocals" | "instrument", updates: Partial<ChannelState>) => {
    setChannelStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  // Volume computation & application
  useEffect(() => {
    const applyVolume = (
      audio: HTMLAudioElement | null,
      state: ChannelState | undefined
    ) => {
      if (!audio || !state) return;
      let vol = state.volume * (isMasterMuted ? 0 : masterVolume);
      if (state.isMuted) {
        vol = 0;
      } else if (hasAnySolo) {
        vol = state.isSolo ? vol : 0;
      }
      audio.volume = Math.min(1, Math.max(0, vol));
    };

    applyVolume(vocalsAudioRef.current, channelStates.vocals);
    applyVolume(instrumentAudioRef.current, channelStates.instrument);
  }, [channelStates, masterVolume, isMasterMuted, hasAnySolo]);

  const renderChannelStrip = (
    key: "vocals" | "instrument",
    track?: StemTrack,
    label: string = "Channel"
  ) => {
    if (!track) return null;
    const state = channelStates[key];
    const isThisPreviewing = previewTrackId === track.id && isPreviewPlaying;

    return (
      <div className="flex-1 flex flex-col items-center p-6 border-hairline bg-mono-bg rounded-sm">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 mb-4 border-b-hairline">
          <div>
            <h4 className="font-mono text-xs font-bold tracking-widest uppercase text-mono-ink">
              {label}
            </h4>
            <p className="text-[11px] font-mono text-mono-inkMuted mt-0.5">
              {track.format?.toUpperCase() || "MP3"}
              {track.sizeBytes ? ` • ${formatBytes(track.sizeBytes)}` : ""}
            </p>
          </div>
          {track.clarityPercent !== undefined && (
            <span className="font-mono text-[10px] px-2 py-0.5 border-hairline text-mono-ink">
              {track.clarityPercent}%
            </span>
          )}
        </div>

        {/* Minimal Waveform */}
        <div className="w-full mb-6 px-1">
          <WaveformVisualizer
            waveformData={track.waveformData}
            currentTime={currentTime}
            duration={duration || 180}
            onSeek={handleSeek}
            height={32}
          />
        </div>

        {/* Linear Vertical Fader */}
        <div className="my-2 flex flex-col items-center">
          <Slider
            orientation="vertical"
            value={state.volume * 100}
            min={0}
            max={100}
            showValue
            valueFormatter={(v) => `${Math.round(v)}%`}
            onChange={(val) => updateChannel(key, { volume: val / 100 })}
            className="h-44"
          />
        </div>

        {/* Action Controls: Play in Isolation, Solo, Mute, Download */}
        <div className="w-full flex items-center justify-between pt-6 mt-4 border-t-hairline">
          <div className="flex items-center gap-1.5">
            {/* Play in Isolation */}
            <button
              type="button"
              onClick={() => togglePreview(track)}
              title={isThisPreviewing ? `Pause ${label}` : `Play ${label} solo`}
              className={`w-8 h-8 rounded-sm border-hairline flex items-center justify-center transition-colors cursor-pointer ${
                isThisPreviewing
                  ? "bg-mono-ink text-mono-bg"
                  : "bg-mono-bg text-mono-ink hover:bg-mono-bgAlt"
              }`}
            >
              {isThisPreviewing ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Solo */}
            <button
              type="button"
              onClick={() => updateChannel(key, { isSolo: !state.isSolo })}
              title="Solo this channel"
              className={`w-8 h-8 rounded-sm text-xs font-mono font-bold transition-colors cursor-pointer border-hairline ${
                state.isSolo
                  ? "bg-mono-ink text-mono-bg"
                  : "bg-mono-bg text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
              }`}
            >
              S
            </button>

            {/* Mute */}
            <button
              type="button"
              onClick={() => updateChannel(key, { isMuted: !state.isMuted })}
              title="Mute this channel"
              className={`w-8 h-8 rounded-sm text-xs font-mono font-bold transition-colors cursor-pointer border-hairline ${
                state.isMuted
                  ? "bg-mono-ink text-mono-bg"
                  : "bg-mono-bg text-mono-inkMuted hover:text-mono-ink hover:bg-mono-bgAlt"
              }`}
            >
              M
            </button>
          </div>

          {/* Download button */}
          <a
            href={track.url}
            download={`${track.name.toLowerCase().replace(/\s+/g, "_")}.${track.format || "mp3"}`}
            className="h-8 px-3 rounded-sm border-hairline flex items-center gap-1.5 text-[11px] font-mono hover:bg-mono-ink hover:text-mono-bg transition-colors"
            title={`Download ${track.name}`}
          >
            <Download className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>EXPORT</span>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full border-hairline bg-mono-bg p-6 sm:p-8 rounded-sm text-mono-ink ${className || ""}`}>
      {/* Hidden audio tags */}
      <audio
        ref={previewAudioRef}
        preload="none"
        onTimeUpdate={(e) => {
          if (isPreviewPlaying) setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          setIsPreviewPlaying(false);
          setPreviewTrackId(null);
        }}
      />

      {vocalsTrack && (
        <audio
          ref={vocalsAudioRef}
          src={vocalsTrack.url}
          preload="auto"
          onTimeUpdate={(e) => {
            if (isPlaying) {
              setCurrentTime(e.currentTarget.currentTime);
              if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && duration === 0) {
                setDuration(e.currentTarget.duration);
              }
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {instrumentTrack && (
        <audio
          ref={instrumentAudioRef}
          src={instrumentTrack.url}
          preload="auto"
        />
      )}

      {/* Header & Master Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-hairline">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold tracking-tight uppercase font-mono">
              {title}
            </h3>
            {qualityLabel && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 border-hairline uppercase tracking-wider ${
                  engine === "demucs" || qualityLabel.includes("Studio")
                    ? "bg-mono-ink text-mono-bg"
                    : "bg-mono-bgAlt text-mono-ink"
                }`}
              >
                {qualityLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-mono-inkMuted font-mono mt-0.5">
            2-Track Separation • Vocals & Instrument Only
          </p>
        </div>

        {/* Master Transport */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              pill={false}
              onClick={() => handleSeek(0)}
              title="Restart"
              className="h-9 w-9"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[1.5]" />
            </Button>
            <Button
              variant="primary"
              pill={false}
              onClick={togglePlay}
              className="px-5 h-9 text-xs font-mono font-bold flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> PAUSE MIX
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" /> PLAY MIX
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l-hairline pl-3">
            <button
              type="button"
              onClick={() => setIsMasterMuted(!isMasterMuted)}
              className="p-1.5 text-mono-inkMuted hover:text-mono-ink transition-colors"
              title={isMasterMuted ? "Unmute Master" : "Mute Master"}
            >
              {isMasterMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 stroke-[1.5]" />
              ) : (
                <Volume2 className="w-4 h-4 stroke-[1.5]" />
              )}
            </button>
            <div className="w-20">
              <Slider
                value={isMasterMuted ? 0 : masterVolume * 100}
                min={0}
                max={100}
                onChange={(v) => {
                  setMasterVolume(v / 100);
                  if (isMasterMuted) setIsMasterMuted(false);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Master Timeline Scrub Bar */}
      <div className="py-4 border-b-hairline">
        <div className="flex items-center justify-between text-xs font-mono text-mono-inkMuted mb-2">
          <span>{formatDuration(currentTime)}</span>
          <span className="uppercase tracking-widest text-[10px]">MASTER TIMELINE</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <WaveformVisualizer
          currentTime={currentTime}
          duration={duration || 180}
          onSeek={handleSeek}
          height={32}
        />
      </div>

      {/* TWO VERTICAL CHANNEL STRIPS ONLY: VOCALS AND INSTRUMENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {renderChannelStrip("vocals", vocalsTrack, "Vocals")}
        {renderChannelStrip("instrument", instrumentTrack, "Instrument")}
      </div>
    </div>
  );
};

export default StemMixer;

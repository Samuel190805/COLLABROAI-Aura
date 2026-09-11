"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Music,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Knob } from "@/components/ui/Knob";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { VUMeter } from "./VUMeter";
import { formatDuration, formatBytes } from "@/lib/utils";

export interface StemTrack {
  id: string;
  name: string;
  kind:
    | "STEM_VOCALS"
    | "STEM_INSTRUMENTS"
    | "STEM_BASS"
    | "STEM_DRUMS"
    | "STEM_OTHER"
    | "STEM_PIANO"
    | "STEM_GUITAR"
    | "STEM_INSTRUMENTAL";
  url: string;
  color?: string;
  waveformData?: number[];
  sizeBytes?: number;
  format?: string;
  confidenceScore?: number;
  clarityPercent?: number;
}

export interface StemMixerProps {
  tracks: StemTrack[];
  title?: string;
  className?: string;
}

interface TrackControlState {
  volume: number; // 0 to 1
  pan: number; // -100 to +100
  isMuted: boolean;
  isSolo: boolean;
}

export const StemMixer: React.FC<StemMixerProps> = ({
  tracks,
  title = "Stem Separation Mix",
  className,
}) => {
  // Master Synced Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [isMasterMuted, setIsMasterMuted] = useState(false);

  // Advanced stems toggle state (default: false -> 3-stem view)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Dedicated Single-Purpose Preview Engine State (Decoupled from Master Engine)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Track control states keyed by track id
  const [trackStates, setTrackStates] = useState<Record<string, TrackControlState>>(() => {
    const init: Record<string, TrackControlState> = {};
    tracks.forEach((t) => {
      init[t.id] = {
        volume: 0.85,
        pan: 0,
        isMuted: false,
        isSolo: false,
      };
    });
    return init;
  });

  // Master synchronized multi-track audio elements
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Split tracks into Primary (3-Stem Default: Vocals, Instruments, Bass) and Advanced (Drums, Other, Piano, Guitar, Karaoke)
  const { primaryTracks, advancedTracks } = useMemo(() => {
    const hasInstrumentsStem = tracks.some((t) => t.kind === "STEM_INSTRUMENTS");

    if (hasInstrumentsStem) {
      const primary = tracks.filter((t) =>
        ["STEM_VOCALS", "STEM_INSTRUMENTS", "STEM_BASS"].includes(t.kind)
      );
      const advanced = tracks.filter(
        (t) => !["STEM_VOCALS", "STEM_INSTRUMENTS", "STEM_BASS"].includes(t.kind)
      );
      return { primaryTracks: primary, advancedTracks: advanced };
    }

    // Fallback if derived instruments stem was not generated (show first 3 or all)
    const primary = tracks.filter((t) =>
      ["STEM_VOCALS", "STEM_DRUMS", "STEM_BASS"].includes(t.kind)
    );
    const advanced = tracks.filter(
      (t) => !["STEM_VOCALS", "STEM_DRUMS", "STEM_BASS"].includes(t.kind)
    );
    return {
      primaryTracks: primary.length > 0 ? primary : tracks.slice(0, 3),
      advancedTracks: primary.length > 0 ? advanced : tracks.slice(3),
    };
  }, [tracks]);

  // Check if any track has Solo active
  const hasAnySolo = Object.values(trackStates).some((s) => s.isSolo);

  // Master "Play Mix" Handler
  const togglePlay = () => {
    // Pressing master "Play Mix" stops any active individual stem preview
    if (previewAudioRef.current && (previewTrackId || isPreviewPlaying)) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
      setPreviewTrackId(null);
    }

    if (isPlaying) {
      Object.values(audioRefs.current).forEach((audio) => audio.pause());
      setIsPlaying(false);
    } else {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.currentTime = currentTime;
        audio.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  };

  // Dedicated Individual Stem Isolated Preview Handler
  const togglePreview = (track: StemTrack) => {
    const previewEl = previewAudioRef.current;
    if (!previewEl) return;

    // If this exact track is currently playing in preview -> Pause it
    if (previewTrackId === track.id && isPreviewPlaying) {
      previewEl.pause();
      setIsPreviewPlaying(false);
      return;
    }

    // If this exact track was loaded and paused -> Resume it
    if (previewTrackId === track.id && !isPreviewPlaying) {
      if (isPlaying) {
        Object.values(audioRefs.current).forEach((a) => a.pause());
        setIsPlaying(false);
      }
      previewEl.volume = isMasterMuted ? 0 : masterVolume;
      previewEl.play().catch(() => {});
      setIsPreviewPlaying(true);
      return;
    }

    // Start preview for this row:
    // 1. Stop master engine (if playing)
    if (isPlaying) {
      Object.values(audioRefs.current).forEach((a) => a.pause());
      setIsPlaying(false);
    }

    // 2. Stop any previous stem preview
    previewEl.pause();

    // 3. Load ONLY this stem into the dedicated preview element (ignoring Solo/Mute)
    previewEl.src = track.url;
    previewEl.currentTime = currentTime;
    previewEl.volume = isMasterMuted ? 0 : masterVolume;
    previewEl.play().catch(() => {});

    setPreviewTrackId(track.id);
    setIsPreviewPlaying(true);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    // Update all master synced audio elements
    Object.values(audioRefs.current).forEach((audio) => {
      audio.currentTime = time;
    });
    // Update dedicated preview element
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    handleSeek(0);
  };

  // Master engine time tracking
  const handleMasterTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (isPlaying) {
      const target = e.currentTarget;
      setCurrentTime(target.currentTime);
      if (target.duration && !isNaN(target.duration) && duration === 0) {
        setDuration(target.duration);
      }
    }
  };

  const updateTrackState = (id: string, updates: Partial<TrackControlState>) => {
    setTrackStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  };

  // Apply master track gains, mutes, and solo to master audio elements
  useEffect(() => {
    tracks.forEach((track) => {
      const audio = audioRefs.current[track.id];
      const state = trackStates[track.id];
      if (!audio || !state) return;

      let effectiveVolume = state.volume * (isMasterMuted ? 0 : masterVolume);

      if (state.isMuted) {
        effectiveVolume = 0;
      } else if (hasAnySolo) {
        effectiveVolume = state.isSolo ? effectiveVolume : 0;
      }

      audio.volume = Math.min(1, Math.max(0, effectiveVolume));
    });
  }, [trackStates, masterVolume, isMasterMuted, hasAnySolo, tracks]);

  // Sync master volume to preview audio element
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = isMasterMuted ? 0 : masterVolume;
    }
  }, [masterVolume, isMasterMuted]);

  // Color mapping for stem kinds
  const getStemColor = (kind: string) => {
    switch (kind) {
      case "STEM_VOCALS":
        return "#6366F1"; // Indigo
      case "STEM_INSTRUMENTS":
        return "#06B6D4"; // Electric Cyan (Combined Stems)
      case "STEM_BASS":
        return "#10B981"; // Emerald
      case "STEM_DRUMS":
        return "#F43F5E"; // Coral Rose
      case "STEM_OTHER":
        return "#F59E0B"; // Amber
      case "STEM_PIANO":
        return "#8B5CF6"; // Purple
      case "STEM_GUITAR":
        return "#F97316"; // Vibrant Orange
      case "STEM_INSTRUMENTAL":
        return "#A855F7"; // Karaoke Purple
      default:
        return "#0071E3";
    }
  };

  // Channel row renderer with Calm Precision breathing room
  const renderTrackRow = (track: StemTrack, isAdvanced = false) => {
    const state = trackStates[track.id] || {
      volume: 0.85,
      pan: 0,
      isMuted: false,
      isSolo: false,
    };
    const trackColor = getStemColor(track.kind);
    const isThisPreviewing = previewTrackId === track.id && isPreviewPlaying;

    return (
      <div
        key={track.id}
        className={`py-5 px-4 sm:px-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 transition-all duration-200 ${
          isAdvanced
            ? "bg-white/[0.02] dark:bg-white/[0.02] border border-white/5 my-1.5"
            : "bg-white/[0.04] dark:bg-white/[0.04] border border-white/10 my-2"
        }`}
      >
        {/* Stem Label & Channel VU Meters */}
        <div className="w-full md:w-52 flex items-center justify-between md:justify-start gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-md shrink-0"
              style={{ backgroundColor: trackColor }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-extrabold text-white tracking-tight truncate">
                  {track.name}
                </h4>
                {track.clarityPercent !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {track.clarityPercent}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-mono mt-0.5">
                {track.format?.toUpperCase() || "MP3"}
                {track.sizeBytes ? ` • ${formatBytes(track.sizeBytes)}` : ""}
              </p>
            </div>
          </div>

          <VUMeter
            isPlaying={
              (isPlaying && !state.isMuted && (!hasAnySolo || state.isSolo)) ||
              isThisPreviewing
            }
            volume={state.volume}
            isMuted={
              isThisPreviewing
                ? false
                : state.isMuted || (hasAnySolo && !state.isSolo)
            }
            bars={6}
          />
        </div>

        {/* Waveform Track with Height and Breathing Room */}
        <div className="flex-1 w-full min-w-0">
          <WaveformVisualizer
            waveformData={track.waveformData}
            currentTime={currentTime}
            duration={duration || 180}
            onSeek={handleSeek}
            accentColor={trackColor}
            height={36}
          />
        </div>

        {/* Track Controls: Individual Play, Solo, Mute, Pan Knob, Fader, Direct Download */}
        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Individual Stem Isolated Play / Pause Button */}
            <button
              type="button"
              onClick={() => togglePreview(track)}
              title={
                isThisPreviewing
                  ? `Pause ${track.name} preview`
                  : `Play ${track.name} in isolation`
              }
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isThisPreviewing
                  ? "bg-apple-blue text-white shadow-lg ring-2 ring-apple-blue/40 scale-105"
                  : "bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 active:scale-95"
              }`}
            >
              {isThisPreviewing ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Solo Button */}
            <button
              type="button"
              onClick={() => updateTrackState(track.id, { isSolo: !state.isSolo })}
              title="Solo this track"
              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                state.isSolo
                  ? "bg-amber-400 text-black shadow-md scale-105 hover:bg-amber-300"
                  : "bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 active:scale-95"
              }`}
            >
              S
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={() => updateTrackState(track.id, { isMuted: !state.isMuted })}
              title="Mute this track"
              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                state.isMuted
                  ? "bg-rose-500 text-white shadow-md scale-105 hover:bg-rose-600"
                  : "bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 active:scale-95"
              }`}
            >
              M
            </button>
          </div>

          {/* Pan Knob */}
          <Knob
            value={state.pan}
            min={-100}
            max={100}
            size={38}
            label="PAN"
            accentColor={trackColor}
            onChange={(val) => updateTrackState(track.id, { pan: val })}
          />

          {/* Volume Fader */}
          <div className="w-24 sm:w-28 flex flex-col gap-1">
            <Slider
              value={state.volume * 100}
              min={0}
              max={100}
              accentColor={trackColor}
              onChange={(val) => updateTrackState(track.id, { volume: val / 100 })}
            />
            <span className="text-[10px] text-neutral-400 font-mono text-right">
              {Math.round(state.volume * 100)}%
            </span>
          </div>

          {/* Direct Stem Download Button */}
          <a
            href={track.url}
            download={`${track.name.toLowerCase().replace(/\s+/g, "_")}.${track.format || "mp3"}`}
            className="p-2.5 rounded-xl bg-white/10 text-neutral-300 hover:bg-apple-blue hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            title={`Download ${track.name}`}
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full rounded-3xl backdrop-blur-2xl bg-[#121214]/90 border border-white/10 shadow-apple dark:shadow-apple-dark p-6 sm:p-8 mode-b-precision ${className || ""}`}>
      {/* Dedicated Single-Purpose Preview Audio Node (used ONLY by individual stem Play buttons) */}
      <audio
        ref={previewAudioRef}
        preload="none"
        onTimeUpdate={(e) => {
          if (isPreviewPlaying) {
            setCurrentTime(e.currentTarget.currentTime);
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration) && duration === 0) {
              setDuration(e.currentTarget.duration);
            }
          }
        }}
        onEnded={() => {
          setIsPreviewPlaying(false);
          setPreviewTrackId(null);
        }}
        onError={() => {
          setIsPreviewPlaying(false);
          setPreviewTrackId(null);
        }}
      />

      {/* Master multi-track synchronized audio elements (used ONLY by "Play Mix") */}
      {tracks.map((t, idx) => (
        <audio
          key={t.id}
          ref={(el) => {
            if (el) audioRefs.current[t.id] = el;
          }}
          src={t.url}
          preload="auto"
          onTimeUpdate={idx === 0 ? handleMasterTimeUpdate : undefined}
          onEnded={() => {
            if (idx === 0) setIsPlaying(false);
          }}
        />
      ))}

      {/* Header & Master Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            3-Stem Simple View • Vocals, Instruments & Bass Separation
          </p>
        </div>

        {/* Master Transport & Volume Bar */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="icon"
              onClick={handleRestart}
              title="Restart Mix"
              className="h-10 w-10 text-neutral-300 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="primary"
              onClick={togglePlay}
              className="px-6 py-2.5 h-10 text-xs font-bold flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-apple"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pause Mix
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" /> Play Mix
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
            <button
              type="button"
              onClick={() => setIsMasterMuted(!isMasterMuted)}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMasterMuted ? "Unmute Master" : "Mute Master"}
            >
              {isMasterMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-20 sm:w-24">
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

      {/* Master Timeline & Scrub Bar */}
      <div className="py-5 border-b border-white/10">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
          <span>{formatDuration(currentTime)}</span>
          <span className="font-mono text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Master Scrub Timeline
          </span>
          <span>{formatDuration(duration)}</span>
        </div>
        <WaveformVisualizer
          currentTime={currentTime}
          duration={duration || 180}
          onSeek={handleSeek}
          accentColor="#6366F1"
          height={34}
        />
      </div>

      {/* 3-Stem Default Channel Rows */}
      <div className="flex flex-col gap-1.5 mt-4">
        {primaryTracks.map((track) => renderTrackRow(track, false))}
      </div>

      {/* Show Advanced Stems Toggle Button */}
      {advancedTracks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {showAdvanced ? "Hide Advanced Stems" : `Show Advanced Stems (${advancedTracks.length} More)`}
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {/* Smooth Expansion of Advanced Rows (Drums, Other, Piano, Guitar, Instrumental) */}
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full overflow-hidden flex flex-col gap-1.5 mt-3"
              >
                <div className="text-[11px] font-mono font-semibold text-neutral-400 px-2 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>Extended Stem Breakdown</span>
                  <span className="text-neutral-400">• Individual Layers</span>
                </div>
                {advancedTracks.map((track) => renderTrackRow(track, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default StemMixer;

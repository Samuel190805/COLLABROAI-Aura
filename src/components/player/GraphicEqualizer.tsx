"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sliders, Zap } from "lucide-react";
import { Slider } from "@/components/ui/Slider";

export interface EqualizerBand {
  frequency: number;
  label: string;
  gain: number; // -12dB to +12dB
}

export interface GraphicEqualizerProps {
  audioElement: HTMLAudioElement | HTMLVideoElement | null;
  className?: string;
}

// 10-band presets according to Section 4.6 specification:
// Bands: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz
const EQ_PRESETS: Record<string, number[]> = {
  flat:        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bassBoost:   [8, 7, 5, 3, 1, 0, 0, -1, -2, -2],
  vocalBoost:  [-3, -2, 0, 2, 5, 6, 4, 1, 0, -1],
  acoustic:    [3, 3, 2, 1, 2, 3, 4, 4, 3, 2],
  electronic:  [7, 6, 3, 0, -2, 2, 3, 5, 6, 7],
  rock:        [5, 4, 2, -1, -2, 0, 2, 4, 5, 5],
  jazz:        [3, 2, 0, 2, -2, -2, 0, 2, 3, 4],
};

export const GraphicEqualizer: React.FC<GraphicEqualizerProps> = ({
  audioElement,
  className = "",
}) => {
  const [activePreset, setActivePreset] = useState<string>("flat");
  const [bands, setBands] = useState<EqualizerBand[]>([
    { frequency: 32, label: "32Hz", gain: 0 },
    { frequency: 64, label: "64Hz", gain: 0 },
    { frequency: 125, label: "125Hz", gain: 0 },
    { frequency: 250, label: "250Hz", gain: 0 },
    { frequency: 500, label: "500Hz", gain: 0 },
    { frequency: 1000, label: "1kHz", gain: 0 },
    { frequency: 2000, label: "2kHz", gain: 0 },
    { frequency: 4000, label: "4kHz", gain: 0 },
    { frequency: 8000, label: "8kHz", gain: 0 },
    { frequency: 16000, label: "16kHz", gain: 0 },
  ]);
  const [bassBoost, setBassBoost] = useState<number>(0); // 0 to 10
  const [loudnessEnhance, setLoudnessEnhance] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Web Audio Graph when audio element is ready
  useEffect(() => {
    if (!audioElement) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        const resumeCtx = () => {
          ctx.resume();
          window.removeEventListener("click", resumeCtx);
        };
        window.addEventListener("click", resumeCtx);
      }

      // Connect source node once per element
      if (!sourceNodeRef.current) {
        try {
          sourceNodeRef.current = ctx.createMediaElementSource(audioElement);
        } catch {
          // in case source already connected
        }
      }

      if (!sourceNodeRef.current) return;

      // 10 BiquadFilterNodes (lowshelf, 8 peaking, highshelf)
      const filters = bands.map((band, idx) => {
        const filter = ctx.createBiquadFilter();
        if (idx === 0) {
          filter.type = "lowshelf";
          filter.frequency.value = band.frequency;
        } else if (idx === bands.length - 1) {
          filter.type = "highshelf";
          filter.frequency.value = band.frequency;
        } else {
          filter.type = "peaking";
          filter.frequency.value = band.frequency;
          filter.Q.value = 1.414;
        }
        filter.gain.value = band.gain;
        return filter;
      });
      filterNodesRef.current = filters;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;

      // Chain: Source -> Filter 0 .. 9 -> Gain -> Destination
      let lastNode: AudioNode = sourceNodeRef.current;
      for (const filter of filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err) {
      console.warn("[GraphicEqualizer] Web Audio init notice:", err);
    }
  }, [audioElement, bands]);

  // Sync band gains and loudness enhance
  useEffect(() => {
    bands.forEach((band, idx) => {
      if (filterNodesRef.current[idx]) {
        filterNodesRef.current[idx].gain.value = band.gain;
      }
    });
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = loudnessEnhance ? 1.3 : 1.0;
    }
  }, [bands, loudnessEnhance]);

  const handleBandChange = (index: number, gain: number) => {
    setActivePreset("custom");
    setBands((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], gain };
      return updated;
    });

    if (filterNodesRef.current[index]) {
      filterNodesRef.current[index].gain.value = gain;
    }
  };

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const gains = EQ_PRESETS[presetKey];
    if (!gains) return;

    setBands((prev) =>
      prev.map((b, i) => {
        const gain = gains[i] ?? 0;
        if (filterNodesRef.current[i]) {
          filterNodesRef.current[i].gain.value = gain;
        }
        return { ...b, gain };
      })
    );
  };

  const handleBassBoostChange = (val: number) => {
    setBassBoost(val);
    if (filterNodesRef.current[0]) {
      filterNodesRef.current[0].gain.value = bands[0].gain + val * 1.2;
    }
  };

  const toggleLoudness = () => {
    const next = !loudnessEnhance;
    setLoudnessEnhance(next);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = next ? 1.3 : 1.0;
    }
  };

  return (
    <div
      className={`p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
            <Sliders className="w-3 h-3 stroke-[1.5]" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)]">
              10-Band Graphic Equalizer
            </h4>
            <p className="text-[10px] text-[var(--ink-secondary)] font-mono">
              Web Audio BiquadFilter Array • ±12 dB Range
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1 flex-wrap">
          {Object.keys(EQ_PRESETS).map((pKey) => (
            <button
              key={pKey}
              onClick={() => applyPreset(pKey)}
              className={`px-2 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer capitalize ${
                activePreset === pKey
                  ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] font-bold"
                  : "border-[var(--line)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              }`}
            >
              {pKey === "bassBoost"
                ? "Bass"
                : pKey === "vocalBoost"
                ? "Vocal"
                : pKey}
            </button>
          ))}
        </div>
      </div>

      {/* 10-Band Faders */}
      <div className="grid grid-cols-10 gap-1 py-4 text-center">
        {bands.map((band, idx) => (
          <div key={band.frequency} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-[var(--ink-secondary)]">
              {band.gain > 0 ? `+${band.gain}` : band.gain}
            </span>
            <div className="h-28 flex items-center justify-center">
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={band.gain}
                onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                className="w-24 -rotate-90 origin-center cursor-pointer accent-[var(--ink-primary)]"
              />
            </div>
            <span className="text-[9px] font-mono text-[var(--ink-primary)]">
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* Enhancements Row */}
      <div className="pt-3 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
        {/* Dynamic Sub-Bass */}
        <div className="flex items-center justify-between p-2.5 border border-[var(--line)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 stroke-[1.5] text-[var(--ink-primary)]" />
            <div>
              <p className="text-xs font-bold text-[var(--ink-primary)]">Sub-Bass</p>
              <p className="text-[9px] text-[var(--ink-secondary)]">+{bassBoost * 1.2} dB</p>
            </div>
          </div>
          <div className="w-20">
            <Slider
              value={bassBoost * 10}
              min={0}
              max={100}
              onChange={(v) => handleBassBoostChange(Math.round(v / 10))}
            />
          </div>
        </div>

        {/* Loudness Booster */}
        <button
          onClick={toggleLoudness}
          className={`flex items-center justify-between p-2.5 border transition-colors text-left cursor-pointer ${
            loudnessEnhance
              ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
              : "border-[var(--line)] bg-[var(--bg-primary)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
          }`}
        >
          <div>
            <p className="text-xs font-bold">Loudness Maximizer</p>
            <p className="text-[9px] opacity-70">+3.0 dB Makeup Headroom</p>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 border border-current">
            {loudnessEnhance ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default GraphicEqualizer;

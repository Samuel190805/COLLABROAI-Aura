"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, ArrowRight } from "lucide-react";

export const MashupHero: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full max-w-xl p-5 rounded-sm border-hairline bg-mono-bg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-hairline">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mono-ink flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 stroke-[1.5]" /> 2-Stem Mashup Engine
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border-hairline uppercase text-mono-ink">
            96% Camelot Match (8A ↔ 8B)
          </span>
        </div>

        {/* Pairing Visualizer */}
        <div className="flex flex-col gap-3">
          {/* Source 1: Track A Vocals */}
          <div className="p-3 border-hairline bg-mono-bgAlt rounded-sm flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] text-mono-inkMuted uppercase">CHOSEN VOCAL SOURCE</p>
              <p className="font-mono text-xs font-semibold text-mono-ink">Track A • Vocals Stem</p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-mono-inkMuted">
              <span>8A (Am)</span>
              <span>•</span>
              <span>124 BPM</span>
            </div>
          </div>

          <div className="flex items-center justify-center text-mono-inkMuted font-mono text-xs">
            <span>+ AUTO KEY & TEMPO MATCH +</span>
          </div>

          {/* Source 2: Track B Instrument */}
          <div className="p-3 border-hairline bg-mono-bgAlt rounded-sm flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] text-mono-inkMuted uppercase">CHOSEN INSTRUMENT SOURCE</p>
              <p className="font-mono text-xs font-semibold text-mono-ink">Track B • Instrument Stem</p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-mono-inkMuted">
              <span>8B (C)</span>
              <span>•</span>
              <span>124 BPM</span>
            </div>
          </div>

          {/* Master Output */}
          <div className="p-3 border-hairline bg-mono-bg rounded-sm flex items-center justify-between border-mono-ink mt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-mono-ink inline-block" />
              <span className="font-mono text-xs font-bold text-mono-ink uppercase">MASTER MIXDOWN</span>
            </div>
            <span className="font-mono text-[10px] text-mono-ink font-semibold uppercase">
              EBU R128 (-14 LUFS) MASTERED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MashupHero;

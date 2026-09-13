"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sliders, Layers } from "lucide-react";

export const StemWaveSplittingHero: React.FC = () => {
  const [isSplit, setIsSplit] = useState(true);

  const stems = [
    { name: "Vocals", height: [15, 45, 65, 30, 75, 50, 25, 60, 80, 35] },
    { name: "Instrument", height: [60, 50, 45, 65, 55, 70, 50, 60, 48, 55] },
  ];

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full max-w-xl p-5 rounded-sm border-hairline bg-mono-bg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-hairline">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-mono-ink inline-block" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-mono-ink">
              2-Stem Decomposition Preview
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSplit(!isSplit)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono border-hairline rounded-sm hover:bg-mono-bgAlt transition-colors text-mono-ink"
          >
            {isSplit ? (
              <>
                <Layers className="w-3 h-3 stroke-[1.5]" /> COLLAPSE TO MIX
              </>
            ) : (
              <>
                <Sliders className="w-3 h-3 stroke-[1.5]" /> SPLIT (VOCALS / INSTRUMENT)
              </>
            )}
          </button>
        </div>

        {/* 2 Waveform Rows */}
        <div className="flex flex-col gap-3 py-2">
          {stems.map((stem) => (
            <div key={stem.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-mono-inkMuted uppercase">
                <span>{stem.name}</span>
                <span>{isSplit ? "ISOLATED" : "MIXED"}</span>
              </div>
              <div className="h-9 flex items-center gap-1 p-1 bg-mono-bgAlt border-hairline rounded-sm">
                {stem.height.map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isSplit ? `${h}%` : `${(stem.height[i] + stems[1].height[i]) * 0.4}%`,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 bg-mono-ink"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StemWaveSplittingHero;

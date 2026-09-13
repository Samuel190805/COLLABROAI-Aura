"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowDown, Check, Music, Video } from "lucide-react";

export const LinkMorphHero: React.FC = () => {
  const [phase, setPhase] = useState<"input" | "resolving" | "ready">("input");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("resolving"), 2500);
    const timer2 = setTimeout(() => setPhase("ready"), 5000);
    const loop = setTimeout(() => setPhase("input"), 8500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(loop);
    };
  }, [phase]);

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full max-w-xl p-5 rounded-sm border-hairline bg-mono-bg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-hairline">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mono-ink flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 stroke-[1.5]" /> Direct Stream Pipeline
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border-hairline uppercase text-mono-ink">
            {phase === "input" && "URL Input"}
            {phase === "resolving" && "Direct Extraction"}
            {phase === "ready" && "Lossless Transcode"}
          </span>
        </div>

        <div className="relative min-h-[90px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {phase === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center gap-3 p-3 rounded-sm border-hairline bg-mono-bgAlt"
              >
                <div className="w-7 h-7 border-hairline flex items-center justify-center text-mono-ink bg-mono-bg">
                  <Link2 className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0 font-mono text-xs text-mono-ink truncate">
                  https://www.youtube.com/watch?v=sample_track
                </div>
              </motion.div>
            )}

            {phase === "resolving" && (
              <motion.div
                key="resolving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center justify-between p-3 rounded-sm border-hairline bg-mono-bgAlt"
              >
                <div className="flex items-center gap-3 font-mono text-xs text-mono-ink">
                  <ArrowDown className="w-4 h-4 stroke-[1.5] animate-bounce" />
                  <span>Extracting native audio & video stream...</span>
                </div>
                <span className="font-mono text-[10px] text-mono-inkMuted">yt-dlp</span>
              </motion.div>
            )}

            {phase === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center justify-between p-3 rounded-sm border-hairline bg-mono-bgAlt"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 bg-mono-ink text-mono-bg flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0 font-mono text-xs">
                    <p className="text-mono-ink font-semibold truncate">Lossless Output Ready</p>
                    <p className="text-[10px] text-mono-inkMuted">MP3 (320kbps) • MP4 (1080p)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <Music className="w-3.5 h-3.5 stroke-[1.5]" />
                  <Video className="w-3.5 h-3.5 stroke-[1.5]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LinkMorphHero;

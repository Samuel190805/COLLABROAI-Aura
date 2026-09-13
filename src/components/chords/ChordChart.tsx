"use client";

import React, { useRef, useEffect } from "react";
import { ChordEvent, transposeChord, simplifyChord } from "@/domain/value-objects/ChordData";
import { Clock } from "lucide-react";

export interface ChordChartProps {
  chords: ChordEvent[];
  currentTime: number;
  duration: number;
  transposeSemis: number;
  isSimplified: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  onSeek: (time: number) => void;
  className?: string;
}

export const ChordChart: React.FC<ChordChartProps> = ({
  chords,
  currentTime,
  duration,
  transposeSemis,
  isSimplified,
  loopStart,
  loopEnd,
  onSeek,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeChordRef = useRef<HTMLDivElement | null>(null);

  // Active chord calculation
  const activeIndex = chords.findIndex((c, i) => {
    const nextTime = chords[i + 1]?.timestamp ?? duration;
    return currentTime >= c.timestamp && currentTime < nextTime;
  });

  useEffect(() => {
    if (activeChordRef.current && containerRef.current) {
      activeChordRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  return (
    <div
      className={`p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--ink-primary)]" />
          <h4 className="text-xs font-mono font-medium tracking-wider uppercase text-[var(--ink-primary)]">
            Harmonic Progression ({chords.length} Bars)
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--ink-secondary)]">
          <Clock className="w-3 h-3 stroke-[1.5]" />
          <span>Click measure to seek</span>
        </div>
      </div>

      {/* Horizontal Scrolling Timeline */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none snap-x"
      >
        {chords.map((chordEvent, idx) => {
          let displayChord = transposeChord(chordEvent.chord, transposeSemis);
          if (isSimplified) {
            displayChord = simplifyChord(displayChord);
          }

          const isActive = idx === activeIndex;
          const isInLoop =
            loopStart !== null &&
            loopEnd !== null &&
            chordEvent.timestamp >= loopStart &&
            chordEvent.timestamp <= loopEnd;

          return (
            <div
              key={`chord_${chordEvent.timestamp}_${idx}`}
              ref={isActive ? activeChordRef : null}
              onClick={() => onSeek(chordEvent.timestamp)}
              className={`min-w-[84px] p-2.5 rounded-none border flex flex-col items-center justify-center cursor-pointer transition-colors snap-center shrink-0 select-none ${
                isActive
                  ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                  : isInLoop
                  ? "bg-[var(--bg-primary)] border-[var(--ink-primary)] text-[var(--ink-primary)]"
                  : "bg-[var(--bg-primary)] border-[var(--line)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              }`}
            >
              <span
                className={`text-[9px] font-mono mb-0.5 ${
                  isActive ? "opacity-70" : "text-[var(--ink-secondary)]"
                }`}
              >
                Bar {idx + 1}
              </span>
              <span className="text-base font-mono font-bold tracking-tight">
                {displayChord}
              </span>
              <span
                className={`text-[9px] font-mono mt-0.5 ${
                  isActive ? "opacity-70" : "text-[var(--ink-secondary)]"
                }`}
              >
                {Math.floor(chordEvent.timestamp / 60)}:
                {Math.floor(chordEvent.timestamp % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChordChart;

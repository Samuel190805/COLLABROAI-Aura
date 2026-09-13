"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Music } from "lucide-react";

export const ChordHero: React.FC = () => {
  const chords = [
    { name: "Cmaj7", key: "8B", notes: ["C", "E", "G", "B"], frets: [-1, 3, 2, 0, 0, 0] },
    { name: "Am7", key: "8A", notes: ["A", "C", "E", "G"], frets: [-1, 0, 2, 0, 1, 0] },
    { name: "Dm7", key: "7A", notes: ["D", "F", "A", "C"], frets: [-1, -1, 0, 2, 1, 1] },
    { name: "G7", key: "9B", notes: ["G", "B", "D", "F"], frets: [3, 2, 0, 0, 0, 1] },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % chords.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [chords.length]);

  const activeChord = chords[currentIndex];

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="w-full max-w-xl p-5 rounded-sm border-hairline bg-mono-bg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-hairline">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mono-ink flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" /> Instrument Stem Harmonic Chroma
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 border-hairline uppercase text-mono-ink">
            Stem-Isolated Analysis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Active Chord Display */}
          <div className="sm:col-span-1 p-4 rounded-sm border-hairline bg-mono-bgAlt text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-mono-inkMuted uppercase tracking-wider">
              CURRENT CHORD
            </span>
            <span className="text-3xl font-black text-mono-ink font-mono my-1 tracking-tight">
              {activeChord.name}
            </span>
            <span className="text-[11px] font-mono text-mono-inkMuted">
              Camelot: {activeChord.key}
            </span>
          </div>

          {/* Fretboard / Notes preview */}
          <div className="sm:col-span-2 p-4 rounded-sm border-hairline bg-mono-bg flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-mono-inkMuted uppercase">
              <span>NOTES IN CHORD</span>
              <span>CONFIDENCE: 94%</span>
            </div>
            <div className="flex items-center gap-1.5 py-1">
              {activeChord.notes.map((note) => (
                <span
                  key={note}
                  className="px-2.5 py-1 rounded-sm border-hairline bg-mono-bgAlt text-xs font-mono font-bold text-mono-ink"
                >
                  {note}
                </span>
              ))}
            </div>
            <p className="text-[10px] font-mono text-mono-inkMuted mt-1">
              Analysis executed exclusively against the isolated Instrument stem for pristine chroma alignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordHero;

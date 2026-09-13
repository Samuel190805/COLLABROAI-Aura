"use client";

import React from "react";
import {
  PIANO_CHORD_OFFSETS,
  CHROMATIC_NOTES,
  getGuitarChordShape,
  getUkuleleChordShape,
} from "@/domain/value-objects/ChordData";
import { Volume2 } from "lucide-react";

export interface ChordDiagramProps {
  chord: string; // e.g. "C", "Am", "G7", "C/G"
  instrument: "guitar" | "piano" | "ukulele";
  capo?: number;
  className?: string;
  onPreview?: (chord: string) => void;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  instrument,
  capo = 0,
  className = "",
  onPreview,
}) => {
  const handlePreview = () => {
    if (onPreview) {
      onPreview(chord);
    } else {
      try {
        const audio = new Audio(`/api/chords/preview-audio?chord=${encodeURIComponent(chord)}`);
        audio.play().catch(() => {});
      } catch {}
    }
  };

  if (instrument === "guitar") {
    return <GuitarDiagram chord={chord} capo={capo} className={className} onPreview={handlePreview} />;
  }
  if (instrument === "ukulele") {
    return <UkuleleDiagram chord={chord} className={className} onPreview={handlePreview} />;
  }
  return <PianoDiagram chord={chord} className={className} onPreview={handlePreview} />;
};

// Monolith B&W Guitar Fretboard Diagram
function GuitarDiagram({
  chord,
  capo = 0,
  className = "",
  onPreview,
}: {
  chord: string;
  capo?: number;
  className?: string;
  onPreview?: () => void;
}) {
  const frets = getGuitarChordShape(chord, capo);

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] cursor-pointer group select-none transition-colors hover:border-white/40 ${className}`}
      onClick={onPreview}
      title="Click to preview chord audio"
    >
      <div className="flex items-baseline justify-between w-full mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-mono font-bold text-[var(--ink-primary)]">{chord}</span>
          {capo > 0 && (
            <span className="text-[10px] text-neutral-400 font-mono">
              (Capo {capo})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">
            Guitar
          </span>
          <Volume2 className="w-3 h-3 text-neutral-400 opacity-60 group-hover:opacity-100" />
        </div>
      </div>

      {/* SVG Fretboard (6 strings, 5 frets) */}
      <svg width="130" height="140" viewBox="0 0 130 140" className="stroke-current">
        {/* Nut (fret 0) */}
        <rect
          x="25"
          y="24"
          width="80"
          height="3"
          fill="var(--ink-primary)"
        />

        {/* 5 Fret Lines */}
        {[42, 60, 78, 96, 114].map((y) => (
          <line
            key={y}
            x1="25"
            y1={y}
            x2="105"
            y2={y}
            strokeWidth="1"
            stroke="var(--line)"
          />
        ))}

        {/* 6 String Lines */}
        {[25, 41, 57, 73, 89, 105].map((x) => (
          <line
            key={x}
            x1={x}
            y1="24"
            x2={x}
            y2="114"
            strokeWidth="1"
            stroke="var(--line)"
          />
        ))}

        {/* String Top Markings (X, O, or blank) */}
        {frets.map((fret, stringIdx) => {
          const x = 25 + stringIdx * 16;
          if (fret === -1) {
            return (
              <text
                key={`mark_${stringIdx}`}
                x={x}
                y="18"
                textAnchor="middle"
                fontSize="11"
                fontFamily="monospace"
                fill="var(--ink-secondary)"
              >
                ×
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={`mark_${stringIdx}`}
                cx={x}
                cy="14"
                r="3"
                fill="none"
                strokeWidth="1"
                stroke="var(--ink-primary)"
              />
            );
          }
          return null;
        })}

        {/* Finger Dots */}
        {frets.map((fret, stringIdx) => {
          if (fret > 0) {
            const x = 25 + stringIdx * 16;
            const y = 24 + fret * 18 - 9;
            return (
              <circle
                key={`dot_${stringIdx}`}
                cx={x}
                cy={y}
                r="5"
                fill="var(--ink-primary)"
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

// Monolith B&W Ukulele Fretboard Diagram (4 strings G-C-E-A)
function UkuleleDiagram({
  chord,
  className = "",
  onPreview,
}: {
  chord: string;
  className?: string;
  onPreview?: () => void;
}) {
  const frets = getUkuleleChordShape(chord);

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] cursor-pointer group select-none transition-colors hover:border-white/40 ${className}`}
      onClick={onPreview}
      title="Click to preview chord audio"
    >
      <div className="flex items-baseline justify-between w-full mb-2">
        <span className="text-xl font-mono font-bold text-[var(--ink-primary)]">{chord}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">
            Ukulele
          </span>
          <Volume2 className="w-3 h-3 text-neutral-400 opacity-60 group-hover:opacity-100" />
        </div>
      </div>

      <svg width="110" height="140" viewBox="0 0 110 140" className="stroke-current">
        {/* Nut */}
        <rect
          x="25"
          y="24"
          width="60"
          height="3"
          fill="var(--ink-primary)"
        />

        {/* Frets */}
        {[44, 64, 84, 104].map((y) => (
          <line
            key={y}
            x1="25"
            y1={y}
            x2="85"
            y2={y}
            strokeWidth="1"
            stroke="var(--line)"
          />
        ))}

        {/* 4 Strings */}
        {[25, 45, 65, 85].map((x) => (
          <line
            key={x}
            x1={x}
            y1="24"
            x2={x}
            y2="104"
            strokeWidth="1"
            stroke="var(--line)"
          />
        ))}

        {/* Dots & Top markings */}
        {frets.map((fret, stringIdx) => {
          const x = 25 + stringIdx * 20;
          if (fret === 0) {
            return (
              <circle
                key={`u_mark_${stringIdx}`}
                cx={x}
                cy="14"
                r="3"
                fill="none"
                strokeWidth="1"
                stroke="var(--ink-primary)"
              />
            );
          }
          if (fret > 0) {
            const y = 24 + fret * 20 - 10;
            return (
              <circle
                key={`u_dot_${stringIdx}`}
                cx={x}
                cy={y}
                r="5"
                fill="var(--ink-primary)"
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

// Monolith B&W Piano Keyboard Diagram
function PianoDiagram({
  chord,
  className = "",
  onPreview,
}: {
  chord: string;
  className?: string;
  onPreview?: () => void;
}) {
  const baseChord = chord.split("/")[0];
  const match = baseChord.match(/^([A-G][#b]?)(.*)$/) || ["", "C", ""];
  const root = match[1];
  const suffix = match[2].toLowerCase();

  let qualityKey: keyof typeof PIANO_CHORD_OFFSETS = "maj";
  if (suffix.includes("min7") || suffix.includes("m7")) {
    qualityKey = "min7";
  } else if (suffix.includes("maj7")) {
    qualityKey = "maj7";
  } else if (suffix.includes("m") && !suffix.includes("maj")) {
    qualityKey = "min";
  } else if (suffix.includes("7")) {
    qualityKey = "7";
  } else if (suffix.includes("dim7")) {
    qualityKey = "dim7";
  } else if (suffix.includes("dim")) {
    qualityKey = "dim";
  } else if (suffix.includes("aug")) {
    qualityKey = "aug";
  } else if (suffix.includes("sus4")) {
    qualityKey = "sus4";
  } else if (suffix.includes("sus2")) {
    qualityKey = "sus2";
  }

  const rootIndex = CHROMATIC_NOTES.indexOf(root);
  const activeOffsets = PIANO_CHORD_OFFSETS[qualityKey] || [0, 4, 7];
  const activeMidi = activeOffsets.map((off) => (rootIndex + off) % 12);

  // 14 White keys (2 octaves)
  const whiteKeyPitches = [0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7, 9, 11];

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-none bg-[var(--bg-secondary)] border border-[var(--line)] cursor-pointer group select-none transition-colors hover:border-white/40 ${className}`}
      onClick={onPreview}
      title="Click to preview chord audio"
    >
      <div className="flex items-baseline justify-between w-full mb-2">
        <span className="text-xl font-mono font-bold text-[var(--ink-primary)]">{chord}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">
            Piano
          </span>
          <Volume2 className="w-3 h-3 text-neutral-400 opacity-60 group-hover:opacity-100" />
        </div>
      </div>

      <div className="relative flex border border-[var(--line)] rounded-none overflow-hidden bg-[var(--bg-primary)] h-20 w-48">
        {/* White Keys */}
        {whiteKeyPitches.map((pitch, idx) => {
          const isPressed = activeMidi.includes(pitch);
          return (
            <div
              key={`wk_${idx}`}
              className={`flex-1 border-r border-[var(--line)] last:border-r-0 relative flex items-end justify-center pb-1.5 ${
                isPressed ? "bg-[var(--line)]" : "bg-[var(--bg-primary)]"
              }`}
            >
              {isPressed && <span className="w-1.5 h-1.5 bg-[var(--ink-primary)]" />}
            </div>
          );
        })}

        {/* Black Keys (Overlay) */}
        <div className="absolute inset-0 pointer-events-none flex">
          {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((blackIdx, i) => {
            const leftPct = ((blackIdx + 0.65) / 14) * 100;
            return (
              <div
                key={`bk_${i}`}
                style={{ left: `${leftPct}%` }}
                className="absolute top-0 w-2.5 h-11 bg-[var(--ink-primary)] border border-[var(--bg-primary)]"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ChordDiagram;

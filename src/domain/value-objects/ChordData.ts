export interface ChordEvent {
  timestamp: number; // in seconds
  startSec?: number; // Chordify timeline startSec
  endSec?: number; // Chordify timeline endSec
  chord: string; // e.g. "C", "Am", "G7", "Fmaj7", "Dsus4", "Csus2", "C/G", "N.C."
  root: string; // e.g. "C"
  quality: "maj" | "min" | "7" | "maj7" | "min7" | "dim" | "dim7" | "aug" | "sus4" | "sus2" | "nc" | "uncertain";
  confidence: number;
  bassNote?: string | null;
  sectionLabel?: string;
  durationSeconds?: number;
}

export interface SongSection {
  label: string; // e.g. "Intro", "Verse 1", "Chorus 1", "Bridge", "Outro"
  startSec: number;
  endSec: number;
}

export interface ChordAnalysisResult {
  detectedKey: string; // e.g. "G Major"
  originalKey?: string; // original detected key for non-destructive transpose
  camelotKey: string; // e.g. "9B"
  recommendedCapo: number; // e.g. 2 (fret 2)
  bpm: number;
  sections?: SongSection[];
  detectedVocabulary?: string[];
  chords: ChordEvent[];
  chordTimeline?: ChordEvent[];
}

export interface FingeringDiagram {
  instrument: "guitar" | "piano" | "ukulele";
  chord: string;
  frets?: number[]; // for guitar/ukulele (-1=mute, 0=open, >0=fret)
  keys?: number[]; // for piano: semitone offsets from root
  fingers?: string[];
  baseFret?: number;
}

// Chromatic notes
export const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ENHARMONIC_MAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

// Guitar standard fingering database (6-string E-A-D-G-B-E, -1=mute, 0=open)
export const GUITAR_CHORDS: Record<string, number[]> = {
  // Majors
  C: [-1, 3, 2, 0, 1, 0],
  "C#": [-1, 4, 6, 6, 6, 4],
  Db: [-1, 4, 6, 6, 6, 4],
  D: [-1, -1, 0, 2, 3, 2],
  "D#": [-1, 6, 8, 8, 8, 6],
  Eb: [-1, 6, 8, 8, 8, 6],
  E: [0, 2, 2, 1, 0, 0],
  F: [1, 3, 3, 2, 1, 1],
  "F#": [2, 4, 4, 3, 2, 2],
  Gb: [2, 4, 4, 3, 2, 2],
  G: [3, 2, 0, 0, 0, 3],
  "G#": [4, 6, 6, 5, 4, 4],
  Ab: [4, 6, 6, 5, 4, 4],
  A: [-1, 0, 2, 2, 2, 0],
  "A#": [-1, 1, 3, 3, 3, 1],
  Bb: [-1, 1, 3, 3, 3, 1],
  B: [-1, 2, 4, 4, 4, 2],

  // Minors
  Cm: [-1, 3, 5, 5, 4, 3],
  "C#m": [-1, 4, 6, 6, 5, 4],
  Dbm: [-1, 4, 6, 6, 5, 4],
  Dm: [-1, -1, 0, 2, 3, 1],
  "D#m": [-1, 6, 8, 8, 7, 6],
  Ebm: [-1, 6, 8, 8, 7, 6],
  Em: [0, 2, 2, 0, 0, 0],
  Fm: [1, 3, 3, 1, 1, 1],
  "F#m": [2, 4, 4, 2, 2, 2],
  Gbm: [2, 4, 4, 2, 2, 2],
  Gm: [3, 5, 5, 3, 3, 3],
  "G#m": [4, 6, 6, 4, 4, 4],
  Abm: [4, 6, 6, 4, 4, 4],
  Am: [-1, 0, 2, 2, 1, 0],
  "A#m": [-1, 1, 3, 3, 2, 1],
  Bbm: [-1, 1, 3, 3, 2, 1],
  Bm: [-1, 2, 4, 4, 3, 2],

  // Dominant 7th
  C7: [-1, 3, 2, 3, 1, 0],
  "C#7": [-1, 4, 6, 4, 6, 4],
  Db7: [-1, 4, 6, 4, 6, 4],
  D7: [-1, -1, 0, 2, 1, 2],
  "D#7": [-1, 6, 8, 6, 8, 6],
  Eb7: [-1, 6, 8, 6, 8, 6],
  E7: [0, 2, 0, 1, 0, 0],
  F7: [1, 3, 1, 2, 1, 1],
  "F#7": [2, 4, 2, 3, 2, 2],
  Gb7: [2, 4, 2, 3, 2, 2],
  G7: [3, 2, 0, 0, 0, 1],
  "G#7": [4, 6, 4, 5, 4, 4],
  Ab7: [4, 6, 4, 5, 4, 4],
  A7: [-1, 0, 2, 0, 2, 0],
  "A#7": [-1, 1, 3, 1, 3, 1],
  Bb7: [-1, 1, 3, 1, 3, 1],
  B7: [-1, 2, 1, 2, 0, 2],

  // Major 7th
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  "C#maj7": [-1, 4, 6, 5, 6, 4],
  Dbmaj7: [-1, 4, 6, 5, 6, 4],
  Dmaj7: [-1, -1, 0, 2, 2, 2],
  "D#maj7": [-1, 6, 8, 7, 8, 6],
  Ebmaj7: [-1, 6, 8, 7, 8, 6],
  Emaj7: [0, 2, 1, 1, 0, 0],
  Fmaj7: [-1, -1, 3, 2, 1, 0],
  "F#maj7": [2, 4, 3, 3, 2, 2],
  Gbmaj7: [2, 4, 3, 3, 2, 2],
  Gmaj7: [3, 2, 0, 0, 0, 2],
  "G#maj7": [4, 6, 5, 5, 4, 4],
  Abmaj7: [4, 6, 5, 5, 4, 4],
  Amaj7: [-1, 0, 2, 1, 2, 0],
  "A#maj7": [-1, 1, 3, 2, 3, 1],
  Bbmaj7: [-1, 1, 3, 2, 3, 1],
  Bmaj7: [-1, 2, 4, 3, 4, 2],

  // Minor 7th
  Cm7: [-1, 3, 5, 3, 4, 3],
  "C#m7": [-1, 4, 6, 4, 5, 4],
  Dbm7: [-1, 4, 6, 4, 5, 4],
  Dm7: [-1, -1, 0, 2, 1, 1],
  "D#m7": [-1, 6, 8, 6, 7, 6],
  Ebm7: [-1, 6, 8, 6, 7, 6],
  Em7: [0, 2, 0, 0, 0, 0],
  Fm7: [1, 3, 1, 1, 1, 1],
  "F#m7": [2, 4, 2, 2, 2, 2],
  Gbm7: [2, 4, 2, 2, 2, 2],
  Gm7: [3, 5, 3, 3, 3, 3],
  "G#m7": [4, 6, 4, 4, 4, 4],
  Abm7: [4, 6, 4, 4, 4, 4],
  Am7: [-1, 0, 2, 0, 1, 0],
  "A#m7": [-1, 1, 3, 1, 2, 1],
  Bbm7: [-1, 1, 3, 1, 2, 1],
  Bm7: [-1, 2, 0, 2, 0, 2],

  // Diminished
  Cdim: [-1, 3, 4, 5, 4, -1],
  "C#dim": [-1, -1, 2, 3, 2, 3],
  Ddim: [-1, -1, 0, 1, 3, 1],
  "D#dim": [-1, -1, 1, 2, 1, 2],
  Edim: [-1, -1, 2, 3, 2, 3],
  Fdim: [-1, -1, 0, 1, 0, 1],
  "F#dim": [-1, -1, 1, 2, 1, 2],
  Gdim: [-1, -1, 2, 3, 2, 3],
  "G#dim": [-1, -1, 0, 1, 0, 1],
  Adim: [-1, 0, 1, 2, 1, -1],
  "A#dim": [-1, 1, 2, 3, 2, -1],
  Bbdim: [-1, 1, 2, 3, 2, -1],
  Bdim: [-1, 2, 3, 4, 3, -1],

  // Diminished 7th
  Cdim7: [-1, 3, 4, 2, 4, 2],
  "C#dim7": [-1, -1, 2, 3, 2, 3],
  Ddim7: [-1, -1, 0, 1, 0, 1],
  "D#dim7": [-1, -1, 1, 2, 1, 2],
  Edim7: [0, 1, 2, 0, 2, 0],
  Fdim7: [1, 2, 0, 1, 0, 1],
  "F#dim7": [2, 3, 1, 2, 1, 2],
  Gdim7: [3, 4, 2, 3, 2, 3],
  "G#dim7": [-1, -1, 0, 1, 0, 1],
  Adim7: [-1, 0, 1, 2, 1, 2],
  "A#dim7": [-1, 1, 2, 0, 2, 0],
  Bbdim7: [-1, 1, 2, 0, 2, 0],
  Bdim7: [-1, 2, 0, 1, 0, 1],

  // Augmented
  Caug: [-1, 3, 2, 1, 1, 0],
  "C#aug": [-1, 0, 3, 2, 2, 1],
  Daug: [-1, -1, 0, 3, 3, 2],
  "D#aug": [-1, 2, 1, 0, 0, 3],
  Eaug: [0, 3, 2, 1, 1, 0],
  Faug: [1, 0, 3, 2, 2, 1],
  "F#aug": [2, 1, 0, 3, 3, 2],
  Gaug: [3, 2, 1, 0, 0, 3],
  "G#aug": [-1, 3, 2, 1, 1, 0],
  Aaug: [-1, 0, 3, 2, 2, 1],
  "A#aug": [-1, 1, 0, 3, 3, 2],
  Bbaug: [-1, 1, 0, 3, 3, 2],
  Baug: [-1, 2, 1, 0, 0, 3],

  // Sus4
  Csus4: [-1, 3, 3, 0, 1, 1],
  "C#sus4": [-1, 4, 6, 6, 7, 4],
  Dsus4: [-1, -1, 0, 2, 3, 3],
  "D#sus4": [-1, 6, 8, 8, 9, 6],
  Esus4: [0, 2, 2, 2, 0, 0],
  Fsus4: [1, 3, 3, 3, 1, 1],
  "F#sus4": [2, 4, 4, 4, 2, 2],
  Gsus4: [3, 3, 0, 0, 1, 3],
  "G#sus4": [4, 6, 6, 6, 4, 4],
  Asus4: [-1, 0, 2, 2, 3, 0],
  "A#sus4": [-1, 1, 3, 3, 4, 1],
  Bbsus4: [-1, 1, 3, 3, 4, 1],
  Bsus4: [-1, 2, 4, 4, 5, 2],

  // Sus2
  Csus2: [-1, 3, 0, 0, 3, 3],
  "C#sus2": [-1, 4, 6, 6, 4, 4],
  Dsus2: [-1, -1, 0, 2, 3, 0],
  "D#sus2": [-1, 6, 8, 8, 6, 6],
  Esus2: [0, 2, 4, 4, 0, 0],
  Fsus2: [-1, -1, 3, 0, 1, 1],
  "F#sus2": [-1, -1, 4, 1, 2, 2],
  Gsus2: [3, 0, 0, 0, 3, 3],
  "G#sus2": [4, 6, 6, 4, 4, 4],
  Asus2: [-1, 0, 2, 2, 0, 0],
  "A#sus2": [-1, 1, 3, 3, 1, 1],
  Bbsus2: [-1, 1, 3, 3, 1, 1],
  Bsus2: [-1, 2, 4, 4, 2, 2],
};

// Ukulele fingering database (4-string G-C-E-A)
export const UKULELE_CHORDS: Record<string, number[]> = {
  // Major
  C: [0, 0, 0, 3],
  "C#": [1, 1, 1, 4],
  Db: [1, 1, 1, 4],
  D: [2, 2, 2, 0],
  "D#": [3, 3, 3, 1],
  Eb: [3, 3, 3, 1],
  E: [4, 4, 4, 2],
  F: [2, 0, 1, 0],
  "F#": [3, 1, 2, 1],
  Gb: [3, 1, 2, 1],
  G: [0, 2, 3, 2],
  "G#": [5, 3, 4, 3],
  Ab: [5, 3, 4, 3],
  A: [2, 1, 0, 0],
  "A#": [3, 2, 1, 1],
  Bb: [3, 2, 1, 1],
  B: [4, 3, 2, 2],

  // Minor
  Cm: [0, 3, 3, 3],
  "C#m": [1, 4, 4, 4],
  Dbm: [1, 4, 4, 4],
  Dm: [2, 2, 1, 0],
  "D#m": [3, 3, 2, 1],
  Ebm: [3, 3, 2, 1],
  Em: [0, 4, 3, 2],
  Fm: [1, 0, 1, 3],
  "F#m": [2, 1, 2, 0],
  Gbm: [2, 1, 2, 0],
  Gm: [0, 2, 3, 1],
  "G#m": [1, 3, 4, 2],
  Abm: [1, 3, 4, 2],
  Am: [2, 0, 0, 0],
  "A#m": [3, 1, 1, 1],
  Bbm: [3, 1, 1, 1],
  Bm: [4, 2, 2, 2],

  // 7
  C7: [0, 0, 0, 1],
  "C#7": [1, 1, 1, 2],
  D7: [2, 0, 2, 0],
  "D#7": [3, 1, 3, 1],
  Eb7: [3, 1, 3, 1],
  E7: [1, 2, 0, 2],
  F7: [2, 3, 1, 3],
  "F#7": [3, 4, 2, 4],
  G7: [0, 2, 1, 2],
  "G#7": [1, 3, 2, 3],
  A7: [0, 1, 0, 0],
  "A#7": [1, 2, 1, 1],
  Bb7: [1, 2, 1, 1],
  B7: [2, 3, 2, 2],

  // maj7
  Cmaj7: [0, 0, 0, 2],
  Dmaj7: [2, 1, 2, 0],
  Emaj7: [1, 3, 0, 2],
  Fmaj7: [2, 4, 1, 3],
  Gmaj7: [0, 2, 2, 2],
  Amaj7: [1, 1, 0, 0],
  Bmaj7: [3, 3, 2, 2],

  // min7
  Cm7: [3, 3, 3, 3],
  Dm7: [2, 2, 1, 3],
  Em7: [0, 2, 0, 2],
  Fm7: [1, 3, 1, 3],
  Gm7: [0, 2, 1, 1],
  Am7: [0, 0, 0, 0],
  Bm7: [2, 2, 2, 2],

  // dim / dim7
  Cdim: [2, 3, 2, 3],
  Cdim7: [2, 3, 2, 3],
  Ddim: [1, 2, 1, 2],
  Ddim7: [1, 2, 1, 2],
  Edim: [0, 1, 0, 1],
  Edim7: [0, 1, 0, 1],
  Fdim: [1, 2, 1, 2],
  Fdim7: [1, 2, 1, 2],
  Gdim: [0, 1, 0, 1],
  Gdim7: [0, 1, 0, 1],
  Adim: [2, 3, 2, 3],
  Adim7: [2, 3, 2, 3],
  Bdim: [1, 2, 1, 2],
  Bdim7: [1, 2, 1, 2],

  // aug
  Caug: [1, 0, 0, 3],
  Daug: [3, 2, 2, 1],
  Eaug: [1, 0, 0, 3],
  Faug: [2, 1, 1, 0],
  Gaug: [0, 3, 3, 2],
  Aaug: [2, 1, 1, 0],
  Baug: [0, 3, 3, 2],

  // sus4
  Csus4: [0, 0, 1, 3],
  Dsus4: [0, 2, 3, 0],
  Esus4: [2, 4, 0, 0],
  Fsus4: [3, 0, 1, 1],
  Gsus4: [0, 2, 3, 3],
  Asus4: [2, 2, 0, 0],
  Bsus4: [4, 4, 2, 2],

  // sus2
  Csus2: [0, 2, 3, 3],
  Dsus2: [2, 2, 0, 0],
  Esus2: [4, 4, 2, 2],
  Fsus2: [0, 0, 1, 3],
  Gsus2: [0, 2, 3, 0],
  Asus2: [2, 2, 0, 0],
  Bsus2: [4, 4, 2, 2],
};

// Piano key offsets from root
export const PIANO_CHORD_OFFSETS: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  nc: [],
  uncertain: [0, 4, 7],
};

/**
 * Given a capo position, returns the relative chord shape the guitarist fingers
 * (e.g. In D Major with Capo 2, play C-shape chords)
 */
export function getRelativeChordForCapo(chord: string, capoFret: number): string {
  if (capoFret <= 0) return chord;
  return transposeChord(chord, -capoFret);
}

export function getGuitarChordShape(chord: string, capoFret: number = 0): number[] {
  // If capo is active on guitar, diagram reflects shape relative to capo (Section B.6)
  const effectiveChord = capoFret > 0 ? getRelativeChordForCapo(chord, capoFret) : chord;
  const baseChord = effectiveChord.split("/")[0];

  if (GUITAR_CHORDS[effectiveChord]) return GUITAR_CHORDS[effectiveChord];
  if (GUITAR_CHORDS[baseChord]) return GUITAR_CHORDS[baseChord];

  // Check enharmonic
  const match = baseChord.match(/^([A-G][#b]?)(.*)$/);
  if (match) {
    const root = match[1];
    const suffix = match[2];
    const enharmonicRoot = ENHARMONIC_MAP[root];
    if (enharmonicRoot && GUITAR_CHORDS[`${enharmonicRoot}${suffix}`]) {
      return GUITAR_CHORDS[`${enharmonicRoot}${suffix}`];
    }
  }

  // Fallback to simplified triad
  const simple = simplifyChord(baseChord);
  if (GUITAR_CHORDS[simple]) return GUITAR_CHORDS[simple];

  return GUITAR_CHORDS["C"];
}

export function getUkuleleChordShape(chord: string): number[] {
  const baseChord = chord.split("/")[0];
  if (UKULELE_CHORDS[chord]) return UKULELE_CHORDS[chord];
  if (UKULELE_CHORDS[baseChord]) return UKULELE_CHORDS[baseChord];

  const match = baseChord.match(/^([A-G][#b]?)(.*)$/);
  if (match) {
    const root = match[1];
    const suffix = match[2];
    const enharmonicRoot = ENHARMONIC_MAP[root];
    if (enharmonicRoot && UKULELE_CHORDS[`${enharmonicRoot}${suffix}`]) {
      return UKULELE_CHORDS[`${enharmonicRoot}${suffix}`];
    }
  }

  const simple = simplifyChord(baseChord);
  if (UKULELE_CHORDS[simple]) return UKULELE_CHORDS[simple];

  return UKULELE_CHORDS["C"];
}

/**
 * Transpose chord by semitones (+n / -n, full ±11 range)
 * Fully supports slash chords (e.g. C/G -> D/A at +2 semitones)
 */
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  if (!chord || chord === "N.C." || chord === "uncertain") return chord;

  if (chord.includes("/")) {
    const [mainPart, bassPart] = chord.split("/");
    const transMain = transposeSingleChord(mainPart, semitones);
    const transBass = transposeSingleChord(bassPart, semitones);
    return `${transMain}/${transBass}`;
  }

  return transposeSingleChord(chord, semitones);
}

function transposeSingleChord(chord: string, semitones: number): string {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  let root = match[1];
  const suffix = match[2];

  if (ENHARMONIC_MAP[root]) {
    root = ENHARMONIC_MAP[root];
  }

  const index = CHROMATIC_NOTES.indexOf(root);
  if (index === -1) return chord;

  const newIndex = (index + semitones + 120) % 12;
  return `${CHROMATIC_NOTES[newIndex]}${suffix}`;
}

/**
 * Simplify chord toggle: collapses extended/complex qualities to basic triads
 * (Section B.5: Cmaj7 -> C, Dm7 -> Dm, G7sus4 -> G, C/G -> C)
 */
export function simplifyChord(chord: string): string {
  if (!chord || chord === "N.C." || chord === "uncertain") return chord;

  const basePart = chord.split("/")[0];
  const match = basePart.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return basePart;

  const root = match[1];
  const suffix = match[2].toLowerCase();

  // Diminished family (dim, dim7) -> dim
  if (suffix.startsWith("dim")) {
    return `${root}dim`;
  }
  // Augmented family (aug) -> aug
  if (suffix.startsWith("aug")) {
    return `${root}aug`;
  }
  // Minor family (m, min, m7, min7, m7b5) -> m
  if (suffix.startsWith("m") && !suffix.startsWith("maj")) {
    return `${root}m`;
  }
  // Major family (maj, 7, maj7, sus2, sus4) -> basic major triad
  return root;
}

/**
 * Calculates smart capo recommendation for guitar in easy open-chord friendly keys
 */
export function calculateBestCapo(key: string): { fret: number; openKey: string } {
  const easyKeys = ["G", "C", "D", "E", "A"];
  const match = key.replace(/m|Major|Minor/g, "").trim();
  const rootIndex = CHROMATIC_NOTES.indexOf(match);

  if (rootIndex === -1) return { fret: 0, openKey: key };

  for (let fret = 1; fret <= 5; fret++) {
    const candidateIndex = (rootIndex - fret + 12) % 12;
    const candidateKey = CHROMATIC_NOTES[candidateIndex];
    if (easyKeys.includes(candidateKey)) {
      return { fret, openKey: candidateKey };
    }
  }

  return { fret: 0, openKey: key };
}

/**
 * Computes frequency array in Hz for a chord (including bass inversions)
 */
export function getChordFrequencies(chord: string): number[] {
  if (!chord || chord === "N.C." || chord === "uncertain") {
    return [440];
  }

  const parts = chord.split("/");
  const mainChord = parts[0];
  const slashBass = parts[1] || null;

  const match = mainChord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return [440];

  let root = match[1];
  const suffix = match[2].toLowerCase();

  if (ENHARMONIC_MAP[root]) {
    root = ENHARMONIC_MAP[root];
  }

  const rootIndex = CHROMATIC_NOTES.indexOf(root);
  if (rootIndex === -1) return [440];

  // Base octave (C4 = 261.63Hz)
  // Chromatic offsets from A4 = 440Hz
  const getNoteFreq = (chromaIdx: number, octave: number) => {
    // MIDI note: (octave + 1) * 12 + chromaIdx
    const midi = (octave + 1) * 12 + chromaIdx;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // Determine quality offsets
  let offsets = PIANO_CHORD_OFFSETS.maj;
  if (suffix.includes("min7") || suffix.includes("m7")) {
    offsets = PIANO_CHORD_OFFSETS.min7;
  } else if (suffix.includes("maj7")) {
    offsets = PIANO_CHORD_OFFSETS.maj7;
  } else if (suffix.includes("m") && !suffix.includes("maj")) {
    offsets = PIANO_CHORD_OFFSETS.min;
  } else if (suffix.includes("7")) {
    offsets = PIANO_CHORD_OFFSETS["7"];
  } else if (suffix.includes("dim7")) {
    offsets = PIANO_CHORD_OFFSETS.dim7;
  } else if (suffix.includes("dim")) {
    offsets = PIANO_CHORD_OFFSETS.dim;
  } else if (suffix.includes("aug")) {
    offsets = PIANO_CHORD_OFFSETS.aug;
  } else if (suffix.includes("sus4")) {
    offsets = PIANO_CHORD_OFFSETS.sus4;
  } else if (suffix.includes("sus2")) {
    offsets = PIANO_CHORD_OFFSETS.sus2;
  }

  const freqs: number[] = [];

  // Add root bass note in Octave 2
  freqs.push(getNoteFreq(rootIndex, 2));

  // If slash chord, add distinct low bass in Octave 2
  if (slashBass) {
    let bRoot = slashBass;
    if (ENHARMONIC_MAP[bRoot]) bRoot = ENHARMONIC_MAP[bRoot];
    const bIdx = CHROMATIC_NOTES.indexOf(bRoot);
    if (bIdx !== -1) {
      freqs.push(getNoteFreq(bIdx, 2));
    }
  }

  // Add chord triad/extension notes in Octave 3 & 4
  for (const semi of offsets) {
    const nIdx = (rootIndex + semi) % 12;
    const oct = rootIndex + semi >= 12 ? 4 : 3;
    freqs.push(getNoteFreq(nIdx, oct));
  }

  return freqs;
}

/**
 * Synthesizes a clean 1.2s acoustic chord preview directly to a 44.1kHz WAV Buffer
 * (Section B.7 Tap-to-preview audio)
 */
export function generateChordPcmWav(chord: string): Buffer {
  const sampleRate = 44100;
  const duration = 1.2;
  const numSamples = Math.floor(sampleRate * duration);

  const freqs = getChordFrequencies(chord);
  const pcmBytes = numSamples * 2;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write("data", 36);
  header.writeUInt32LE(pcmBytes, 40);

  const data = Buffer.alloc(pcmBytes);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Acoustic exponential decay envelope with soft attack
    const attack = Math.min(1.0, t / 0.015);
    const env = attack * Math.exp(-3.2 * t);

    let s = 0;
    for (const f of freqs) {
      // Fundamental + 2nd & 3rd harmonic for rich acoustic timbre
      s += Math.sin(2 * Math.PI * f * t) +
           0.35 * Math.sin(4 * Math.PI * f * t) +
           0.15 * Math.sin(6 * Math.PI * f * t);
    }

    s = (s / Math.max(1, freqs.length)) * env * 0.75;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  return Buffer.concat([header, data]);
}

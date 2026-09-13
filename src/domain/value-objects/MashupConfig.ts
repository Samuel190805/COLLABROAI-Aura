export interface StemSelection {
  vocalsSource?: "A" | "B";
  instrumentSource?: "A" | "B";
  vocalsFrom?: "A" | "B";
  instrumentFrom?: "A" | "B";
}

export interface CompatibilityScore {
  scorePercent: number; // 0 to 100
  keyMatch: "perfect" | "compatible" | "energy_boost" | "clash";
  camelotA: string;
  camelotB: string;
  keyA: string;
  keyB: string;
  bpmA: number;
  bpmB: number;
  suggestedBpm: number;
  pitchShiftSemis: number; // semitone adjustment for Track A
  pitchShiftCapped: boolean; // true if clamped to +/- 4 semitones
  tempoStretchPct: number; // percentage stretch
  tempoStretchWarning: boolean; // true if > 20%
}

// Camelot Wheel Compatibility Matrix
// Same number (e.g. 8A to 8B) = Perfect Relative Major/Minor
// +/- 1 number (e.g. 8A to 9A) = Perfect Harmonic Energy Shift
// +/- 2 numbers = Acceptable
// > 2 numbers = Clashing unless pitch shifted
export function calculateCompatibility(
  keyA: string,
  camelotA: string,
  bpmA: number,
  keyB: string,
  camelotB: string,
  bpmB: number
): CompatibilityScore {
  // Parse camelot codes
  const parseCamelot = (code: string) => {
    const match = code.match(/^(\d+)([AB])$/);
    if (!match) return { num: 8, letter: "B" };
    return { num: parseInt(match[1], 10), letter: match[2] };
  };

  const cA = parseCamelot(camelotA || "8B");
  const cB = parseCamelot(camelotB || "8B");

  // Wheel distance (0 to 6)
  const diff = Math.abs(cA.num - cB.num);
  const wheelDistance = Math.min(diff, 12 - diff);

  let keyScore = 50;
  let keyMatch: "perfect" | "compatible" | "energy_boost" | "clash" = "clash";

  if (cA.num === cB.num && cA.letter === cB.letter) {
    keyScore = 100;
    keyMatch = "perfect";
  } else if (cA.num === cB.num && cA.letter !== cB.letter) {
    keyScore = 95;
    keyMatch = "perfect";
  } else if (wheelDistance === 1 && cA.letter === cB.letter) {
    keyScore = 90;
    keyMatch = "energy_boost";
  } else if (wheelDistance <= 2) {
    keyScore = 75;
    keyMatch = "compatible";
  } else {
    keyScore = 40;
    keyMatch = "clash";
  }

  // Pitch shift needed to align Track A with Track B (semitones)
  let rawShift = (cB.num - cA.num) % 12;
  if (rawShift > 6) rawShift -= 12;
  if (rawShift < -6) rawShift += 12;

  // Cap pitch shift to +/- 4 semitones to avoid artifacts
  let pitchShiftSemis = rawShift;
  let pitchShiftCapped = false;
  if (pitchShiftSemis > 4) {
    pitchShiftSemis = 4;
    pitchShiftCapped = true;
  } else if (pitchShiftSemis < -4) {
    pitchShiftSemis = -4;
    pitchShiftCapped = true;
  }

  // Tempo Compatibility
  const bpmRatio = Math.max(bpmA, bpmB) / Math.min(bpmA, bpmB);
  // Also check 2x or 0.5x half-time/double-time match
  const halfRatio = Math.max(bpmA, bpmB / 2) / Math.min(bpmA, bpmB / 2);
  const bestRatio = Math.min(bpmRatio, halfRatio);

  const tempoDiffPct = Math.abs(bestRatio - 1) * 100;
  let tempoScore = Math.max(20, Math.round(100 - tempoDiffPct * 3.5));
  const tempoStretchWarning = tempoDiffPct > 20;

  const totalScore = Math.round(keyScore * 0.55 + tempoScore * 0.45);
  const suggestedBpm = Math.round((bpmA + bpmB) / 2);

  return {
    scorePercent: Math.min(100, Math.max(10, totalScore)),
    keyMatch,
    camelotA: camelotA || "8B",
    camelotB: camelotB || "8B",
    keyA: keyA || "C Major",
    keyB: keyB || "C Major",
    bpmA: bpmA || 120,
    bpmB: bpmB || 120,
    suggestedBpm,
    pitchShiftSemis,
    pitchShiftCapped,
    tempoStretchPct: Math.round(tempoDiffPct),
    tempoStretchWarning,
  };
}

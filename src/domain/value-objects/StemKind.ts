export type StemKind = "VOCALS" | "INSTRUMENT";

export const STEM_KINDS: readonly StemKind[] = ["VOCALS", "INSTRUMENT"] as const;

export function isValidStemKind(kind: string): kind is StemKind {
  return kind === "VOCALS" || kind === "INSTRUMENT";
}

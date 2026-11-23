import type { Phoneme, Syllable } from "../types.js";

export interface WordEdges { initial: boolean; final: boolean }

/** Both flags can be true for a single segment with no onset or coda. */
export function nucleusWordEdges(
  syllable: Syllable,
  syllableIndex: number,
  syllableCount: number,
  nucleusIndex: number,
): WordEdges {
  return {
    initial: syllableIndex === 0 && syllable.onset.length === 0 && nucleusIndex === 0,
    final: syllableIndex === syllableCount - 1 && syllable.coda.length === 0 && nucleusIndex === syllable.nucleus.length - 1,
  };
}

/** Checked (lax) vowels that need a coda at a stressed open word-final edge. */
export const CHECKED_VOWELS = ["ɪ", "ɛ", "æ", "ʌ", "ʊ"] as const;
const CHECKED_VOWEL_SET = new Set<string>(CHECKED_VOWELS);

/** A zero at either applicable edge wins over the other edge's positive weight. */
export function nucleusWordPositionWeight(phoneme: Phoneme, edges: WordEdges): number | undefined {
  const weights = phoneme.nucleusWordPosition;
  if (!weights) return undefined;
  if ((edges.initial && weights.initial <= 0) || (edges.final && weights.final <= 0)) return 0;
  if (edges.initial) return weights.initial;
  if (edges.final) return weights.final;
  return weights.medial;
}

export function isNucleusWordPositionAllowed(phoneme: Phoneme, edges: WordEdges): boolean {
  const weight = nucleusWordPositionWeight(phoneme, edges);
  return weight === undefined || weight > 0;
}

/** English checked vowels may not occupy an open final base-word edge. */
export function isCheckedOpenFinalAllowed(phoneme: Phoneme, edges: WordEdges): boolean {
  return !(edges.final && CHECKED_VOWEL_SET.has(phoneme.sound));
}

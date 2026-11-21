/**
 * Test-only helpers for reading a grapheme selection's syllable shape from a
 * word trace. Not part of the published build (excluded in tsconfig.json).
 */
import type { Word } from "../types.js";
import type { GraphemeTrace } from "../core/trace.js";

/** A traced nucleus selection with its own syllable's onset and coda sizes. */
export interface NucleusSlot {
  nucleus: GraphemeTrace;
  onsetLength: number;
  codaLength: number;
}

/** Every root nucleus selection of `phoneme`, with onset/coda segment counts. */
export function nucleusSlots(word: Word, phoneme: string): NucleusSlot[] {
  const selections = word.trace!.graphemeSelections;
  const inSyllable = (g: GraphemeTrace, nucleus: GraphemeTrace, position: string) =>
    g.syllableIndex === nucleus.syllableIndex && g.position === position;
  return selections.flatMap((nucleus) => {
    if (nucleus.phoneme !== phoneme || nucleus.position !== "nucleus") return [];
    return [{
      nucleus,
      onsetLength: selections.filter((g) => inSyllable(g, nucleus, "onset")).length,
      codaLength: selections.filter((g) => inSyllable(g, nucleus, "coda")).length,
    }];
  });
}

/** Whether the word carries a planned suffix. */
export function hasSuffix(word: Word): boolean {
  return word.trace!.morphology?.suffix !== undefined;
}

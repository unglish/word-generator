import type { Syllable } from "../types.js";

/** Independent structures for lexical composition and surface realization. */
export function cloneSyllables(syllables: Syllable[]): Syllable[] {
  return syllables.map(syllable => ({
    onset: syllable.onset.map(phoneme => ({ ...phoneme })),
    nucleus: syllable.nucleus.map(phoneme => ({ ...phoneme })),
    coda: syllable.coda.map(phoneme => ({ ...phoneme })),
    stress: syllable.stress,
  }));
}

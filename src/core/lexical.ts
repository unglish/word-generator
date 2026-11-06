import type { Phoneme, Syllable } from "../types.js";

/** Copy all scalar fields and explicitly detach structured phoneme metadata. */
export function clonePhoneme(phoneme: Phoneme): Phoneme {
  const copy = { ...phoneme };
  if (phoneme.nuclearQuantity) copy.nuclearQuantity = { ...phoneme.nuclearQuantity };
  return copy;
}

/** Independent structures for lexical composition and surface realization. */
export function cloneSyllables(syllables: Syllable[]): Syllable[] {
  return syllables.map(syllable => ({
    onset: syllable.onset.map(clonePhoneme),
    nucleus: syllable.nucleus.map(clonePhoneme),
    coda: syllable.coda.map(clonePhoneme),
    stress: syllable.stress,
  }));
}

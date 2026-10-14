import type { Word } from "../types.js";

export interface PhonemeNormalization {
  generatedAliases?: Record<string, string>;
}

export interface NormalizedPhonemeCounts {
  counts: Record<string, number>;
  /** Raw sounds rejected by normalization, keyed by the original token. */
  losses: Record<string, number>;
}

const PHONEME_TOKEN_RE = /^[\p{Letter}:]+$/u;

/** Coarse corpus aliases are explicit; rejected tokens must be counted by callers. */
export function normalizeGeneratedPhoneme(sound: string, normalization: PhonemeNormalization): string | null {
  if (!sound) return null;
  const unaspirated = sound.replace(/ʰ/g, "");
  const normalized = normalization.generatedAliases?.[unaspirated] ?? unaspirated;
  return PHONEME_TOKEN_RE.test(normalized) ? normalized : null;
}

/** Tallies onset, nucleus and coda phones of each word after normalization. */
export function countNormalizedPhonemes(words: Iterable<Word>, normalization: PhonemeNormalization): NormalizedPhonemeCounts {
  const counts: Record<string, number> = {};
  const losses: Record<string, number> = {};
  for (const word of words) {
    for (const syllable of word.syllables) {
      for (const p of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
        const sound = normalizeGeneratedPhoneme(p.sound, normalization);
        if (sound) counts[sound] = (counts[sound] || 0) + 1;
        else losses[p.sound] = (losses[p.sound] || 0) + 1;
      }
    }
  }
  return { counts, losses };
}

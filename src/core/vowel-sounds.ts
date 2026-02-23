/** Canonical English vowel phoneme sounds used by diagnostics and tests. */
const ENGLISH_VOWEL_SOUNDS = [
  "i:",
  "ɪ",
  "e",
  "ɛ",
  "ə",
  "ɜ",
  "ɚ",
  "æ",
  "ɑ",
  "ɔ",
  "o",
  "ʊ",
  "u",
  "ʌ",
  "eɪ",
  "aɪ",
  "əʊ",
  "ɔɪ",
  "aʊ",
] as const;

/** Fast lookup set for the canonical vowel inventory. */
export const ENGLISH_VOWEL_SOUND_SET = new Set<string>(ENGLISH_VOWEL_SOUNDS);

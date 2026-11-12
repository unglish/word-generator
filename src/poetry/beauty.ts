import type { Phoneme, Syllable, Word } from "../types.js";
import type { PoemRanker } from "./types.js";

export const PHONETIC_BEAUTY_RANKER_ID = "phonetic-beauty-v1";

function phonesOf(syllable: Syllable): Phoneme[] {
  return [...syllable.onset, ...syllable.nucleus, ...syllable.coda];
}

function mannerScore(manner: Phoneme["mannerOfArticulation"]): number {
  switch (manner) {
  case "liquid":
  case "lateralApproximant":
    return 1.15;
  case "nasal":
    return 0.85;
  case "glide":
    return 0.75;
  case "lowVowel":
    return 0.7;
  case "midVowel":
    return 0.55;
  case "highVowel":
    return 0.4;
  case "fricative":
    return 0.15;
  case "sibilant":
    return -0.05;
  case "affricate":
    return -0.2;
  case "stop":
    return -0.1;
  default: {
    const _exhaustive: never = manner;
    return _exhaustive;
  }
  }
}

function syllableBeauty(syllable: Syllable): number {
  let score = 0;
  const phones = phonesOf(syllable);
  for (const phone of phones) score += mannerScore(phone.mannerOfArticulation);
  // Soft sonority preference: onset not heavier than a stop cluster soup.
  if (syllable.onset.length >= 3) score -= 0.55;
  if (syllable.coda.length >= 3) score -= 0.45;
  if (syllable.stress === "ˈ") score += 0.35;
  else if (syllable.stress === "ˌ") score += 0.1;
  return score;
}

/**
 * Phonetic “beauty” for an Unglish nonce — liquids/nasals/open vowels,
 * clear primary stress, modest length. Stand-in until a neural ranker
 * selects from the same lexicon.
 */
export function scorePhoneticBeauty(word: Word): number {
  const syllables = word.syllables;
  if (!syllables.length) return -10;

  let score = 0;
  for (const syllable of syllables) score += syllableBeauty(syllable);

  const n = syllables.length;
  // Prefer 2–3 syllable words; allow monosyllables; soft-penalize very long.
  if (n === 2 || n === 3) score += 1.2;
  else if (n === 1) score += 0.35;
  else if (n === 4) score += 0.2;
  else score -= 0.4 * (n - 4);

  const primaries = syllables.filter((s) => s.stress === "ˈ").length;
  if (primaries === 1) score += 0.5;
  else if (primaries === 0) score -= 0.35;
  else score -= 0.25 * (primaries - 1);

  // Light written-form preference: not too stubby, not a brick.
  const letters = word.written.clean.length;
  if (letters >= 4 && letters <= 9) score += 0.35;
  else if (letters > 12) score -= 0.4;

  return score;
}

function meanWordScore(line: Word[], ranker: PoemRanker): number {
  if (!line.length) return -Infinity;
  let sum = 0;
  for (const word of line) sum += ranker.scoreWord(word);
  return sum / line.length;
}

function lineContextBonus(line: Word[], priorLines: Word[][]): number {
  if (!line.length) return 0;
  let bonus = 0;

  // Length contrast with the previous line (free-verse silhouette).
  if (priorLines.length) {
    const prev = priorLines[priorLines.length - 1]!;
    const prevSyl = prev.reduce((n, w) => n + w.syllables.length, 0);
    const curSyl = line.reduce((n, w) => n + w.syllables.length, 0);
    const delta = Math.abs(prevSyl - curSyl);
    if (delta >= 2) bonus += 0.45;
    if (delta === 0 && prev.length === line.length) bonus -= 0.35;
  }

  // Discourage immediate written-form repeats across the poem so far.
  const seen = new Set<string>();
  for (const prior of priorLines) {
    for (const word of prior) seen.add(word.written.clean.toLowerCase());
  }
  for (const word of line) {
    const key = word.written.clean.toLowerCase();
    if (seen.has(key)) bonus -= 1.5;
    seen.add(key);
  }

  // Soft nucleus echo with the previous line-ending (slant, not rhyme scheme).
  if (priorLines.length) {
    const prev = priorLines[priorLines.length - 1]!;
    const a = lastNucleus(prev[prev.length - 1]!);
    const b = lastNucleus(line[line.length - 1]!);
    if (a && b && a === b) bonus += 0.55;
  }

  return bonus;
}

function lastNucleus(word: Word): string | null {
  const syllables = word.syllables;
  if (!syllables.length) return null;
  let pick = syllables[syllables.length - 1]!;
  for (let i = syllables.length - 1; i >= 0; i--) {
    if (syllables[i]!.stress === "ˈ") {
      pick = syllables[i]!;
      break;
    }
  }
  return pick.nucleus.map((p) => p.sound).join("") || null;
}

/** Default ranker: Unglish-native phonetic beauty (no English dictionary). */
export function createPhoneticBeautyRanker(): PoemRanker {
  const ranker: PoemRanker = {
    scoreWord: scorePhoneticBeauty,
    scoreLine(line, priorLines) {
      return meanWordScore(line, ranker) + lineContextBonus(line, priorLines);
    },
  };
  return ranker;
}

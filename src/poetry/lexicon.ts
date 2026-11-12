import { generateWords } from "../core/generate.js";
import { createPhoneticBeautyRanker } from "./beauty.js";
import type { LexiconEntry, LexiconOptions, PoemRanker } from "./types.js";

const MIN_SIZE = 100;
const MAX_SIZE = 100_000;
const DEFAULT_SIZE = 2000;

export function clampLexiconSize(size: number | undefined): number {
  const n = Number.isFinite(size) ? Math.floor(size as number) : DEFAULT_SIZE;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n || DEFAULT_SIZE));
}

/**
 * Build a deduped Unglish lexicon and score each entry with the given ranker
 * (phonetic beauty by default; swap for a neural ranker later).
 *
 * Oversamples slightly so unique written forms can still hit `size` after dedupe.
 */
export function buildLexicon(options: LexiconOptions = {}): LexiconEntry[] {
  const target = clampLexiconSize(options.size);
  const ranker: PoemRanker = options.ranker ?? createPhoneticBeautyRanker();
  const morphology = options.morphology ?? false;
  const mode = options.mode ?? "lexicon";

  const seen = new Set<string>();
  const entries: LexiconEntry[] = [];
  let seed = options.seed;
  let guard = 0;

  while (entries.length < target && guard < 8) {
    const need = target - entries.length;
    // Extra draw covers collisions; first pass aims a bit high.
    const batch = Math.min(MAX_SIZE, Math.ceil(need * (guard === 0 ? 1.08 : 1.25)));
    const words = generateWords(batch, {
      morphology,
      mode,
      ...(seed === undefined ? {} : { seed: seed + guard * 1_000_003 }),
    });
    for (const word of words) {
      const key = word.written.clean.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      entries.push({ word, score: ranker.scoreWord(word) });
      if (entries.length >= target) break;
    }
    guard += 1;
  }

  entries.sort((a, b) => b.score - a.score);
  return entries;
}

/** Keep the top scoring fraction as a candidate pool for composition. */
export function elitePool(lexicon: LexiconEntry[], fraction = 0.35): LexiconEntry[] {
  if (!lexicon.length) return [];
  const f = Math.min(1, Math.max(0.05, fraction));
  const n = Math.max(24, Math.ceil(lexicon.length * f));
  return lexicon.slice(0, Math.min(lexicon.length, n));
}

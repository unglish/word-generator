import { generateWords } from "../core/generate.js";
import { createPhoneticBeautyRanker } from "./beauty.js";
import type { LexiconEntry, LexiconOptions, PoemRanker } from "./types.js";

const MIN_SIZE = 100;
const MAX_SIZE = 100_000;
const DEFAULT_SIZE = 2000;

/** Syllable mix for a poetry lexicon — short beats plentiful, not exclusive. */
const SYLLABLE_MIX: { syllables: number; weight: number }[] = [
  { syllables: 1, weight: 0.3 },
  { syllables: 2, weight: 0.34 },
  { syllables: 3, weight: 0.26 },
  { syllables: 4, weight: 0.1 },
];

export function clampLexiconSize(size: number | undefined): number {
  const n = Number.isFinite(size) ? Math.floor(size as number) : DEFAULT_SIZE;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n || DEFAULT_SIZE));
}

function stratumTargets(total: number): { syllables: number; count: number }[] {
  const raw = SYLLABLE_MIX.map((s) => ({
    syllables: s.syllables,
    count: Math.floor(total * s.weight),
  }));
  const assigned = raw.reduce((n, s) => n + s.count, 0);
  // Dump remainder into monosyllables — poetry needs short words most.
  raw[0]!.count += Math.max(0, total - assigned);
  return raw.filter((s) => s.count > 0);
}

function addUnique(
  entries: LexiconEntry[],
  seen: Set<string>,
  words: ReturnType<typeof generateWords>,
  ranker: PoemRanker,
  limit: number,
): void {
  for (const word of words) {
    if (entries.length >= limit) return;
    const key = word.written.clean.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({ word, score: ranker.scoreWord(word) });
  }
}

/**
 * Build a deduped Unglish lexicon with a deliberate short/long syllable mix,
 * scored by the given ranker (phonetic beauty by default).
 *
 * Short strata force `syllableCount` and skip affixes so monosyllables survive
 * even when the demo’s “Include affixes” toggle is on.
 */
export function buildLexicon(options: LexiconOptions = {}): LexiconEntry[] {
  const target = clampLexiconSize(options.size);
  const ranker: PoemRanker = options.ranker ?? createPhoneticBeautyRanker();
  const morphology = options.morphology ?? false;
  const mode = options.mode ?? "text";
  const seed = options.seed;

  const seen = new Set<string>();
  const entries: LexiconEntry[] = [];
  const strata = stratumTargets(target);

  for (const stratum of strata) {
    const want = stratum.count;
    const before = entries.length;
    let guard = 0;
    while (entries.length - before < want && guard < 6) {
      const need = want - (entries.length - before);
      const batch = Math.min(MAX_SIZE, Math.ceil(need * (guard === 0 ? 1.15 : 1.35)));
      // Keep 1–2 syllable stock unaffixed; longer strata may use morphology.
      const useMorph = morphology && stratum.syllables >= 3;
      const words = generateWords(batch, {
        morphology: useMorph,
        mode,
        syllableCount: stratum.syllables,
        ...(seed === undefined
          ? {}
          : { seed: seed + stratum.syllables * 17_011 + guard * 1_000_003 }),
      });
      addUnique(entries, seen, words, ranker, before + want);
      guard += 1;
    }
  }

  // Top up if a stratum under-delivered (rare collisions).
  let topUpGuard = 0;
  while (entries.length < target && topUpGuard < 4) {
    const words = generateWords(Math.ceil((target - entries.length) * 1.2), {
      morphology: false,
      mode: "text",
      syllableCount: 1,
      ...(seed === undefined ? {} : { seed: seed + 9_001_001 + topUpGuard }),
    });
    addUnique(entries, seen, words, ranker, target);
    topUpGuard += 1;
  }

  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, target);
}

/**
 * Composition pool with short/long balance — not just the global top scores
 * (which used to bury monosyllables under pretty polysyllables).
 */
export function elitePool(lexicon: LexiconEntry[], fraction = 0.45): LexiconEntry[] {
  if (!lexicon.length) return [];
  const f = Math.min(1, Math.max(0.05, fraction));
  const n = Math.max(32, Math.ceil(lexicon.length * f));

  const byLen = new Map<number, LexiconEntry[]>();
  for (const entry of lexicon) {
    const len = entry.word.syllables.length;
    const bucket = byLen.get(len);
    if (bucket) bucket.push(entry);
    else byLen.set(len, [entry]);
  }

  const quotas: { len: number; share: number }[] = [
    { len: 1, share: 0.28 },
    { len: 2, share: 0.34 },
    { len: 3, share: 0.28 },
    { len: 4, share: 0.1 },
  ];

  const picked: LexiconEntry[] = [];
  const used = new Set<LexiconEntry>();
  for (const q of quotas) {
    const bucket = byLen.get(q.len) ?? [];
    const take = Math.min(bucket.length, Math.max(4, Math.round(n * q.share)));
    for (let i = 0; i < take; i++) {
      const entry = bucket[i]!;
      if (used.has(entry)) continue;
      used.add(entry);
      picked.push(entry);
    }
  }

  // Fill remainder from leftover high scores of any length ≤3 first.
  if (picked.length < n) {
    for (const entry of lexicon) {
      if (picked.length >= n) break;
      if (used.has(entry)) continue;
      if (entry.word.syllables.length > 4) continue;
      used.add(entry);
      picked.push(entry);
    }
  }

  picked.sort((a, b) => b.score - a.score);
  return picked;
}

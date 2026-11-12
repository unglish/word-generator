import type { Word } from "../types.js";
import { PHONETIC_BEAUTY_RANKER_ID, createPhoneticBeautyRanker } from "./beauty.js";
import { elitePool } from "./lexicon.js";
import type {
  ComposeOptions,
  FreeVerseLine,
  FreeVersePoem,
  LexiconEntry,
  PoemRanker,
} from "./types.js";

function defaultRand(): number {
  return Math.random();
}

function pickInt(rand: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(rand() * (max - min + 1));
}

/** Jagged syllable silhouette for a free-verse stanza (contrast, not meter). */
export function chooseSilhouette(rand: () => number, minLines: number, maxLines: number): number[] {
  const lines = pickInt(rand, minLines, maxLines);
  const targets: number[] = [];
  let prev = 0;
  for (let i = 0; i < lines; i++) {
    // Prefer 1–7 syllables; occasionally a one-beat line.
    let next = pickInt(rand, 1, 7);
    if (i > 0 && Math.abs(next - prev) < 2 && rand() < 0.7) {
      next = prev <= 3 ? pickInt(rand, prev + 2, 7) : pickInt(rand, 1, Math.max(1, prev - 2));
    }
    // Last line: slight preference for a soft landing (shorter).
    if (i === lines - 1 && next > 4 && rand() < 0.55) next = pickInt(rand, 1, 4);
    targets.push(next);
    prev = next;
  }
  return targets;
}

function pauseForLine(syllables: number, isLast: boolean): number {
  if (isLast) return 0;
  // Breath follows density — short beat lines get a quicker pickup.
  const base = syllables <= 2 ? 0.38 : syllables <= 4 ? 0.55 : 0.78;
  return Math.min(1.05, Math.max(0.28, base));
}

function takeWord(
  pool: LexiconEntry[],
  used: Set<string>,
  rand: () => number,
): LexiconEntry | null {
  const open = pool.filter((e) => !used.has(e.word.written.clean.toLowerCase()));
  if (!open.length) return null;
  // Softmax-ish: weight by rank position (pool is score-sorted).
  const weights = open.map((_, i) => 1 / (1 + i * 0.08));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < open.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return open[i]!;
  }
  return open[open.length - 1]!;
}

function fillLine(
  targetSyllables: number,
  pool: LexiconEntry[],
  used: Set<string>,
  rand: () => number,
  ranker: PoemRanker,
  priorLines: Word[][],
): Word[] {
  const attempts: Word[][] = [];
  for (let trial = 0; trial < 10; trial++) {
    const localUsed = new Set(used);
    const line: Word[] = [];
    let syl = 0;
    let guard = 0;
    while (syl < targetSyllables && guard < 24) {
      guard += 1;
      const remaining = targetSyllables - syl;
      const candidates = pool.filter((e) => {
        const key = e.word.written.clean.toLowerCase();
        if (localUsed.has(key)) return false;
        const n = e.word.syllables.length;
        return n > 0 && n <= remaining;
      });
      let pick: LexiconEntry | null = null;
      if (candidates.length) {
        // Prefer exact fit near the end of the line.
        const exact = candidates.filter((e) => e.word.syllables.length === remaining);
        const from = exact.length && (remaining <= 3 || rand() < 0.65) ? exact : candidates;
        pick = takeWord(from, localUsed, rand);
      } else {
        pick = takeWord(pool, localUsed, rand);
      }
      if (!pick) break;
      line.push(pick.word);
      localUsed.add(pick.word.written.clean.toLowerCase());
      syl += pick.word.syllables.length;
      if (syl >= targetSyllables) break;
      // Allow a one-word shortfall / overshoot only if we cannot fit more.
      if (syl > targetSyllables) break;
    }
    if (line.length) attempts.push(line);
  }

  if (!attempts.length) {
    const fallback = takeWord(pool, used, rand);
    return fallback ? [fallback.word] : [];
  }

  const scoreLine = (line: Word[]) =>
    ranker.scoreLine ? ranker.scoreLine(line, priorLines) : line.reduce((n, w) => n + ranker.scoreWord(w), 0);

  attempts.sort((a, b) => scoreLine(b) - scoreLine(a));
  return attempts[0]!;
}

/**
 * Arrange a free-verse stanza by selecting from a scored Unglish lexicon.
 * No closed form (haiku/sonnet); jagged lines + breath pauses.
 */
export function composeFreeVerse(
  lexicon: LexiconEntry[],
  options: ComposeOptions = {},
): FreeVersePoem {
  const ranker = options.ranker ?? createPhoneticBeautyRanker();
  const rand = options.rand ?? defaultRand;
  const minLines = options.minLines ?? 4;
  const maxLines = options.maxLines ?? 6;
  const pool = elitePool(lexicon, 0.4);
  if (!pool.length) {
    return { lines: [], lexiconSize: lexicon.length, rankerId: PHONETIC_BEAUTY_RANKER_ID };
  }

  const silhouette = chooseSilhouette(rand, minLines, maxLines);
  const used = new Set<string>();
  const priorLines: Word[][] = [];
  const lines: FreeVerseLine[] = [];

  for (let i = 0; i < silhouette.length; i++) {
    const words = fillLine(silhouette[i]!, pool, used, rand, ranker, priorLines);
    if (!words.length) continue;
    for (const word of words) used.add(word.written.clean.toLowerCase());
    priorLines.push(words);
    const syllables = words.reduce((n, w) => n + w.syllables.length, 0);
    const ipa = words
      .map((w) => w.pronunciation)
      .filter(Boolean)
      .join(" ");
    lines.push({
      words,
      ipa,
      pauseSec: pauseForLine(syllables, i === silhouette.length - 1),
    });
  }

  // Ensure the final pause is zero even if silhouette shrank.
  if (lines.length) lines[lines.length - 1]!.pauseSec = 0;

  return {
    lines,
    lexiconSize: lexicon.length,
    rankerId: PHONETIC_BEAUTY_RANKER_ID,
  };
}

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
    // Prefer 2–6 syllables so lines often need more than one short word.
    let next = pickInt(rand, 2, 6);
    if (rand() < 0.18) next = 1; // occasional one-beat line
    if (i > 0 && Math.abs(next - prev) < 2 && rand() < 0.7) {
      next = prev <= 3 ? pickInt(rand, prev + 2, 6) : pickInt(rand, 1, Math.max(1, prev - 2));
    }
    if (i === lines - 1 && next > 4 && rand() < 0.55) next = pickInt(rand, 1, 3);
    targets.push(next);
    prev = next;
  }
  return targets;
}

function pauseForLine(syllables: number, isLast: boolean): number {
  if (isLast) return 0;
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
  const weights = open.map((_, i) => 1 / (1 + i * 0.08));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < open.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return open[i]!;
  }
  return open[open.length - 1]!;
}

/**
 * Prefer a short/long mix: chip with 1–2 syllable words, but still allow
 * a 3-syllable color word instead of one long brick for the whole line.
 */
function preferredMaxSyllables(remaining: number, rand: () => number, lineSoFar: number): number {
  if (remaining <= 1) return 1;
  if (remaining === 2) return rand() < 0.45 ? 1 : 2;
  if (remaining === 3) {
    if (lineSoFar === 0 && rand() < 0.4) return 3; // open with a longer word sometimes
    return rand() < 0.4 ? 1 : 2;
  }
  // remaining ≥ 4
  if (lineSoFar === 0 && rand() < 0.35) return 3;
  if (rand() < 0.35) return 1;
  if (rand() < 0.75) return 2;
  return Math.min(3, remaining);
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
  for (let trial = 0; trial < 12; trial++) {
    const localUsed = new Set(used);
    const line: Word[] = [];
    let syl = 0;
    let guard = 0;
    while (syl < targetSyllables && guard < 28) {
      guard += 1;
      const remaining = targetSyllables - syl;
      const maxPrefer = preferredMaxSyllables(remaining, rand, line.length);
      const candidates = pool.filter((e) => {
        const key = e.word.written.clean.toLowerCase();
        if (localUsed.has(key)) return false;
        const n = e.word.syllables.length;
        return n > 0 && n <= remaining && n <= maxPrefer;
      });
      let pick: LexiconEntry | null = null;
      if (candidates.length) {
        const exact = candidates.filter((e) => e.word.syllables.length === remaining);
        // Only glue the remainder with one word when it's short (≤2).
        const from =
          exact.length && remaining <= 2 && rand() < 0.75
            ? exact
            : candidates;
        pick = takeWord(from, localUsed, rand);
      } else {
        // Fallback: any word that still fits the remaining budget.
        const fit = pool.filter((e) => {
          const key = e.word.written.clean.toLowerCase();
          if (localUsed.has(key)) return false;
          const n = e.word.syllables.length;
          return n > 0 && n <= remaining;
        });
        pick = fit.length ? takeWord(fit, localUsed, rand) : takeWord(pool, localUsed, rand);
      }
      if (!pick) break;
      line.push(pick.word);
      localUsed.add(pick.word.written.clean.toLowerCase());
      syl += pick.word.syllables.length;
      if (syl >= targetSyllables) break;
    }
    if (line.length) attempts.push(line);
  }

  if (!attempts.length) {
    const fallback = takeWord(pool, used, rand);
    return fallback ? [fallback.word] : [];
  }

  const scoreLine = (line: Word[]) =>
    ranker.scoreLine
      ? ranker.scoreLine(line, priorLines)
      : line.reduce((n, w) => n + ranker.scoreWord(w), 0);

  attempts.sort((a, b) => scoreLine(b) - scoreLine(a));
  return attempts[0]!;
}

/**
 * Arrange a free-verse stanza by selecting from a scored Unglish lexicon.
 * No closed form (haiku/sonnet); jagged lines + breath pauses + short/long mix.
 */
export function composeFreeVerse(
  lexicon: LexiconEntry[],
  options: ComposeOptions = {},
): FreeVersePoem {
  const ranker = options.ranker ?? createPhoneticBeautyRanker();
  const rand = options.rand ?? defaultRand;
  const minLines = options.minLines ?? 4;
  const maxLines = options.maxLines ?? 6;
  const pool = elitePool(lexicon, 0.5);
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

  if (lines.length) lines[lines.length - 1]!.pauseSec = 0;

  return {
    lines,
    lexiconSize: lexicon.length,
    rankerId: PHONETIC_BEAUTY_RANKER_ID,
  };
}

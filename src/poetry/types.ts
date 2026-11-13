import type { Word } from "../types.js";

/** One Unglish nonce in a poem lexicon, with optional precomputed beauty score. */
export type LexiconEntry = {
  word: Word;
  /** Cached phonetic beauty (or neural) score; higher is more desirable. */
  score: number;
};

/**
 * Pluggable poem ranker. Today: phonetic beauty. Tomorrow: a neural net that
 * scores / reorders candidates drawn from a large Unglish lexicon.
 */
export type PoemRanker = {
  /** Score one word in isolation (lexicon indexing). */
  scoreWord(word: Word): number;
  /**
   * Optional contextual score for a candidate line given prior lines.
   * Higher is better. Default composers fall back to mean word scores.
   */
  scoreLine?(line: Word[], priorLines: Word[][]): number;
};

/** One free-verse line ready for display / Chimera speak. */
export type FreeVerseLine = {
  words: Word[];
  /** Broad IPA for UI (space-joined). */
  ipa: string;
  /** Suggested Chimera pause after this line (seconds); 0 on the last line. */
  pauseSec: number;
};

export type FreeVersePoem = {
  lines: FreeVerseLine[];
  /** Lexicon size the poem was drawn from. */
  lexiconSize: number;
  /** Ranker id for status / debugging (e.g. "phonetic-beauty-v1"). */
  rankerId: string;
};

export type LexiconOptions = {
  /** Target unique written forms (clamped 100–100_000). Default 2000. */
  size?: number;
  morphology?: boolean;
  seed?: number;
  /** Mode for generateWords; lexicon mode favors dictionary-like length mix. */
  mode?: "text" | "lexicon";
  ranker?: PoemRanker;
};

export type ComposeOptions = {
  ranker?: PoemRanker;
  /** Soft min/max line count. */
  minLines?: number;
  maxLines?: number;
  /** RNG in [0, 1). */
  rand?: () => number;
};

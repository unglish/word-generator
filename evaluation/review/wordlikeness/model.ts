import { createHash } from "node:crypto";

export const SCORING_VERSION = "wordlikeness-v1";
export const CMU_REVISION = "74790861f652b15e4ac49015a90074ad62a27690";
export const CMU_SHA256 = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
export const VOWELS = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
export const CONSONANTS = new Set("B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH".split(" "));
export interface SoundSyllable { onset: string[]; nucleus: string[]; coda: string[]; stressed: boolean }
export interface Context { constituent: "onset" | "rime"; position: "initial" | "medial" | "final"; stressed: boolean }
export interface Counts { total: number; counts: Record<string, number> }
export interface ReferenceModel {
  version: typeof SCORING_VERSION;
  corpus: { name: string; revision: string; sha256: string; accepted: number; excluded: Record<string, number> };
  method: {
    syllabification: "maximal-observed-initial-onset-v1";
    stress: "primary-and-secondary-stressed";
    pronunciation: "first-unlabelled-entry-per-ascii-spelling";
    onset_rime: "MLE-no-backoff-null-for-zero";
    spelling_alpha: 0.5;
    spelling_vocabulary: 27;
    log_base: "e";
  };
  initial_onsets: string[];
  constituents: Record<string, Counts>;
  characters: Record<string, Counts>;
}
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
export const keyOf = (tokens: string[]) => tokens.join(" ");
export const contextKey = (context: Context) => `${context.constituent}:${context.position}:${context.stressed ? "stressed" : "unstressed"}`;
export function contexts(index: number, count: number, stressed: boolean): Context[] {
  return [
    { constituent: "onset", position: index === 0 ? "initial" : "medial", stressed },
    { constituent: "rime", position: index === count - 1 ? "final" : "medial", stressed },
  ];
}
export const normalizeSpelling = (spelling: string): string | null => /^[a-z]+$/i.test(spelling) ? spelling.toLowerCase() : null;
function increment(table: Record<string, Counts>, context: string, token: string): void {
  const bucket = table[context] ??= { total: 0, counts: {} };
  bucket.total++;
  bucket.counts[token] = (bucket.counts[token] ?? 0) + 1;
}
function validCmuToken(token: string): boolean {
  return CONSONANTS.has(token) || (/^[A-Z]+[012]$/.test(token) && VOWELS.has(token.slice(0, -1)));
}
export function syllabify(tokens: string[], initialOnsets: ReadonlySet<string>): SoundSyllable[] {
  if (!tokens.length || tokens.some(token => !validCmuToken(token))) throw new Error("Unsupported CMU pronunciation.");
  const vowelIndices = tokens.flatMap((token, index) => /[012]$/.test(token) ? [index] : []);
  if (!vowelIndices.length) throw new Error("Pronunciation has no vowel.");
  const syllables: SoundSyllable[] = [];
  let start = 0;
  vowelIndices.forEach((vowel, index) => {
    const next = vowelIndices[index + 1];
    let boundary = tokens.length;
    if (next !== undefined) {
      boundary = next;
      for (let candidate = vowel + 1; candidate <= next; candidate++) {
        if (initialOnsets.has(keyOf(tokens.slice(candidate, next)))) { boundary = candidate; break; }
      }
    }
    syllables.push({ onset: tokens.slice(start, vowel), nucleus: [tokens[vowel].slice(0, -1)],
      coda: tokens.slice(vowel + 1, boundary), stressed: !tokens[vowel].endsWith("0") });
    start = boundary;
  });
  return syllables;
}

/** Corpus-only construction: never uses generator weights or pilot judgments. */
export function buildReference(text: string, revision: string): ReferenceModel {
  const entries = new Map<string, string[]>();
  const excluded: Record<string, number> = {};
  const exclude = (reason: string) => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";;;")) continue;
    const [label, ...tokens] = trimmed.split(/\s+#/)[0].split(/\s+/);
    if (/\(\d+\)$/.test(label)) { exclude("alternate_pronunciation"); continue; }
    const spelling = normalizeSpelling(label);
    if (!spelling) { exclude("non_ascii_spelling"); continue; }
    if (!tokens.length || tokens.some(token => !validCmuToken(token))) { exclude("unsupported_pronunciation"); continue; }
    if (!tokens.some(token => /[012]$/.test(token))) { exclude("no_vowel"); continue; }
    if (entries.has(spelling)) { exclude("duplicate_spelling"); continue; }
    entries.set(spelling, tokens);
  }
  if (!entries.size) throw new Error("Reference lexicon has no supported entries.");
  const initialOnsets = new Set([""]);
  for (const tokens of entries.values()) initialOnsets.add(keyOf(tokens.slice(0, tokens.findIndex(token => /[012]$/.test(token)))));
  const model: ReferenceModel = {
    version: SCORING_VERSION,
    corpus: { name: "CMU Pronouncing Dictionary", revision, sha256: sha256(text), accepted: entries.size, excluded },
    method: { syllabification: "maximal-observed-initial-onset-v1", stress: "primary-and-secondary-stressed",
      pronunciation: "first-unlabelled-entry-per-ascii-spelling", onset_rime: "MLE-no-backoff-null-for-zero",
      spelling_alpha: 0.5, spelling_vocabulary: 27, log_base: "e" },
    initial_onsets: [...initialOnsets].sort(), constituents: {}, characters: {},
  };
  for (const [spelling, tokens] of [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const syllables = syllabify(tokens, initialOnsets);
    syllables.forEach((syllable, index) => {
      const [onset, rime] = contexts(index, syllables.length, syllable.stressed);
      increment(model.constituents, contextKey(onset), keyOf(syllable.onset));
      increment(model.constituents, contextKey(rime), keyOf([...syllable.nucleus, ...syllable.coda]));
    });
    const characters = `^^${spelling}$`;
    for (let i = 2; i < characters.length; i++) increment(model.characters, characters.slice(i - 2, i), characters[i]);
  }
  return model;
}

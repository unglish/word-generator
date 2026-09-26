import { isDeepStrictEqual } from "node:util";
import { scoreArpabetWords, type BatchScoreResult, type ScoreStats } from "../../src/phonotactic/score.js";
import { parseCmuPhone, type SelectedCmuEntry } from "./cmu.js";
import { sha256 } from "../review/wordlikeness/model.js";

export const LEGACY_SCORER = {
  id: "legacy-arpabet-add-one-log2-v1",
  sourceSha256: "c4d5ff5bd77a4a77e63a7ab3ef610f2bb31c1981e4c4666c803e210672ac551f",
  tableSha256: "741eee7a1d331432a50c136a4801251bc8c7e3a8a3567265011fd865f203b1a7",
  alpha: 1, logBase: 2, vocabularySize: 40,
  boundaries: "one-#-start-and-one-#-end-per-entry",
  normalization: "total-log2-score/(phoneCount+1)",
  aggregate: "equal-entry-weight; sorted-sequential-binary64-sum; upper-middle-median",
  supplementalMax: "maximum-of-all-finite-row-values; not-a-legacy-ScoreStats-field",
} as const;
export const SCORE_UNITS = { total: "log2-conditional-probability-sum", perTransition: "mean-log2-per-within-word-transition",
  aggregate: "equal-selected-entry-weights" } as const;
export interface ScoreReferenceRow {
  ordinal: number; line: number; spelling: string; arpabet: string;
  phoneCount: number; transitionCount: number; total: number; perTransition: number;
}
export interface ScoreReference {
  entryDigest: string;
  accounting: { selected: number; scored: number; invalid: 0; dropped: 0 };
  phoneEvents: number; transitionEvents: number;
  rows: ScoreReferenceRow[];
  summary: { total: ScoreStats & { max: number }; perTransition: ScoreStats & { max: number } };
}

/** Use validated CMU bases directly: no IPA conversion or stress inference. */
export function scoreInputs(entries: readonly SelectedCmuEntry[]): string[] {
  if (!entries.length) throw new Error("A score reference requires a nonempty selected population.");
  const seen = new Set<string>();
  let previousLine = 0;
  return entries.map(entry => {
    if (!Number.isSafeInteger(entry.line) || entry.line <= previousLine || !/^[a-z]+$/.test(entry.spelling)
      || entry.label.toLowerCase() !== entry.spelling || seen.has(entry.spelling)) throw new Error("Invalid selected source order or identity.");
    previousLine = entry.line; seen.add(entry.spelling);
    const parsed = entry.tokens.map(parseCmuPhone);
    if (!parsed.length || parsed.some(phone => phone === null) || !isDeepStrictEqual(parsed, entry.phones)
      || !entry.phones.some(phone => phone.kind === "vowel")) throw new Error("Expected complete matching validated CMU phones.");
    return entry.phones.map(phone => phone.base).join(" ");
  });
}

/** Retain every scorer row and its exact aggregates; reject missing/nonfinite output instead of filtering. */
export function assembleScoreReference(entries: readonly SelectedCmuEntry[], batch: BatchScoreResult): ScoreReference {
  const inputs = scoreInputs(entries);
  if (!Array.isArray(batch.words) || batch.words.length !== entries.length) throw new Error("Scorer row count differs from selected inputs.");
  const rows = batch.words.map((word, ordinal) => {
    const entry = entries[ordinal], transitionCount = entry.phones.length + 1;
    if (word.arpabet !== inputs[ordinal] || !Number.isFinite(word.score) || !Number.isFinite(word.perBigram)
      || word.perBigram !== word.score / transitionCount) throw new Error("Scorer row identity, finite score or normalization mismatch.");
    return { ordinal, line: entry.line, spelling: entry.spelling, arpabet: word.arpabet,
      phoneCount: entry.phones.length, transitionCount, total: word.score, perTransition: word.perBigram };
  });
  for (const stats of [batch.total, batch.perBigram]) {
    if (!isDeepStrictEqual(Object.keys(stats).sort(), ["mean", "median", "min"]) || Object.values(stats).some(value => !Number.isFinite(value))) {
      throw new Error("Expected exact finite legacy scorer aggregate fields.");
    }
  }
  return {
    entryDigest: sha256(JSON.stringify(entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens })))),
    accounting: { selected: entries.length, scored: rows.length, invalid: 0, dropped: 0 },
    phoneEvents: rows.reduce((sum, row) => sum + row.phoneCount, 0),
    transitionEvents: rows.reduce((sum, row) => sum + row.transitionCount, 0), rows,
    summary: {
      total: { ...batch.total, max: rows.reduce((max, row) => Math.max(max, row.total), -Infinity) },
      perTransition: { ...batch.perBigram, max: rows.reduce((max, row) => Math.max(max, row.perTransition), -Infinity) },
    },
  };
}

export function scoreSelectedEntries(entries: readonly SelectedCmuEntry[]): ScoreReference {
  return assembleScoreReference(entries, scoreArpabetWords(scoreInputs(entries)));
}

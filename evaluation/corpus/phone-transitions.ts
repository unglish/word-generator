import { isDeepStrictEqual } from "node:util";
import { parseCmuPhone, type SelectedCmuEntry } from "./cmu.js";
import { sha256 } from "../review/wordlikeness/model.js";

export const TRANSITION_BOUNDARIES = {
  marker: "#", start: "one-per-selected-entry", end: "one-per-selected-entry",
  traversal: "adjacent-tokens-within-entry; no-cross-entry-pairs; no-boundary-to-boundary-pair",
} as const;
export interface TransitionTable {
  total: number;
  counts: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  vocabulary: string[];
}
export interface PhoneTransitions {
  entries: number;
  entryDigest: string;
  phoneEvents: number;
  native: TransitionTable;
  base: TransitionTable;
}

function increment(counts: TransitionTable["counts"], first: string, second: string, amount = 1): void {
  const row = counts[first] ??= {};
  row[second] = (row[second] ?? 0) + amount;
}
function table(counts: TransitionTable["counts"]): TransitionTable {
  const rowTotals = Object.fromEntries(Object.entries(counts).map(([first, row]) =>
    [first, Object.values(row).reduce((sum, value) => sum + value, 0)]));
  return { counts, rowTotals, total: Object.values(rowTotals).reduce((sum, value) => sum + value, 0),
    vocabulary: [...new Set([...Object.keys(counts), ...Object.values(counts).flatMap(Object.keys)])].sort() };
}
function baseToken(token: string): string {
  if (token === TRANSITION_BOUNDARIES.marker) return token;
  const phone = parseCmuPhone(token);
  if (!phone) throw new Error(`Unsupported source phone: ${token}`);
  return phone.base;
}

/** Count selected entries once; preserve source stress before the named base projection. */
export function countPhoneTransitions(entries: readonly SelectedCmuEntry[]): PhoneTransitions {
  const native: TransitionTable["counts"] = {}, base: TransitionTable["counts"] = {};
  let phoneEvents = 0;
  for (const entry of entries) {
    const parsed = entry.tokens.map(parseCmuPhone);
    if (!parsed.length || parsed.some(phone => phone === null) || !isDeepStrictEqual(entry.phones, parsed)) {
      throw new Error("Transition entries require nonempty, validated, matching source phones.");
    }
    phoneEvents += entry.tokens.length;
    const sequence = [TRANSITION_BOUNDARIES.marker, ...entry.tokens, TRANSITION_BOUNDARIES.marker];
    for (let index = 1; index < sequence.length; index++) increment(native, sequence[index - 1], sequence[index]);
  }
  for (const [first, row] of Object.entries(native)) {
    for (const [second, count] of Object.entries(row)) increment(base, baseToken(first), baseToken(second), count);
  }
  return {
    entries: entries.length,
    entryDigest: sha256(JSON.stringify(entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens })))),
    phoneEvents, native: table(native), base: table(base),
  };
}

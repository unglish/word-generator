import type { DrawEvidence } from "./packet.js";

type ChangeField = "spelling" | "ipa" | "projectedPhones" | "projectionEligibility" | "rootSyllables" | "selectedAttempt";

export function changedFields({ before, after }: DrawEvidence): ChangeField[] {
  const fields: ChangeField[] = [];
  for (const field of ["spelling", "ipa", "rootSyllables", "selectedAttempt"] as const) {
    if (before[field] !== after[field]) fields.push(field);
  }
  const a = before.surface, b = after.surface;
  if (a.kind === "scored" && b.kind === "scored") {
    if (a.phones.length !== b.phones.length || a.phones.some((phone, index) => phone !== b.phones[index])) fields.push("projectedPhones");
  } else if (a.kind !== b.kind || (a.kind === "ineligible" && b.kind === "ineligible" && a.reason !== b.reason)) {
    fields.push("projectionEligibility");
  }
  return fields;
}

export function countOutputChanges(rows: readonly DrawEvidence[]) {
  const counts = { draws: rows.length, any: 0, spelling: 0, ipa: 0, rootSyllables: 0, selectedAttempt: 0,
    projectedPhones: 0, comparableProjections: 0, projectionEligibility: 0 };
  for (const row of rows) {
    if (row.before.surface.kind === "scored" && row.after.surface.kind === "scored") counts.comparableProjections++;
    const changes = changedFields(row);
    if (changes.length) counts.any++;
    for (const field of changes) counts[field]++;
  }
  return counts;
}

/** Count every adjacent token in full, mutually projectable surface words, including repeats and words without percentile peers. */
export function generatedPairCounts(draws: readonly DrawEvidence[]) {
  const pairs = new Map<string, { symbols: [string, string]; before: number; after: number }>();
  const tokens = { before: 0, after: 0 };
  let comparableDraws = 0;
  function add(phones: readonly string[], side: "before" | "after") {
    for (let i = 1; i < phones.length; i++) {
      const symbols: [string, string] = [phones[i - 1], phones[i]];
      const key = JSON.stringify(symbols);
      const pair = pairs.get(key) ?? { symbols, before: 0, after: 0 };
      pair[side]++;
      tokens[side]++;
      pairs.set(key, pair);
    }
  }
  for (const { before, after } of draws) {
    if (before.surface.kind !== "scored" || after.surface.kind !== "scored") continue;
    comparableDraws++;
    add(before.surface.phones, "before");
    add(after.surface.phones, "after");
  }
  return {
    comparableDraws, excludedDraws: draws.length - comparableDraws, tokens,
    pairs: [...pairs.keys()].sort().map(key => {
      const pair = pairs.get(key)!;
      return { ...pair, delta: pair.after - pair.before,
        beforeShare: tokens.before ? pair.before / tokens.before : null,
        afterShare: tokens.after ? pair.after / tokens.after : null };
    }),
  };
}

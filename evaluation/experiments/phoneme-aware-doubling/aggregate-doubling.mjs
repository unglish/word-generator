import assert from "node:assert/strict";
import { observeDoubling } from "./observe-doubling.mjs";

const key = values => JSON.stringify(values);
function increment(target, name, amount) {
  assert(Number.isSafeInteger(amount) && amount >= 0, "Invalid count contribution");
  target[name] = (target[name] ?? 0) + amount;
  assert(Number.isSafeInteger(target[name]), "Count overflow");
}
function resolvedAffix(trace, role) {
  if (!trace) return null;
  if (trace.template === "bare") {
    assert(trace.prefix === undefined && trace.suffix === undefined && trace.realization === undefined,
      "Contradictory bare morphology trace");
    return null;
  }
  assert(trace.realization, "Morphology resolution unavailable");
  const affix = trace.realization[role];
  if (affix === undefined) return null;
  assert(affix && typeof affix === "object" && !Array.isArray(affix), "Invalid resolved affix");
  assert.equal(typeof affix.resolved?.written, "string", "Missing resolved affix spelling");
  assert(Array.isArray(affix.resolved.phonemes) && affix.resolved.phonemes.every(phone => typeof phone === "string"), "Missing resolved affix phones");
  return [affix.resolved.written, affix.resolved.phonemes];
}
export function groupKeys(row) {
  const word = row.word;
  assert.equal(typeof word.trace?.summary?.morphologyApplied, "boolean", "Morphology availability unavailable");
  assert.equal(word.trace.summary.morphologyApplied, !!word.trace.morphology, "Missing or unexpected morphology trace");
  assert(Array.isArray(word.syllables) && word.syllables.length > 0, "Missing final syllables");
  const prefix = resolvedAffix(word.trace.morphology, "prefix");
  const suffix = resolvedAffix(word.trace.morphology, "suffix");
  const shape = `${prefix ? "prefix" : "none"}/${suffix ? "suffix" : "none"}`;
  return [
    ["all"], ["profile", row.profile], ["stream", row.profile, row.seed],
    ["syllables", row.profile, word.syllables.length], ["morphology", row.profile, shape],
    ["syllables-morphology", row.profile, word.syllables.length, shape],
    ["resolved-affixes", row.profile, prefix, suffix],
  ];
}

/** Overlapping views of one fixed population; groups must not be summed together. */
export function createDoublingAggregator(ordinaryRelations) {
  const groups = new Map();
  const witnesses = new Map();
  let words = 0;
  function add(row, productionCounts = {}) {
    const observation = observeDoubling(row.word, ordinaryRelations);
    const eventCounts = Object.create(null);
    for (const event of observation.events) {
      const eventKey = key([...event.relation, event.kind, event.reason]);
      increment(eventCounts, eventKey, 1);
      if (!["sampled-success", "direct-counted"].includes(event.kind) && event.reason !== "unsupported-realization") continue;
      const witnessKey = key([row.profile, ...event.relation, event.kind, event.reason]);
      if (!witnesses.has(witnessKey)) witnesses.set(witnessKey, {
        coordinate: { profile: row.profile, seed: row.seed, drawIndex: row.drawIndex },
        unitId: event.unitId, word: structuredClone(row.word),
      });
    }
    for (const dimensions of groupKeys(row)) {
      const groupKey = key(dimensions);
      if (!groups.has(groupKey)) groups.set(groupKey, { dimensions, counts: {}, events: {}, productionReplay: {} });
      const group = groups.get(groupKey);
      for (const [name, amount] of Object.entries(observation.counts)) increment(group.counts, name, amount);
      for (const [name, amount] of Object.entries(eventCounts)) increment(group.events, name, amount);
      for (const [name, amount] of Object.entries(productionCounts)) increment(group.productionReplay, name, amount);
    }
    words++;
  }
  function finish() {
    return {
      words, groups: [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, group]) => group),
      witnesses: [...witnesses].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([category, witness]) => ({ category, ...witness })),
      limits: ["Groups overlap; each is an independently denominated view.",
        "Affix strata use resolved spelling and phones, not planned spellings or inferred grammatical categories.",
        "Production replay counters use the implementation verifier and are not an independent pronunciation proof.",
        "Root sampler events do not certify the final assembled word's reading."],
    };
  }
  return { add, finish };
}

import assert from "node:assert/strict";
import { groupKeys } from "../phoneme-aware-doubling/aggregate-doubling.mjs";
import { observeRootDoubling } from "./observe-doubling.mjs";
import { observeSharedSpellings } from "./observe-shared.mjs";

const key = values => JSON.stringify(values);
function add(counts, name, amount) {
  assert(Number.isSafeInteger(amount) && amount >= 0, "Invalid count contribution");
  counts[name] = (counts[name] ?? 0) + amount;
  assert(Number.isSafeInteger(counts[name]), "Count overflow");
}
function merge(target, source) {
  for (const [name, amount] of Object.entries(source)) add(target, name, amount);
}
const ordered = entries => [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);

/** Groups overlap; unavailable historical eligibility never becomes a zero denominator. */
export function createSharedAggregator(rules, ordinaryRelations) {
  const groups = new Map(); const witnesses = new Map(); let words = 0;
  function remember(category, row, extra) {
    if (!witnesses.has(category)) witnesses.set(category, { coordinate: {
      profile: row.profile, seed: row.seed, drawIndex: row.drawIndex }, ...extra, word: structuredClone(row.word) });
  }
  function consume(row, repairCounts) {
    assert(repairCounts && repairCounts.words === 1, "Missing per-word repair observation");
    const observation = observeSharedSpellings(row.word, rules);
    const base = row.word.trace.baseSpelling;
    const doubling = observeRootDoubling(row.word, ordinaryRelations);
    const events = Object.create(null); const selected = Object.create(null); const realized = Object.create(null);
    for (const unit of base.units) add(selected, key([base.phones[unit.phoneIds[0]].soundAtSpelling, unit.selected, unit.afterDoubling]), 1);
    for (const event of observation.events ?? []) {
      const category = key([event.ruleId, event.slot.phase, event.outcome, event.reason]);
      add(events, category, 1);
      const sourceForms = event.sourceUnitIds.map(id => [base.units[id].selected, base.units[id].afterDoubling]);
      const crossPart = new Set(event.sourceUnitIds.map(id => base.phones[id].syllableIndex)).size > 1;
      remember(key([row.profile, category, sourceForms, crossPart]), row, { attemptId: event.attemptId, sourceForms, crossPart });
    }
    for (const record of base.version === 4 ? base.shared.constructions : []) {
      add(realized, key([record.attempt.ruleId, record.reading.sounds, record.after]), 1);
    }
    for (const name of ["unsupportedFormedSequences", "partialSourceConsumptions", "phoneMultiplicityViolations",
      "unsupportedInputOwnership", "silentlyDamagedConstructions"]) {
      if (observation.counts?.[name]) remember(key([row.profile, "violation", name]), row, { violation: name });
    }
    const dimensions = [...groupKeys(row), ["written-length", row.profile, row.word.written.clean.length],
      ["root-phone-length", row.profile, base.phones.length]];
    for (const dimension of dimensions) {
      const id = key(dimension);
      if (!groups.has(id)) groups.set(id, { dimensions: structuredClone(dimension), words: 0, availableWords: 0, unavailableWords: 0,
        sharedCounts: {}, ruleCounts: new Map(), events: {}, selectedForms: {}, realizedForms: {}, historicalRegexEdits: {}, repairReplay: {}, doublingCounts: {} });
      const group = groups.get(id); group.words++;
      if (observation.availability === "available") {
        group.availableWords++; merge(group.sharedCounts, observation.counts);
        for (const rule of observation.rules) {
          if (!group.ruleCounts.has(rule.id)) group.ruleCounts.set(rule.id, {});
          merge(group.ruleCounts.get(rule.id), rule.counts);
        }
      } else group.unavailableWords++;
      merge(group.events, events); merge(group.selectedForms, selected); merge(group.realizedForms, realized);
      merge(group.historicalRegexEdits, observation.historicalRegexEdits); merge(group.repairReplay, repairCounts);
      merge(group.doublingCounts, doubling.counts);
    }
    words++;
  }
  function finish() {
    return { version: 1, words, groups: ordered(groups).map(([, group]) => {
      const { ruleCounts, availableWords, unavailableWords, ...values } = group;
      return { ...structuredClone(values), sharedCounts: availableWords ? structuredClone(group.sharedCounts) : null,
        rules: availableWords ? ordered(ruleCounts).map(([id, counts]) => ({ id, counts: { ...counts } })) : null,
        sharedAvailability: { status: unavailableWords ? (availableWords ? "partial" : "unavailable") : "available",
          availableWords, unavailableWords } };
    }), witnesses: ordered(witnesses).map(([category, witness]) => ({ category, ...structuredClone(witness) })),
    limits: ["Groups overlap; do not sum different grouping dimensions.",
      "Selected forms describe original sampler outcomes, not final pronunciations.",
      "Historical regex edit counts do not establish historical eligibility.",
      "Repair replay uses the implementation verifier; independent recount remains separate.",
      "Shared reading ownership is root-level; final morphology remains separately unresolved."] };
  }
  return { add: consume, finish };
}

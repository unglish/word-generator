import assert from "node:assert/strict";
import { createRootStressLaw } from "../../../src/index.ts";
import { digest } from "../../quality/serialization.ts";

const U = "unmarked", P = "primary", S = "secondary";
export function patternKey(marks) {
  assert(Array.isArray(marks) && marks.every(mark => mark === U || mark === P || mark === S), "Invalid mark encoding");
  return marks.map(mark => ({ [U]: "U", [P]: "P", [S]: "S" }[mark])).join("");
}
const adjacent = marks => marks.slice(1).filter((mark, index) => mark !== U && marks[index] !== U).length;
const sum = values => values.reduce((total, value) => total + value, 0);
function patterns(n, primary, count) {
  const rows = [];
  function visit(index, remaining, marks) {
    if (index === n) { if (remaining === 0) rows.push(marks); return; }
    if (index === primary) { visit(index + 1, remaining, [...marks, P]); return; }
    visit(index + 1, remaining, [...marks, U]);
    if (remaining > 0) visit(index + 1, remaining - 1, [...marks, S]);
  }
  visit(0, count, []); return rows;
}
/** All well-formed same-primary patterns at K, including exact zero-support rows. */
export function mechanismAtCount(input, secondaryCount) {
  assert(Number.isSafeInteger(secondaryCount) && secondaryCount >= 0 && secondaryCount < input.beforePrimary.length);
  assert(input.beforePrimary.length >= 1 && input.beforePrimary.length <= 9);
  const legacy = createRootStressLaw({ ...input, lambda: 0 }); const active = createRootStressLaw(input);
  const original = legacy.analyzeCount(secondaryCount); const tilted = active.analyzeCount(secondaryCount);
  assert.equal(original.logPartition.status, "finite"); assert.equal(tilted.logPartition.status, "finite");
  const primary = input.afterPrimary.indexOf(P);
  const rows = patterns(input.afterPrimary.length, primary, secondaryCount).map(marks => {
    const observed = active.analyzePattern(marks);
    return { marks, prior: observed.priorLogMass, tilted: observed.tiltedLogMass, adjacentMarkedPairs: observed.adjacentMarkedPairs,
      before: observed.priorLogMass.status === "zero" ? 0 : Math.exp(observed.priorLogMass.value - original.logPartition.value),
      after: observed.tiltedLogMass.status === "zero" ? 0 : Math.exp(observed.tiltedLogMass.value - tilted.logPartition.value) };
  });
  const normalization = { before: sum(rows.map(row => row.before)), after: sum(rows.map(row => row.after)) };
  for (const total of Object.values(normalization)) assert(Math.abs(total - 1) <= 2e-12, "Conditional normalization differs");
  const costs = new Set(rows.filter(row => row.prior.status === "finite").map(row => row.adjacentMarkedPairs));
  const expectation = { before: sum(rows.map(row => row.before * row.adjacentMarkedPairs)), after: sum(rows.map(row => row.after * row.adjacentMarkedPairs)),
    supportCostVaries: costs.size > 1, strictDecreaseExpected: input.lambda > 0 && costs.size > 1, minimumSupportedAdjacencies: Math.min(...costs) };
  assert(expectation.after <= expectation.before + 1e-12, "Numerical expectation increased beyond registered tolerance");
  return { input: structuredClone(input), secondaryCount, originalLogPartition: original.logPartition.value, tiltedLogPartition: tilted.logPartition.value,
    normalization, expectation, rows };
}
export class MechanismRegistry {
  #contexts = new Map();
  observe(input, secondaryCount, proposalMarks, appliedMarks) {
    const key = digest({ input, secondaryCount }); let context = this.#contexts.get(key);
    if (!context) { context = { id: key, analysis: mechanismAtCount(input, secondaryCount), observedWords: 0, proposalPatterns: {}, appliedPatterns: {} }; this.#contexts.set(key, context); }
    const updates = [["proposalPatterns", proposalMarks], ["appliedPatterns", appliedMarks]];
    for (const [field, marks] of updates) {
      const row = context.analysis.rows.find(row => patternKey(row.marks) === patternKey(marks));
      assert(row && row.prior.status === "finite", `Observed ${field} pattern has no declared support`);
    }
    for (const [field, marks] of updates) {
      const pattern = patternKey(marks); context[field][pattern] = (context[field][pattern] ?? 0) + 1;
    }
    context.observedWords++;
    return { id: key, supportCostVaries: context.analysis.expectation.supportCostVaries, proposalAdjacencies: adjacent(proposalMarks), appliedAdjacencies: adjacent(appliedMarks),
      proposalPattern: patternKey(proposalMarks), appliedPattern: patternKey(appliedMarks) };
  }
  snapshot() { return structuredClone([...this.#contexts.values()].sort((a, b) => a.id.localeCompare(b.id, "en"))); }
}

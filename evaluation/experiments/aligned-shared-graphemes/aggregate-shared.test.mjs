import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
import { englishSharedSpellings } from "../../../src/elements/graphemes/shared.ts";
import { createSharedRepairObserver } from "./observe-repairs.ts";
import { observeSharedSpellings } from "./observe-shared.mjs";
import { createSharedAggregator } from "./aggregate-shared.mjs";
const { ordinaryRelations } = JSON.parse(readFileSync(new URL("../phoneme-aware-doubling/protocol.json", import.meta.url)));
const legacyConfig = { ...englishConfig, sharedSpellings: undefined };
const legacyGenerator = createGenerator(legacyConfig);
const config = { ...englishConfig, sharedSpellings: englishSharedSpellings };
const generator = createGenerator(config); const rand = createSeededRng(129);
let sample;
for (let drawIndex = 0; drawIndex < 500; drawIndex++) {
  const word = generator.generateWord({ rand, trace: true });
  if (word.trace.baseSpelling.shared.constructions.length) { sample = { profile: "fixture", seed: 129, drawIndex, word }; break; }
}
assert(sample, "Missing public formation witness");
const observeRepairs = createSharedRepairObserver(config);
const all = report => report.groups.find(group => group.dimensions[0] === "all");

test("aggregates complete events, repairs, selected/shared forms and retained full witnesses", () => {
  const aggregator = createSharedAggregator(englishSharedSpellings, ordinaryRelations);
  const repairs = observeRepairs(sample); aggregator.add(sample, repairs); aggregator.add({ ...sample, drawIndex: sample.drawIndex + 1 }, repairs);
  const report = aggregator.finish(); const group = all(report); const single = observeSharedSpellings(sample.word, englishSharedSpellings);
  assert.equal(report.words, 2); assert.equal(group.words, 2); assert.equal(group.sharedCounts.constructions, 2 * single.counts.constructions);
  assert.equal(Object.values(group.events).reduce((a, b) => a + b, 0), 2 * single.events.length);
  assert.equal(Object.values(group.selectedForms).reduce((a, b) => a + b, 0), 2 * sample.word.trace.baseSpelling.units.length);
  assert.equal(group.repairReplay.words, 2);
  assert.equal(group.doublingCounts.words, 2);
  assert.equal(group.doublingCounts.units, 2 * sample.word.trace.baseSpelling.units.length);
  assert(report.groups.some(group => group.dimensions[0] === "resolved-affixes"));
  assert(report.groups.some(group => group.dimensions[0] === "written-length"));
  assert(report.groups.some(group => group.dimensions[0] === "root-phone-length"));
  assert(report.witnesses.length > 0);
  for (const witness of report.witnesses) {
    assert.equal(witness.coordinate.drawIndex, sample.drawIndex);
    assert.deepEqual(witness.word, sample.word);
  }
});
test("historical populations have null shared counts rather than clean zeros", () => {
  const aggregator = createSharedAggregator(englishSharedSpellings, ordinaryRelations);
  const row = { profile: "legacy", seed: 129, drawIndex: 0, word: legacyGenerator.generateWord({ seed: 129, trace: true }) };
  aggregator.add(row, createSharedRepairObserver(legacyConfig)(row));
  const group = all(aggregator.finish());
  assert.equal(group.sharedCounts, null); assert.equal(group.rules, null);
  assert.deepEqual(group.sharedAvailability, { status: "unavailable", availableWords: 0, unavailableWords: 1 });
});
test("mixed observations retain unavailable population counts", () => {
  const aggregator = createSharedAggregator(englishSharedSpellings, ordinaryRelations);
  const row = { ...sample, word: legacyGenerator.generateWord({ seed: 129, trace: true }) };
  aggregator.add(row, createSharedRepairObserver(legacyConfig)(row)); aggregator.add(sample, observeRepairs(sample));
  assert.deepEqual(all(aggregator.finish()).sharedAvailability, { status: "partial", availableWords: 1, unavailableWords: 1 });
});
test("returned reports and caller mutations cannot change retained witnesses or accumulated counters", () => {
  const aggregator = createSharedAggregator(englishSharedSpellings, ordinaryRelations); const row = structuredClone(sample);
  aggregator.add(row, observeRepairs(row)); const before = aggregator.finish();
  row.word.written.clean = "caller mutation";
  const returned = aggregator.finish(); all(returned).sharedCounts.constructions = -1; returned.witnesses[0].word.written.clean = "mutated";
  assert.deepEqual(aggregator.finish(), before);
});

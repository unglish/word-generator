import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createDoublingAggregator, groupKeys } from "./aggregate-doubling.mjs";
import { observeDoubling } from "./observe-doubling.mjs";
const inventory = JSON.parse(gunzipSync(readFileSync(new URL("./exploration/inventory.json.gz", import.meta.url))));
const { ordinaryRelations } = JSON.parse(readFileSync(new URL("./protocol.json", import.meta.url)));
const sample = inventory.firstWitnessPerSuccessfulOrDirectRelation.find(w => w.key[0] === "s" && w.key[1] === "c");
const row = { ...sample.coordinate, word: sample.word };
test("aggregates every event with explicit word denominators and retains the first full witness", () => {
  const aggregator = createDoublingAggregator(ordinaryRelations);
  aggregator.add(row, { verified: 1 }); aggregator.add({ ...row, drawIndex: row.drawIndex + 1 }, { verified: 1 });
  const report = aggregator.finish(); const all = report.groups.find(g => g.dimensions[0] === "all");
  assert.equal(report.words, 2); assert.equal(all.counts.words, 2);
  assert.equal(all.counts.units, 2 * observeDoubling(row.word, ordinaryRelations).counts.units);
  assert.equal(all.counts.sToCkExpansions, 2); assert.equal(all.counts.wordsWithSToCkExpansion, 2);
  assert.equal(all.productionReplay.verified, 2);
  assert.equal(Object.values(all.events).reduce((a, b) => a + b, 0), all.counts.units);
  assert(report.witnesses.every(w => w.coordinate.drawIndex === row.drawIndex));
  assert(report.witnesses.every(w => JSON.stringify(w.word) === JSON.stringify(row.word)));
});
test("splits profile and stream populations without multiplying the global denominator", () => {
  const aggregator = createDoublingAggregator(ordinaryRelations);
  aggregator.add(row); aggregator.add({ ...row, profile: "another-profile", seed: 1 });
  const report = aggregator.finish();
  assert.equal(report.groups.find(g => g.dimensions[0] === "all").counts.words, 2);
  assert(report.groups.filter(g => g.dimensions[0] === "profile").every(g => g.counts.words === 1));
  assert.equal(report.groups.filter(g => g.dimensions[0] === "stream").length, 2);
});
test("uses resolved allomorph identity rather than the plan", () => {
  const altered = structuredClone(row);
  altered.word.trace.morphology = { template: "prefixed", prefix: "in", realization: {
    prefix: { planned: { written: "in" }, resolved: { written: "im", phonemes: ["ɪ", "m"] } },
  } };
  assert.deepEqual(groupKeys(altered).find(g => g[0] === "resolved-affixes"),
    ["resolved-affixes", row.profile, ["im", ["ɪ", "m"]], null]);
});
test("does not silently classify missing morphology resolution as bare", () => {
  const altered = structuredClone(row); altered.word.trace.morphology = { template: "suffixed", suffix: "ed" };
  assert.throws(() => groupKeys(altered), /resolution unavailable/);
});
test("rejects noninteger production counts instead of silently rounding", () => {
  assert.throws(() => createDoublingAggregator(ordinaryRelations).add(row, { verified: 0.5 }), /Invalid count/);
});

test("rejects omitted applied morphology rather than counting a bare word", () => {
  const altered = structuredClone(row); altered.word.trace.summary.morphologyApplied = true;
  delete altered.word.trace.morphology;
  assert.throws(() => groupKeys(altered), /morphology trace/);
});

test("bare-template exemption rejects contradictory affix evidence", () => {
  const altered = structuredClone(row);
  altered.word.trace.morphology = { template: "bare", prefix: "in" };
  assert.throws(() => groupKeys(altered), /Contradictory bare/);
});

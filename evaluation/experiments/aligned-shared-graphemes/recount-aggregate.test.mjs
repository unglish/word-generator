import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
import { englishSharedSpellings } from "../../../src/elements/graphemes/shared.ts";
import { createSharedRepairObserver } from "./observe-repairs.ts";
import { createSharedAggregator } from "./aggregate-shared.mjs";

const script = fileURLToPath(new URL("./recount-aggregate.py", import.meta.url));
const { ordinaryRelations } = JSON.parse(readFileSync(new URL("../phoneme-aware-doubling/protocol.json", import.meta.url)));
const rules = englishSharedSpellings;
const rows = []; const aggregator = createSharedAggregator(rules, ordinaryRelations);
for (const active of [true, false]) {
  const config = { ...englishConfig, sharedSpellings: active ? rules : undefined };
  const generator = createGenerator(config); const rand = createSeededRng(129);
  const repairs = createSharedRepairObserver(config);
  for (let drawIndex = 0; drawIndex < 500; drawIndex++) {
    const row = { profile: active ? "active" : "legacy", seed: 129, drawIndex,
      word: generator.generateWord({ rand, trace: true, morphology: drawIndex % 2 === 0,
        mode: drawIndex % 3 ? "text" : "lexicon" }) };
    rows.push(row); aggregator.add(row, repairs(row));
  }
}
const report = JSON.parse(JSON.stringify(aggregator.finish()));
assert(report.witnesses.length > 0);
function compare(candidate) {
  return spawnSync("python3", [script], { input: JSON.stringify({ rows, rules, ordinaryRelations, report: candidate }),
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
test("independent recount matches every grouped integer and complete first witness on 1000 public words", () => {
  const result = compare(report);
  assert.equal(result.status, 0, result.stderr);
  const checked = JSON.parse(result.stdout);
  assert.equal(checked.words, 1000);
  assert.equal(checked.groups, report.groups.length);
  assert.equal(checked.fullWitnesses, report.witnesses.length);
  assert(checked.integerComparisons > 1000);
});
const all = candidate => candidate.groups.find(group => group.dimensions[0] === "all");
for (const [name, mutate] of [
  ["repair counter", candidate => { all(candidate).repairReplay.units++; }],
  ["doubling counter", candidate => { all(candidate).doublingCounts.skipped++; }],
  ["shared counter", candidate => { all(candidate).sharedCounts.constructions++; }],
  ["boolean count", candidate => { all(candidate).sharedCounts.words = true; }],
  ["missing group", candidate => { candidate.groups.pop(); }],
  ["extra counter", candidate => { all(candidate).repairReplay.unregistered = 0; }],
  ["missing witness", candidate => { candidate.witnesses.pop(); }],
  ["altered full witness", candidate => { candidate.witnesses[0].word.written.clean += "x"; }],
  ["unknown eligibility changed to zero", candidate => {
    const legacy = candidate.groups.find(group => group.sharedAvailability.status === "unavailable");
    assert(legacy); legacy.sharedCounts = {};
  }],
]) {
  test(`independent aggregate comparison rejects ${name}`, () => {
    const candidate = structuredClone(report); mutate(candidate);
    const result = compare(candidate);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  });
}

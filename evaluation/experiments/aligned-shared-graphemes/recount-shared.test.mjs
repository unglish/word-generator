import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
import { englishSharedSpellings } from "../../../src/elements/graphemes/shared.ts";
import { createSharedRepairObserver } from "./observe-repairs.ts";
import { observeSharedSpellings } from "./observe-shared.mjs";

const script = fileURLToPath(new URL("./recount-shared.py", import.meta.url));
const rules = englishSharedSpellings;
const active = createGenerator({ ...englishConfig, sharedSpellings: rules });
const legacy = createGenerator({ ...englishConfig, sharedSpellings: undefined });
const rng = createSeededRng(129);
const words = Array.from({ length: 500 }, (_, draw) => active.generateWord({ rand: rng, trace: true,
  morphology: draw % 2 === 0, mode: draw % 3 ? "text" : "lexicon" }));
const witness = words.find(word => word.trace.baseSpelling.shared.constructions.length);
assert(witness);
function recount(inputs) {
  return spawnSync("python3", [script], { input: inputs.map(word => JSON.stringify({ word, rules })).join("\n") + "\n",
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
function compare(inputs) {
  const result = recount(inputs);
  assert.equal(result.status, 0, result.stderr);
  const actual = result.stdout.trim().split("\n").map(line => JSON.parse(line));
  assert.deepEqual(actual, inputs.map(word => observeSharedSpellings(word, rules)));
  return actual;
}
test("independent Python reconstructs every shared observation on 500 public v4 and 500 v3 archives", () => {
  const rand = createSeededRng(129);
  const historical = Array.from({ length: 500 }, () => legacy.generateWord({ rand, trace: true }));
  const result = compare([...words, ...historical]);
  assert(result.slice(0, 500).reduce((n, entry) => n + entry.counts.constructions, 0) > 0);
  for (const entry of result.slice(500)) {
    assert.equal(entry.availability, "unavailable");
    assert.equal(entry.counts, null);
  }
});
for (const [name, change, counter] of [
  ["unsupported sequence", base => { base.phones[base.shared.constructions[0].phoneIds[0]].soundAtSpelling = "unsupported"; }, "unsupportedFormedSequences"],
  ["partial consumption", base => { base.shared.constructions[0].inputCellIds.pop(); }, "partialSourceConsumptions"],
  ["phone multiplicity", base => { base.shared.constructions[0].phoneIds.reverse(); }, "phoneMultiplicityViolations"],
  ["silent erasure", base => {
    const start = base.cells.findIndex(cell => cell.origin.kind === "shared");
    assert(start >= 0);
    const [cell] = base.cells.splice(start, 1);
    base.edits.push({ id: Math.max(...base.edits.map(edit => edit.id)) + 1, phase: "word", rule: "forged-erasure", start,
      input: [cell], output: [], before: cell.text, after: "", partId: cell.partId });
    base.surface = base.cells.map(cell => cell.text).join("");
  }, "silentlyDamagedConstructions"],
]) {
  test(`independent Python reports ${name} from altered archive`, () => {
    const word = structuredClone(witness); change(word.trace.baseSpelling);
    assert.equal(compare([word])[0].counts[counter], 1);
  });
}
test("independent Python refuses incomplete attempts, fields, and forged cell history", () => {
  for (const change of [base => { base.shared.attempts.pop(); }, base => { delete base.shared.scans; },
    base => { base.cells[0].text = "forged"; }, base => { base.units[0].id = false; }]) {
    const word = structuredClone(witness); change(word.trace.baseSpelling);
    const result = recount([word]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});
test("independent Python refuses optimized execution that would disable verification", () => {
  const result = spawnSync("python3", ["-O", script], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Assertions must be enabled/);
});

const repairScript = fileURLToPath(new URL("./recount-repairs.py", import.meta.url));
function recountRepairs(inputs) {
  return spawnSync("python3", [repairScript], { input: inputs.map(word => JSON.stringify({ word })).join("\n") + "\n",
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
test("independent repair arithmetic matches every counter on 500 active and 500 legacy public words", () => {
  const rand = createSeededRng(129);
  const historical = Array.from({ length: 500 }, () => legacy.generateWord({ rand, trace: true }));
  const currentObserver = createSharedRepairObserver({ ...englishConfig, sharedSpellings: rules });
  const oldObserver = createSharedRepairObserver({ ...englishConfig, sharedSpellings: undefined });
  const result = recountRepairs([...words, ...historical]);
  assert.equal(result.status, 0, result.stderr);
  const actual = result.stdout.trim().split("\n").map(line => JSON.parse(line));
  assert.deepEqual(actual, [...words.map(word => currentObserver({ word })), ...historical.map(word => oldObserver({ word }))]);
});
test("repair recount rejects forged normalization totals and incomplete scheduled checks", () => {
  for (const change of [base => { base.normalization.comparisons["adjacent-choice"]++; },
    base => { base.normalization.collisions["syllable-join"]++; },
    base => { base.normalization.checks.pop(); },
    base => { base.normalization.comparisons["adjacent-choice"] = true; }]) {
    const word = structuredClone(witness); change(word.trace.baseSpelling);
    const result = recountRepairs([word]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});

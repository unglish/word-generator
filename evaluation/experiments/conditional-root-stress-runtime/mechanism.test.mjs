import assert from "node:assert/strict";
import test from "node:test";
import { MechanismRegistry, mechanismAtCount } from "./mechanism.mjs";
const input = { beforePrimary: ["unmarked", "unmarked", "unmarked"], afterPrimary: ["primary", "unmarked", "unmarked"], operationalHeavy: [false, false, false],
  secondary: { enabled: true, candidateWindow: "all-nonprimary", probability: 100, heavyWeight: 1, lightWeight: 1 },
  rhythmic: { enabled: false, probability: 50, requireUnstressedNeighbors: false }, lambda: Math.log(2) };
test("hand two-pattern law has one-half prior clash and one-third tilted clash", () => {
  const result = mechanismAtCount(input, 1);
  assert.equal(result.rows.length, 2); assert(Math.abs(result.expectation.before - 1 / 2) < 1e-15); assert(Math.abs(result.expectation.after - 1 / 3) < 1e-15);
  assert.equal(result.expectation.strictDecreaseExpected, true);
});
test("all zero candidate weights retain the unsupported pattern as an exact zero row", () => {
  const result = mechanismAtCount({ ...input, secondary: { ...input.secondary, heavyWeight: 0, lightWeight: 0 } }, 1);
  assert.equal(result.rows.length, 2); assert.equal(result.rows.filter(row => row.prior.status === "zero").length, 1);
  assert.equal(result.expectation.strictDecreaseExpected, false); assert.equal(result.expectation.before, 0);
});
test("well-formed absent K is an error and no input is silently truncated", () => {
  assert.throws(() => mechanismAtCount(input, 0), /finite/);
  assert.throws(() => mechanismAtCount({ ...input, beforePrimary: Array(10).fill("unmarked") }, 1));
});
test("registry sums repeated contexts but detaches input/results and rejects unsupported actual marks", () => {
  const registry = new MechanismRegistry(); const source = structuredClone(input);
  const first = ["primary", "secondary", "unmarked"], second = ["primary", "unmarked", "secondary"];
  registry.observe(source, 1, first, second); registry.observe(source, 1, first, first);
  source.secondary.lightWeight = 100; first[1] = "unmarked";
  const saved = registry.snapshot(); assert.equal(saved.length, 1); assert.equal(saved[0].observedWords, 2);
  assert.deepStrictEqual(saved[0].proposalPatterns, { PSU: 2 });
  saved[0].analysis.input.secondary.lightWeight = 200;
  assert.equal(registry.snapshot()[0].analysis.input.secondary.lightWeight, 1);
  assert.throws(() => registry.observe(input, 1, ["primary", "unmarked", "unmarked"], second), /no declared support/);
  assert.throws(() => registry.observe(input, 1, ["primary", "invalid", "unmarked", "secondary"], second), /Invalid mark encoding/);
});

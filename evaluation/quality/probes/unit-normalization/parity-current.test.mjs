import assert from "node:assert/strict";
import { test } from "node:test";
import * as api from "../../../../src/index.ts";
import { assertSameLive, mutationChecks, observedRng } from "./parity-current.mjs";

test("live comparison preserves undefined properties and property descriptors", () => {
  assertSameLive({ a: undefined, b: { c: 2 } }, { a: undefined, b: { c: 2 } });
  assert.throws(() => assertSameLive({}, { a: undefined }));
  const left = { a: 1 }; const right = { a: 1 }; Object.defineProperty(left, "hidden", { value: 2 });
  assert.throws(() => assertSameLive(left, right));
  const writable = {}; const fixed = {};
  Object.defineProperty(writable, "a", { value: 1, writable: true }); Object.defineProperty(fixed, "a", { value: 1, writable: false });
  assert.throws(() => assertSameLive(writable, fixed));
});
test("live comparison rejects reordered own keys and nested trace corruption", () => {
  assert.throws(() => assertSameLive({ a: 1, b: 2 }, { b: 2, a: 1 }));
  assert.throws(() => assertSameLive({ trace: { stages: [{ name: "changed" }] } }, { trace: { stages: [{ name: "original" }] } }));
});
test("buffered next-value observations do not alter the public seeded sequence or logical draw count", () => {
  const actual = observedRng(api.createSeededRng(137)); const expected = api.createSeededRng(137);
  for (let index = 0; index < 100; index++) {
    const next = expected(); const before = actual.snapshot();
    assert.equal(before.calls, index); assert.equal(before.next, next); assert.equal(before.sourceCalls, index + 1);
    assert.deepStrictEqual(actual.snapshot(), before); assert.equal(actual.rand(), next);
    assert.equal(actual.snapshot().calls, index + 1);
  }
});
test("interleaved snapshots retain exact consumed-byte hashes", () => {
  const left = observedRng(api.createSeededRng(13)); const right = observedRng(api.createSeededRng(13));
  for (let index = 0; index < 100; index++) { left.snapshot(); assert.equal(left.rand(), right.rand()); if (index % 3 === 0) left.snapshot(); }
  assert.deepStrictEqual(left.snapshot(), right.snapshot());
});
test("public candidate trace-on/off smoke retains all ordinary output and RNG fields for both policies", () => {
  for (const active of [false, true]) {
    const config = structuredClone(api.englishConfig); if (!active) delete config.writtenFormConstraints.policy;
    const generator = api.createGenerator(config); const left = observedRng(api.createSeededRng(4099)); const right = observedRng(api.createSeededRng(4099));
    for (let index = 0; index < 3; index++) {
      const traced = generator.generateWord({ rand: left.rand, trace: true, morphology: false });
      const plain = generator.generateWord({ rand: right.rand, trace: false, morphology: false });
      const projected = { ...traced }; delete projected.trace;
      assertSameLive(plain, projected); assert.deepStrictEqual(left.snapshot(), right.snapshot());
    }
  }
});
test("supplemental mutation smoke counts eight public calls separately", () => {
  let calls = 0; const result = mutationChecks(api, api, () => { calls++; }); assert.equal(calls, 8);
  assert.equal(result.compatibilityPassed, true);
  assert.equal(result.returnedValueIsolation, false);
  assert.equal(result.afterReturnedMutation[0].status, "threw");
  assert.match(result.afterReturnedMutation[0].error.message, /mutated/);
  assert.equal(result.afterConfigurationMutation[0].status, "returned");
});

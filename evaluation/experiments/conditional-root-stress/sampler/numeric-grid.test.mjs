import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildNumericTree, captureCase, checkNumericExecution, sampleRow } from "./numeric-grid.mjs";

const hand = JSON.parse(await readFile(new URL("fixtures/hand-samples.json", import.meta.url)));
const GRID = 2 ** 32;
function toyLaw(probability) {
  return { sample(_count, rand) {
    const uniform = rand();
    return { componentDraws: [{ candidateIndex: 0, remainingFromIndex: 1, logCandidateMass: Math.log(probability),
      logRemainingMass: Math.log1p(-probability), uniform, drawOrdinal: 0, takeCandidate: uniform < probability }], backward: [] };
  } };
}

test("same-Node numeric predicate accepts hand witnesses and rejects coherent wrong branch", () => {
  for (const name of ["duplicate", "backward"]) assert.doesNotThrow(() => checkNumericExecution(hand[name].sample, hand.row, hand[name].consumed));
  assert.throws(() => checkNumericExecution(hand.coherentWrongNumericBranch.sample, hand.row, 2), /numeric execution/);
});

test("complete binary search retains neighboring and endpoint evidence on a synthetic law", () => {
  const result = buildNumericTree(toyLaw(0.25), 0);
  const root = result.nodes[0];
  assert.equal(result.nodes.length, 3);
  assert.equal(root.boundary, GRID / 4);
  const probes = new Set(root.probes.map(probe => probe.uint32));
  for (const required of [0, GRID - 1, GRID / 4 - 1, GRID / 4, GRID / 2, 3 * GRID / 4]) assert(probes.has(required));
  assert.equal(result.apiCalls, root.probes.length + 2);
  assert.deepEqual(result.nodes[root.first].prefix, [0]);
  assert.deepEqual(result.nodes[root.second].prefix, [GRID / 4]);
});

test("rare first branch retains the zero grid atom", () => {
  assert.equal(buildNumericTree(toyLaw(1e-100), 0).nodes[0].boundary, 1);
});

test("deterministic zero-draw synthetic sampler has exactly one leaf call", () => {
  const result = buildNumericTree({ sample: () => ({ componentDraws: [], backward: [] }) }, 0);
  assert.equal(result.apiCalls, 1); assert.equal(result.nodes[0].kind, "leaf");
});

test("row bounds and fabricated draw metadata fail", () => {
  assert.throws(() => sampleRow(toyLaw(0.5), 0, Array(15).fill(-1)));
  assert.throws(() => sampleRow({ sample: (_k, rand) => { for (let i = 0; i < 16; i++) rand(); } }, 0, Array(15).fill(0)), /exceeded/);
  const wrong = structuredClone(hand.duplicate.sample); wrong.componentDraws[0].drawOrdinal = 2;
  assert.throws(() => checkNumericExecution(wrong, hand.row, 1));
  wrong.componentDraws[0].drawOrdinal = 0; wrong.componentDraws[0].uniform = 0.25;
  assert.throws(() => checkNumericExecution(wrong, hand.row, 1));
});

test("synthetic detached checks reject aliased inputs or returned structures", () => {
  const protocol = { defaults: { heavyMask: "all", secondaryEnabled: false, rhythmicEnabled: false, weights: [1, 1],
    secondaryPercent: 0, rhythmicPercent: 0, window: "first-three", neighbors: true },
  transcriptRows: { constantUint32: [0, GRID / 4, GRID / 2, 3 * GRID / 4, GRID - 1], alternatingUint32: [0, GRID - 1] } };
  const caseSpec = { id: "synthetic-detachment", n: 2, primary: 0, K: 0 };
  const empty = input => ({ marks: input.afterPrimary, count: { components: [] }, backward: [], componentDraws: [], work: { allocatedCells: 0 } });
  const detached = input => { const captured = structuredClone(input); return { sample: () => structuredClone(empty(captured)) }; };
  const result = captureCase(detached, protocol, caseSpec);
  assert.deepEqual(result.apiCalls, { fixedIncludingReplay: 12, inputMutation: 2, tree: 1 });
  assert.throws(() => captureCase(input => ({ sample: () => empty(input) }), protocol, caseSpec));
  assert.throws(() => captureCase(input => { const shared = empty(structuredClone(input)); return { sample: () => shared }; }, protocol, caseSpec));
});

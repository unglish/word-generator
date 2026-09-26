import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { makeTape } from "./create-tape.mjs";
import { captureRecords } from "./capture-frequency.mjs";
import { allMasks, checkAcceptedReference, checkTape, sampleMask, schedule, tapeRow, witnessKeys } from "./frequency-common.mjs";

// Synthetic only: neither the registered cases nor the production law are executed.
const protocol = {
  defaults: { secondaryEnabled: false, rhythmicEnabled: false, secondaryPercent: 0, rhythmicPercent: 0,
    weights: [1, 1], heavyMask: "all", window: "first-three", neighbors: true },
  cases: [{ id: "synthetic-left", n: 2, primary: 0, K: 0 }, { id: "synthetic-right", n: 2, primary: 1, K: 0 }],
  tapes: { blocksPerCase: 2, rowsPerBlock: 3, uint32PerRow: 15, bytes: 720 }, samplerCalls: 12,
};
const bindings = { sourceFreezeSha256: "a".repeat(64), protocolSha256: "b".repeat(64), referenceSha256: "c".repeat(64),
  engine: { node: "synthetic", versions: {}, platform: "test", architecture: "test", executableSha256: "d".repeat(64) } };
const fill = bytes => { for (let i = 0; i < bytes.length / 4; i++) bytes.writeUInt32LE(i, i * 4); };

test("synthetic tape has exact little-endian rows, block hashes and no cell reassignment", () => {
  const { bytes, manifest } = makeTape(protocol, bindings, fill);
  checkTape(protocol, bytes, manifest, bindings);
  assert.deepEqual(schedule(protocol).map(value => value.byteOffset), [0, 180, 360, 540]);
  assert.deepEqual(tapeRow(bytes, manifest.segments[1], 2, 15), Array.from({ length: 15 }, (_, i) => i + 75));
  assert.equal(manifest.byteLength, 720);
  assert.equal(manifest.primaryFrequencyDraws, 12);
  assert.throws(() => tapeRow(bytes, manifest.segments[0], 3, 15));
});

test("synthetic tape corruption, reordered/duplicate schedules, aliases and source substitutions fail", () => {
  const { bytes, manifest } = makeTape(protocol, bindings, fill);
  const corrupt = Buffer.from(bytes); corrupt[0] ^= 1;
  assert.throws(() => checkTape(protocol, corrupt, manifest, bindings));
  for (const mutate of [value => value.segments.reverse(), value => value.segments.push(value.segments[0]),
    value => { value.segments[0].rows = true; }, value => { value.engine.executableSha256 = "e".repeat(64); },
    value => { value.sourceFreezeSha256 = "f".repeat(64); }, value => { value.extra = true; }]) {
    const changed = structuredClone(manifest); mutate(changed);
    assert.throws(() => checkTape(protocol, bytes, changed, bindings));
  }
  assert.throws(() => checkTape(protocol, bytes.subarray(0, -1), manifest, bindings));
});

test("accepted-reference prerequisite rejects failures, mismatched engine/source and case order", () => {
  const accepted = { version: "q09-independent-sampler-reference-v1", passed: true, sourceFreezeSha256: bindings.sourceFreezeSha256,
    protocolSha256: bindings.protocolSha256, primaryFrequencyDraws: 0, engine: bindings.engine, cases: protocol.cases };
  const p = { ...protocol, sha256: bindings.protocolSha256 };
  checkAcceptedReference(accepted, p, bindings.sourceFreezeSha256, bindings.engine);
  for (const mutate of [value => { value.passed = false; }, value => { value.primaryFrequencyDraws = 1; },
    value => { value.sourceFreezeSha256 = "wrong"; }, value => { value.engine.executableSha256 = "wrong"; },
    value => value.cases.reverse()]) {
    const changed = structuredClone(accepted); mutate(changed);
    assert.throws(() => checkAcceptedReference(changed, p, bindings.sourceFreezeSha256, bindings.engine));
  }
});

function toyLaw(input) {
  return { sample: (_count, rng) => {
    const uniform = rng();
    return { marks: input.afterPrimary, selectedComponentIndex: 0,
      componentDraws: [{ candidateIndex: 0, remainingFromIndex: 1, logCandidateMass: Math.log(0.5), logRemainingMass: Math.log(0.5),
        drawOrdinal: 0, uniform, takeCandidate: uniform < 0.5 }], backward: [] };
  } };
}

test("synthetic capture preserves every row/full transcript, exact counts/hashes and first witnesses", async () => {
  const { bytes } = makeTape(protocol, bindings, fill);
  let calls = 0;
  const create = input => { const law = toyLaw(input); return { sample: (...args) => { calls++; return law.sample(...args); } }; };
  const result = {}, lines = [];
  for await (const line of captureRecords(create, protocol, bytes, bindings, result)) lines.push(line);
  assert.equal(calls, 12); assert.equal(lines.length, 14);
  assert.equal(result.primaryFrequencyDraws, 12);
  assert.deepEqual(result.blocks.map(value => [value.consumedCells, value.unusedCells]), Array(4).fill([3, 42]));
  const records = lines.map(JSON.parse);
  for (let i = 0; i < 12; i++) {
    assert.equal(records[i + 1].sequence, i); assert.equal(records[i + 1].tapeByteOffset, i * 60);
    assert.equal(records[i + 1].sample.componentDraws[0].uniform, i * 15 / 2 ** 32);
  }
  result.blocks.forEach((block, i) => assert.equal(block.transcriptSha256,
    createHash("sha256").update(lines.slice(1 + i * 3, 4 + i * 3).join("")).digest("hex")));
  assert.deepEqual(result.cases.map(value => value.witnesses.map(witness => witness.sequence)), [[0, 0, 0], [6, 6, 6]]);
  assert.equal(result.cases[0].counts["2"], 0);
  assert.deepEqual(records.at(-1), { kind: "footer", primaryFrequencyDraws: 12, blocks: 4, supplementarySamplerCalls: 0 });
});

test("mask and witness helpers retain zero bins and reject changed primary/K or invalid marks", () => {
  assert.deepEqual(allMasks({ n: 3, primary: 1 }), ["0", "1", "4", "5"]);
  assert.equal(sampleMask({ marks: ["secondary", "primary", "unmarked"] }, { n: 3, primary: 1, K: 1 }), "1");
  for (const marks of [["primary", "primary", "unmarked"], ["unmarked", "primary", "unmarked"], ["secondary", "primary", "other"]]) {
    assert.throws(() => sampleMask({ marks }, { n: 3, primary: 1, K: 1 }));
  }
  assert.deepEqual(witnessKeys({ selectedComponentIndex: 2, componentDraws: [], backward: [] }, "4"), ["component:2", "pattern:4"]);
});
